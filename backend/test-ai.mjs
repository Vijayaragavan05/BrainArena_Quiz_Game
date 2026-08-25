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
  const cfg = await api('GET', '/api/ai/config');
  console.log(`1. config: ${JSON.stringify(cfg)}`);
  if (!cfg.enabled) throw new Error('AI not enabled (expected mock)');

  const teacher = await api('POST', '/api/auth/register', {
    name: 'AI Teacher', email: `ai_${suffix}@test.com`, password: 'password123', role: 'teacher',
  });
  const token = teacher.token;

  const gen = await api('POST', '/api/ai/questions', { topic: 'Photosynthesis', count: 5, difficulty: 'hard' }, token);
  console.log(`2. generated ${gen.generated} questions`);
  console.log(`   first: ${JSON.stringify(gen.questions[0])}`);

  const noAuth = await fetch(BASE + '/api/ai/questions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ topic: 'x', count: 1, difficulty: 'easy' }) });
  console.log(`3. unauth status: ${noAuth.status}`);

  const bad = await api('POST', '/api/ai/questions', { count: 3, difficulty: 'easy' }, token).catch((e) => e.message);
  console.log(`4. missing topic → error message: ${JSON.stringify(bad)}`);

  const material = await api('POST', '/api/ai/material', {
    material: 'Photosynthesis is the process by which plants use sunlight, water and carbon dioxide to create glucose and oxygen.',
    count: 4,
    difficulty: 'easy',
    topic: 'Biology',
  }, token);
  console.log(`5. material-based: generated ${material.generated} from text`);

  const src = gen.questions[0];
  const re = await api('POST', '/api/ai/regenerate', {
    question: src,
    count: 3,
  }, token);
  console.log(`6. regenerated ${re.generated} alternatives`);
  console.log(`   first: ${JSON.stringify(re.questions[0])}`);
  if (re.generated !== 3) throw new Error('expected 3 regenerated variants');
  const reFirst = re.questions[0];
  if (reFirst.options[reFirst.correctIndex] !== src.options[src.correctIndex]) {
    throw new Error('regenerated question lost the correct answer');
  }

  const badRegen = await api('POST', '/api/ai/regenerate', { count: 2 }, token).catch((e) => e.message);
  console.log(`7. missing question → error message: ${JSON.stringify(badRegen)}`);

  console.log('\nALL AI TESTS PASSED');
}

main().catch((e) => {
  console.error('\nTEST FAILED:', e.message);
  process.exit(1);
});