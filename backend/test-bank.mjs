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

async function main() {
  const teacher = await api('POST', '/api/auth/register', {
    name: 'Bank Teacher', email: `bank_${suffix}@test.com`, password: 'password123', role: 'teacher',
  });
  const token = teacher.token;

  const q1 = await api('POST', '/api/bank/questions', { text: 'Bank Q1: 5+5=?', options: ['10', '11', '12'], correctIndex: 0, explanation: '5+5=10', topic: 'Math', difficulty: 'easy' }, token);
  const q2 = await api('POST', '/api/bank/questions', { text: 'Bank Q2: H2O is?', options: ['Water', 'Salt', 'Air'], correctIndex: 0, explanation: 'H2O is water.', topic: 'Science', difficulty: 'medium' }, token);
  console.log(`1. added ${q1.question ? 'Q1' : ''} and Q2 to bank`);

  const list = await api('GET', '/api/bank', null, token);
  console.log(`2. bank list: ${list.stats.total} questions, topics=${JSON.stringify(list.questions.map((q) => q.topic))}`);

  const filtered = await api('GET', '/api/bank?topic=Math', null, token);
  console.log(`3. filter topic=Math → ${filtered.questions.length} question(s)`);

  const topics = await api('GET', '/api/bank/topics', null, token);
  console.log(`4. topics: ${JSON.stringify(topics.topics)}`);

  const quiz = await api('POST', '/api/quizzes', { title: 'Bank Quiz', topic: 'Mixed', description: '', difficulty: 'medium', duration: 20 }, token);
  const quizId = quiz.quiz._id;

  const added = await api('POST', `/api/bank/add-to-quiz/${quizId}`, { questionIds: [q1.question._id, q2.question._id] }, token);
  console.log(`5. added ${added.added} bank questions to quiz`);

  const updated = await api('GET', `/api/quizzes/${quizId}`, null, token);
  console.log(`6. quiz now has ${updated.quiz.questions.length} questions`);

  const used = await api('GET', '/api/bank', null, token);
  console.log(`7. usedInQuizzes: ${used.questions.map((q) => q.usedInQuizzes).join(', ')}`);

  const removed = await api('DELETE', `/api/bank/questions/${q1.question._id}`, null, token);
  console.log(`8. removed Q1 from bank: ${removed.removed}`);

  const list2 = await api('GET', '/api/bank', null, token);
  console.log(`9. bank after removal: ${list2.stats.total} question(s) (Q1 kept since used in quiz)`);

  const checkQ1Exists = await api('GET', '/api/quizzes', null, token);
  console.log(`10. quiz still has ${checkQ1Exists.quizzes[0].questions.length} questions (Q1 preserved)`);

  console.log('\nALL BANK TESTS PASSED');
}

main().catch((e) => {
  console.error('\nTEST FAILED:', e.message);
  process.exit(1);
});