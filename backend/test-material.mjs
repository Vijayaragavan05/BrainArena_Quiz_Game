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

function upload(path, buffer, filename, token) {
  const form = new FormData();
  form.append('file', new Blob([buffer]), filename);
  return fetch(BASE + path, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  }).then(async (r) => {
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(`upload ${path} ${filename}: ${JSON.stringify(data)}`);
    return data;
  });
}

function buildMinimalPdf(text) {
  const content = `BT /F1 20 Tf 72 720 Td (${text}) Tj ET`;
  const stream = `${content}`;
  const objects = [
    '<</Type/Catalog/Pages 2 0 R>>',
    '<</Type/Pages/Kids[3 0 R]/Count 1>>',
    '<</Type/Page/Parent 2 0 R/MediaBox[0 0 612 792]/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>',
    `<</Length ${stream.length}>>stream\n${stream}\nendstream`,
    '<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>',
  ];
  let out = '%PDF-1.4\n';
  const offsets = [];
  objects.forEach((obj, i) => {
    offsets.push(out.length);
    out += `${i + 1} 0 obj\n${obj}\nendobj\n`;
  });
  const xrefStart = out.length;
  out += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const o of offsets) out += `${String(o).padStart(10, '0')} 00000 n \n`;
  out += `trailer\n<</Size ${objects.length + 1}/Root 1 0 R>>\nstartxref\n${xrefStart}\n%%EOF\n`;
  return Buffer.from(out, 'latin1');
}

async function main() {
  const teacher = await api('POST', '/api/auth/register', {
    name: 'Mat Teacher', email: `mat_${suffix}@test.com`, password: 'password123', role: 'teacher',
  });
  const token = teacher.token;

  const pdfText = 'Photosynthesis converts sunlight water and carbon dioxide into glucose and oxygen.';
  const pdf = buildMinimalPdf(pdfText);
  const pdfRes = await upload('/api/ai/material/extract', pdf, 'lesson.pdf', token);
  console.log(`1. PDF extracted ${pdfRes.chars} chars: "${pdfRes.text.slice(0, 70)}..."`);

  const txtRes = await upload('/api/ai/material/extract', Buffer.from('Water is H2O and it freezes at zero degrees Celsius.'), 'notes.txt', token);
  console.log(`2. TXT extracted ${txtRes.chars} chars: "${txtRes.text.slice(0, 60)}..."`);

  const generated = await api('POST', '/api/ai/material', {
    material: pdfRes.text,
    count: 3,
    difficulty: 'medium',
    topic: 'Biology',
  }, token);
  console.log(`3. generated ${generated.generated} questions from extracted PDF text; first: "${generated.questions[0].text.slice(0, 50)}..."`);

  const badType = await upload('/api/ai/material/extract', Buffer.from('x'), 'file.exe', token).catch((e) => e.message);
  console.log(`4. unsupported type → ${JSON.stringify(badType)}`);

  console.log('\nALL MATERIAL TESTS PASSED');
}

main().catch((e) => {
  console.error('\nTEST FAILED:', e.message);
  process.exit(1);
});