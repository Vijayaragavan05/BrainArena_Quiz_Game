import { io } from 'socket.io-client';

const BASE = 'http://localhost:5000';
const suffix = Date.now().toString().slice(-6);

function api(method, path, body, token) {
  return fetch(BASE + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  }).then(async (r) => {
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(`${method} ${path}: ${JSON.stringify(data)}`);
    return data;
  });
}

function connect() {
  return new Promise((resolve) => {
    const s = io(BASE, { transports: ['websocket'], reconnection: false });
    s.on('connect', () => resolve(s));
    s.on('connect_error', (e) => { console.error('socket error', e.message); process.exit(1); });
  });
}
const waitEvent = (s, n, t = 15000) => new Promise((res, rej) => {
  const timer = setTimeout(() => rej(new Error(`timeout ${n}`)), t);
  s.once(n, (p) => { clearTimeout(timer); res(p); });
});
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const teacher = await api('POST', '/api/auth/register', { name: 'Exp Teacher', email: `exp_${suffix}@test.com`, password: 'password123', role: 'teacher' });
  const quiz = await api('POST', '/api/quizzes', { title: 'Export Quiz', topic: 'Science', description: '', difficulty: 'medium', duration: 20 }, teacher.token);
  const quizId = quiz.quiz._id;
  await api('POST', `/api/quizzes/${quizId}/questions`, { text: 'Water is H2O?', options: ['Yes', 'No'], correctIndex: 0, topic: 'Science', difficulty: 'easy', explanation: 'Water is H2O.' }, teacher.token);

  // Run a tiny live quiz to produce a result
  const host = await connect();
  host.emit('host:start', { token: teacher.token, quizId });
  const started = await waitEvent(host, 'host:started');
  const pin = started.pin;

  const student = await api('POST', '/api/auth/register', { name: 'Exp Student', email: `exp_s_${suffix}@test.com`, password: 'password123', role: 'student' });
  const sock = await connect();
  sock.emit('student:join', { token: student.token, pin });
  await waitEvent(sock, 'student:joined');
  await waitEvent(host, 'lobby:update');

  host.emit('host:start-question', { index: 0 });
  await waitEvent(sock, 'question:start');
  const ack = waitEvent(sock, 'answer:ack');
  sock.emit('student:answer', { questionIndex: 0, selectedIndex: 0, initialIndex: 0, answerChanges: 0 });
  const a = await ack;
  await sleep(1000);
  host.emit('host:end');
  await waitEvent(host, 'quiz:complete');

  const my = await api('GET', '/api/results/student/me', null, student.token);
  const resultId = my.results[0]._id;
  console.log(`1. produced result ${resultId}`);

  // --- teacher exports ---
  const qcsv = await fetch(`${BASE}/api/export/quiz/${quizId}/questions/csv`, { headers: { Authorization: `Bearer ${teacher.token}` } });
  const qcsvText = await qcsv.text();
  console.log(`2. quiz questions CSV: status=${qcsv.status} type=${qcsv.headers.get('content-type')} firstLine="${qcsvText.split('\n')[0].slice(0, 60)}"`);

  const rcsv = await fetch(`${BASE}/api/export/quiz/${quizId}/results/csv`, { headers: { Authorization: `Bearer ${teacher.token}` } });
  const rcsvText = await rcsv.text();
  console.log(`3. results CSV: status=${rcsv.status} hasHeader="${rcsvText.includes('Rank')}" len=${rcsvText.length}`);

  const rxlsx = await fetch(`${BASE}/api/export/quiz/${quizId}/results/xlsx`, { headers: { Authorization: `Bearer ${teacher.token}` } });
  const xbuf = Buffer.from(await rxlsx.arrayBuffer());
  const xlsxMagic = xbuf.slice(0, 4).toString('hex');
  console.log(`4. results XLSX: status=${rxlsx.status} magic=${xlsxMagic} bytes=${xbuf.length}`);

  // student PDF
  const pdf = await fetch(`${BASE}/api/export/student/${resultId}/pdf`, { headers: { Authorization: `Bearer ${student.token}` } });
  const pbuf = Buffer.from(await pdf.arrayBuffer());
  const pdfMagic = pbuf.slice(0, 4).toString();
  console.log(`5. student PDF: status=${pdf.status} magic="${pdfMagic}" bytes=${pbuf.length}`);

  // auth guard
  const unauth = await fetch(`${BASE}/api/export/quiz/${quizId}/results/xlsx`);
  console.log(`6. unauth export status: ${unauth.status}`);

  host.disconnect(); sock.disconnect();
  console.log('\nALL EXPORT TESTS PASSED');
}

main().catch((e) => { console.error('\nTEST FAILED:', e.message); process.exit(1); });