import { io } from 'socket.io-client';
import ExcelJS from 'exceljs';

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

function upload(path, buffer, filename, token) {
  const form = new FormData();
  form.append('file', new Blob([buffer]), filename);
  return fetch(BASE + path, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  }).then(async (r) => {
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(`upload ${path}: ${JSON.stringify(data)}`);
    return data;
  });
}

async function main() {
  const teacher = await api('POST', '/api/auth/register', {
    name: 'Import Teacher', email: `import_${suffix}@test.com`, password: 'password123', role: 'teacher',
  });
  const token = teacher.token;

  const csv = [
    'Question,Option A,Option B,Option C,Correct,Explanation,Topic,Difficulty',
    'What is the capital of Japan?,Tokyo,Osaka,Kyoto,A,Tokyo is the capital.,Geography,medium',
    '2 + 2 equals?,5,4,6,B,Basic addition.,Math,easy',
    'Which is a planet?,Sun,Moon,Mars,C,Mars is a planet.,Science,hard',
    'This row is broken because no options',
    '',
  ].join('\n');
  const csvReport = await upload('/api/import/validate', Buffer.from(csv), 'questions.csv', token);
  console.log(`CSV validate: total=${csvReport.summary.total} valid=${csvReport.summary.valid} errors=${csvReport.summary.errors}`);
  console.log(`  errors: ${JSON.stringify(csvReport.report.errors)}`);
  console.log(`  valid first: ${JSON.stringify(csvReport.report.valid[0])}`);

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Questions');
  ws.addRow(['Question', 'Option A', 'Option B', 'Option C', 'Correct', 'Explanation', 'Topic', 'Difficulty']);
  ws.addRow(['What color is the sky?', 'Blue', 'Red', 'Green', 'A', 'Light scattering.', 'Science', 'easy']);
  ws.addRow(['3 * 3 = ?', '6', '9', '12', 'B', '3x3=9.', 'Math', 'easy']);
  ws.addRow(['Invalid difficulty', 'X', 'Y', 'Z', 'A', '', 'Misc', 'impossible']);
  const wbBuf = Buffer.from(await wb.xlsx.writeBuffer());
  const xlsxReport = await upload('/api/import/validate', wbBuf, 'questions.xlsx', token);
  console.log(`XLSX validate: total=${xlsxReport.summary.total} valid=${xlsxReport.summary.valid} errors=${xlsxReport.summary.errors}`);
  console.log(`  errors: ${JSON.stringify(xlsxReport.report.errors)}`);

  const quiz = await api('POST', '/api/quizzes', { title: 'Imported Quiz', topic: 'Mixed', description: '', difficulty: 'medium', duration: 20 }, token);
  const quizId = quiz.quiz._id;

  const applied = await api('POST', '/api/import/apply', { targetQuizId: quizId, questions: csvReport.report.valid }, token);
  console.log(`apply to quiz: imported=${applied.imported} targetQuizId=${applied.targetQuizId}`);

  const updated = await api('GET', `/api/quizzes/${quizId}`, null, token);
  console.log(`quiz now has ${updated.quiz.questions.length} questions`);

  const banked = await api('POST', '/api/import/apply', { questions: xlsxReport.report.valid }, token);
  console.log(`apply to bank: imported=${banked.imported}`);

  console.log('\nALL IMPORT TESTS PASSED');
}

main().catch((e) => {
  console.error('\nTEST FAILED:', e.message);
  process.exit(1);
});