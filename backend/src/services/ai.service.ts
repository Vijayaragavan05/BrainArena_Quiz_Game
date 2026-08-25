import type { Difficulty } from '../utils/constants.js';

export interface AIGeneratedQuestion {
  text: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  topic: string;
  difficulty: Difficulty;
}

export interface RegenerateParams {
  question: AIGeneratedQuestion;
  count: number;
  context?: string;
}

export interface GenerateParams {
  topic: string;
  count: number;
  difficulty: Difficulty;
  context?: string;
}

export type AIProviderName = 'gemini' | 'openai' | 'mock' | 'none';

const MAX_COUNT = 20;

function env(name: string): string {
  return process.env[name] ?? '';
}

export function getAIProvider(): AIProviderName {
  const configured = env('AI_PROVIDER') as AIProviderName;
  if (configured === 'gemini' || configured === 'openai' || configured === 'mock') return configured;
  return 'none';
}

export function getAIConfig() {
  const provider = getAIProvider();
  return {
    provider,
    enabled: provider !== 'none',
    model:
      provider === 'gemini'
        ? 'gemini-1.5-flash'
        : provider === 'openai'
          ? 'gpt-4o-mini'
          : provider === 'mock'
            ? 'mock-generator'
            : '',
  };
}

function buildSystemPrompt(params: GenerateParams): string {
  const { topic, count, difficulty, context } = params;
  const n = Math.min(Math.max(1, Math.floor(count)), MAX_COUNT);
  const contextPart = context
    ? `\nGenerate questions ONLY based on the following learning material:\n"""\n${context.slice(0, 12000)}\n"""`
    : `\nGenerate questions about the topic "${topic}".`;
  return `You are a quiz question writer for an education platform.${contextPart}
Requirements:
- Produce exactly ${n} multiple-choice questions, each with 4 options.
- Difficulty: ${difficulty} (easy/medium/hard).
- Exactly one correct answer per question, clearly identifiable.
- Include a short one-sentence explanation for each question.
- Topic: ${topic}.
Respond ONLY with a JSON array (no markdown, no code fences) where each element is:
{"text":"question text","options":["A","B","C","D"],"correctIndex":0,"explanation":"short why","topic":"${topic}","difficulty":"${difficulty}"}
Correct answer options must be factually accurate.`;
}

function extractJsonArray(raw: string): unknown[] {
  const trimmed = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '');
  const start = trimmed.indexOf('[');
  const end = trimmed.lastIndexOf(']');
  if (start === -1 || end === -1 || end <= start) {
    throw new Error('AI response did not contain a JSON array');
  }
  const json = trimmed.slice(start, end + 1);
  const parsed = JSON.parse(json);
  if (!Array.isArray(parsed)) throw new Error('AI response is not an array');
  return parsed;
}

function validateQuestion(q: Record<string, unknown>): AIGeneratedQuestion | null {
  const text = typeof q.text === 'string' ? q.text.trim() : '';
  const options = Array.isArray(q.options) ? q.options.map((o) => String(o).trim()).filter(Boolean) : [];
  const correctIndex = typeof q.correctIndex === 'number' ? q.correctIndex : Number(q.correctIndex);
  if (!text || options.length < 2) return null;
  if (!Number.isInteger(correctIndex) || correctIndex < 0 || correctIndex >= options.length) return null;
  const difficultyRaw = typeof q.difficulty === 'string' ? q.difficulty.toLowerCase() : '';
  const difficulty: Difficulty = ['easy', 'medium', 'hard'].includes(difficultyRaw)
    ? (difficultyRaw as Difficulty)
    : 'medium';
  return {
    text,
    options: options.slice(0, 6),
    correctIndex,
    explanation: typeof q.explanation === 'string' ? q.explanation : '',
    topic: typeof q.topic === 'string' && q.topic.trim() ? q.topic.trim() : 'General',
    difficulty,
  };
}

async function callGemini(params: GenerateParams): Promise<AIGeneratedQuestion[]> {
  const apiKey = env('GEMINI_API_KEY');
  if (!apiKey) throw new Error('GEMINI_API_KEY is not set');
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: buildSystemPrompt(params) }] }],
      generationConfig: { temperature: 0.8, maxOutputTokens: 4096 },
    }),
  });
  if (!res.ok) throw new Error(`Gemini API error ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const data = (await res.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? '';
  if (!text) throw new Error('Gemini returned an empty response');
  return extractJsonArray(text)
    .map((item) => validateQuestion(item as Record<string, unknown>))
    .filter((q): q is AIGeneratedQuestion => q !== null);
}

async function callOpenAI(params: GenerateParams): Promise<AIGeneratedQuestion[]> {
  const apiKey = env('OPENAI_API_KEY');
  if (!apiKey) throw new Error('OPENAI_API_KEY is not set');
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      temperature: 0.8,
      max_tokens: 4096,
      messages: [
        { role: 'system', content: 'You are a precise JSON generator. Output only valid JSON.' },
        { role: 'user', content: buildSystemPrompt(params) },
      ],
    }),
  });
  if (!res.ok) throw new Error(`OpenAI API error ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const text = data.choices?.[0]?.message?.content ?? '';
  if (!text) throw new Error('OpenAI returned an empty response');
  return extractJsonArray(text)
    .map((item) => validateQuestion(item as Record<string, unknown>))
    .filter((q): q is AIGeneratedQuestion => q !== null);
}

const MOCK_BANK: Array<Omit<AIGeneratedQuestion, 'topic' | 'difficulty'>> = [
  { text: 'Which of the following best defines the main concept?', options: ['Definition A', 'Definition B', 'Definition C', 'Definition D'], correctIndex: 0, explanation: 'The core concept is best captured by Definition A.' },
  { text: 'What is a common real-world application of this topic?', options: ['Application 1', 'Application 2', 'Application 3', 'Application 4'], correctIndex: 1, explanation: 'Application 2 is a well-known use case.' },
  { text: 'Which statement about the topic is TRUE?', options: ['True statement A', 'False statement B', 'False statement C', 'False statement D'], correctIndex: 0, explanation: 'Statement A is the factually correct one.' },
  { text: 'Identify the example that best illustrates the concept.', options: ['Example A', 'Example B', 'Example C', 'Example D'], correctIndex: 2, explanation: 'Example C is the clearest illustration.' },
  { text: 'What distinguishes this topic from related concepts?', options: ['Distinction A', 'Distinction B', 'Distinction C', 'Distinction D'], correctIndex: 3, explanation: 'Distinction D is the key differentiator.' },
];

function callMock(params: GenerateParams): AIGeneratedQuestion[] {
  const n = Math.min(Math.max(1, Math.floor(params.count)), MAX_COUNT);
  return Array.from({ length: n }, (_, i) => {
    const base = MOCK_BANK[i % MOCK_BANK.length];
    return {
      ...base,
      text: `${base.text} (${params.topic} #${i + 1})`,
      topic: params.topic,
      difficulty: params.difficulty,
    };
  });
}

export async function generateQuestions(params: GenerateParams): Promise<AIGeneratedQuestion[]> {
  const provider = getAIProvider();
  let questions: AIGeneratedQuestion[];
  switch (provider) {
    case 'gemini':
      questions = await callGemini(params);
      break;
    case 'openai':
      questions = await callOpenAI(params);
      break;
    case 'mock':
      questions = callMock(params);
      break;
    default:
      throw new Error(
        'AI is not configured. Set AI_PROVIDER=gemini or AI_PROVIDER=openai (plus API key) in backend/.env, or AI_PROVIDER=mock for demo mode.',
      );
  }

  const wanted = Math.min(Math.max(1, Math.floor(params.count)), MAX_COUNT);
  return questions.slice(0, wanted);
}

function shuffle<T>(arr: T[], seed: number): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = (i * seed + 7) % (i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function mockVariants(q: AIGeneratedQuestion, n: number): AIGeneratedQuestion[] {
  const REWRITES = [
    'Which of the following best describes this?',
    'Select the option that is TRUE about this topic.',
    'Which statement is correct?',
    'Identify the accurate choice.',
    'Choose the best answer.',
  ];
  const variants: AIGeneratedQuestion[] = [];
  for (let i = 0; i < n; i++) {
    const options = shuffle(q.options, i + 1);
    const correctIndex = options.indexOf(q.options[q.correctIndex]);
    const seed = i + 1;
    variants.push({
      text: `${REWRITES[i % REWRITES.length]} (${q.topic} — variant ${seed})`,
      options,
      correctIndex,
      explanation: `Variant ${seed}: ${q.explanation}`,
      topic: q.topic,
      difficulty: q.difficulty,
    });
  }
  return variants;
}

export async function regenerateQuestion(params: RegenerateParams): Promise<AIGeneratedQuestion[]> {
  const provider = getAIProvider();
  const n = Math.min(Math.max(1, Math.floor(params.count)), MAX_COUNT);

  if (provider === 'mock') {
    return mockVariants(params.question, n);
  }

  if (provider === 'gemini' || provider === 'openai') {
    const genParams: GenerateParams = {
      topic: params.question.topic,
      count: n,
      difficulty: params.question.difficulty,
      context: params.context,
    };
    const base = buildSystemPrompt(genParams);
    const instruction = `
Instead of the topic prompt above, generate ${n} ALTERNATIVE versions of this existing question.
The new versions must ask the SAME concept but be reworded, with reordered/replaced answer options, and exactly one correct answer each.
Original question: "${params.question.text}"
Original options: ${JSON.stringify(params.question.options)} (correct index ${params.question.correctIndex})
Original explanation: "${params.question.explanation}"
Use the same topic "${params.question.topic}" and difficulty "${params.question.difficulty}".
Respond ONLY with a JSON array (no markdown, no code fences):
[{"text":"...","options":["A","B","C","D"],"correctIndex":0,"explanation":"...","topic":"...","difficulty":"..."}]`;
    const raw = provider === 'gemini' ? await callGeminiRaw(instruction) : await callOpenAIRaw(instruction);
    const parsed = extractJsonArray(raw)
      .map((item) => validateQuestion(item as Record<string, unknown>))
      .filter((q): q is AIGeneratedQuestion => q !== null);
    if (parsed.length > 0) return parsed.slice(0, n);
  }

  throw new Error(
    'AI is not configured. Set AI_PROVIDER=gemini or AI_PROVIDER=openai (plus API key) in backend/.env, or AI_PROVIDER=mock for demo mode.',
  );
}

async function callGeminiRaw(prompt: string): Promise<string> {
  const apiKey = env('GEMINI_API_KEY');
  if (!apiKey) throw new Error('GEMINI_API_KEY is not set');
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.9, maxOutputTokens: 4096 },
    }),
  });
  if (!res.ok) throw new Error(`Gemini API error ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const data = (await res.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  return data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? '';
}

async function callOpenAIRaw(prompt: string): Promise<string> {
  const apiKey = env('OPENAI_API_KEY');
  if (!apiKey) throw new Error('OPENAI_API_KEY is not set');
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      temperature: 0.9,
      max_tokens: 4096,
      messages: [
        { role: 'system', content: 'You are a precise JSON generator. Output only valid JSON.' },
        { role: 'user', content: prompt },
      ],
    }),
  });
  if (!res.ok) throw new Error(`OpenAI API error ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  return data.choices?.[0]?.message?.content ?? '';
}