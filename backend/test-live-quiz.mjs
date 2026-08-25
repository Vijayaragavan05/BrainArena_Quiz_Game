import { io } from 'socket.io-client';

const BASE = 'http://localhost:5000';
const suffix = Date.now().toString().slice(-6);

function api(method, path, body, token) {
  return fetch(BASE + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
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
    s.on('connect_error', (e) => {
      console.error('socket connect error:', e.message);
      process.exit(1);
    });
  });
}

function waitEvent(socket, name, timeoutMs = 15000) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`timeout waiting for ${name}`)), timeoutMs);
    socket.once(name, (payload) => {
      clearTimeout(t);
      resolve(payload);
    });
  });
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function register(name, role, idx) {
  const email = `${role}${idx}_${suffix}@test.com`;
  const res = await api('POST', '/api/auth/register', { name, email, password: 'password123', role });
  return { ...res, email };
}

async function main() {
  const teacher = await register('Live Teacher', 'teacher', 1);
  console.log('1. teacher registered');

  const quiz = await api(
    'POST',
    '/api/quizzes',
    { title: 'Live Test Quiz', topic: 'General', description: '', difficulty: 'easy', duration: 30 },
    teacher.token,
  );
  const quizId = quiz.quiz._id;
  await api('POST', `/api/quizzes/${quizId}/questions`, {
    text: 'What is 2 + 2?', options: ['4', '5', '22', 'None'], correctIndex: 0, topic: 'Math', difficulty: 'easy', explanation: '2+2=4',
  }, teacher.token);
  await api('POST', `/api/quizzes/${quizId}/questions`, {
    text: 'Capital of France?', options: ['Rome', 'Paris', 'Madrid', 'Berlin'], correctIndex: 1, topic: 'Geo', difficulty: 'hard', explanation: 'Paris',
  }, teacher.token);
  console.log('2. quiz created with 2 questions');

  const host = await connect();
  host.on('error', (e) => console.error('[host]', e));
  host.emit('host:start', { token: teacher.token, quizId });
  const started = await waitEvent(host, 'host:started');
  const pin = started.pin;
  console.log(`3. host started, pin=${pin} totalQuestions=${started.totalQuestions}`);

  const students = [];
  for (let i = 1; i <= 3; i++) {
    const s = await register(`Student ${i}`, 'student', i);
    const sock = await connect();
    sock.on('error', (e) => console.error(`[s${i}]`, e.message));
    sock.emit('student:join', { token: s.token, pin });
    const joined = await waitEvent(sock, 'student:joined');
    students.push({ idx: i, sock, ...s, ...joined });
  }
  console.log('4. 3 students joined');
  const lobby = await waitEvent(host, 'lobby:update');
  console.log(`   lobby participants: ${lobby.participants.length}`);

  host.emit('host:start-question', { index: 0 });
  const qStartPromises = students.map((s) => waitEvent(s.sock, 'question:start'));
  await Promise.all(qStartPromises);
  console.log('5. question 0 broadcast to all students');

  const ack1Promise = waitEvent(students[0].sock, 'answer:ack');
  students[0].sock.emit('student:answer', { questionIndex: 0, selectedIndex: 0, initialIndex: 0, answerChanges: 0 });
  await sleep(1500);
  const ack2Promise = waitEvent(students[1].sock, 'answer:ack');
  students[1].sock.emit('student:answer', { questionIndex: 0, selectedIndex: 2, initialIndex: 0, answerChanges: 1 });
  const ack1 = await ack1Promise;
  const ack2 = await ack2Promise;
  console.log(`6. answers: s1 correct=${ack1.isCorrect} score=${ack1.score}, s2 correct=${ack2.isCorrect} score=${ack2.score}`);

  host.emit('host:next');
  const qEnd = await waitEvent(host, 'question:end');
  const lb1 = await waitEvent(host, 'leaderboard:update');
  console.log(`7. question end: correctIndex=${qEnd.correctIndex} answered=${qEnd.answerCount}/${qEnd.participantCount}`);
  console.log(`   leaderboard: ${lb1.rankings.map((r) => `${r.name}:${r.score}`).join(', ')}`);
  const lbRow = lb1.rankings[0];
  if (!('wrong' in lbRow) || !('accuracy' in lbRow) || !('avgResponseTimeMs' in lbRow)) {
    throw new Error('leaderboard rows missing opponent-comparison fields');
  }
  console.log(`   enriched row: wrong=${lbRow.wrong} accuracy=${lbRow.accuracy} avgResponse=${lbRow.avgResponseTimeMs}`);

  const q2Promises = students.map((s) => waitEvent(s.sock, 'question:start'));
  host.emit('host:start-question', { index: 1 });
  await Promise.all(q2Promises);
  const ackPromises = students.map((s) => waitEvent(s.sock, 'answer:ack'));
  for (const s of students) {
    s.sock.emit('student:answer', { questionIndex: 1, selectedIndex: 1, initialIndex: null, answerChanges: 0 });
  }
  await Promise.all(ackPromises);
  await sleep(1000);
  console.log('8. all 3 students answered question 1 correctly');

  host.emit('host:end');
  const done = await waitEvent(host, 'quiz:complete');
  console.log(`9. quiz complete: results=${done.results.length}`);

  const s1 = students[0];
  const myResults = await api('GET', '/api/results/student/me', null, s1.token);
  const resultId = myResults.results[0]._id;
  console.log(`10. student 1 result: score=${myResults.results[0].score} accuracy=${myResults.results[0].accuracy} rank=${myResults.results[0].rank} whatIf=${myResults.results[0].whatIfScore}`);

  const detail = await api('GET', `/api/results/student/${resultId}`, null, s1.token);
  console.log(`11. report detail: questions=${detail.questions.length} insights=${detail.insights?.recommendations?.length ?? 0} speedVsAccuracy=${detail.performance?.speedVsAccuracy}`);
  console.log(`    insights raw: ${JSON.stringify(detail.insights)}`);
  console.log(`    topicPerf: ${JSON.stringify(detail.performance?.topicPerformance)}`);
  console.log(`    diffPerf: ${JSON.stringify(detail.performance?.difficultyPerformance)}`);

  const overview = await api('GET', `/api/results/quiz/${quizId}/overview`, null, teacher.token);
  console.log(`12. teacher overview: participants=${overview.totals.participants} avgScore=${overview.totals.avgScore} questionStats=${overview.questionStats.length}`);
  console.log(`    difficult questions: ${overview.questionStats.filter((q) => q.isDifficult).map((q) => q.text).join(' | ')}`);

  const ranked = overview.rankings.map((r) => `${r.rank}. ${r.student}:${r.score}`).join(', ');
  console.log(`    rankings: ${ranked}`);

  const results = await api('GET', `/api/results/quiz/${quizId}`, null, teacher.token);
  console.log(`13. teacher results list: ${results.results.length} entries`);

  host.disconnect();
  students.forEach((s) => s.sock.disconnect());
  console.log('\nALL LIVE QUIZ TESTS PASSED');
}

main().catch((e) => {
  console.error('\nTEST FAILED:', e.message);
  process.exit(1);
});