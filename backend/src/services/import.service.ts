import { parse } from 'csv-parse/sync';
import ExcelJS from 'exceljs';
import type { Difficulty } from '../utils/constants.js';

export interface ImportedQuestion {
  text: string;
  options: string[];
  correctIndex: number;
  explanation?: string;
  topic?: string;
  difficulty: Difficulty;
  imageUrl?: string;
}

export interface ImportRowError {
  row: number;
  message: string;
}

export interface ImportReport {
  filename: string;
  totalRows: number;
  valid: ImportedQuestion[];
  errors: ImportRowError[];
}

const COLUMN_ALIASES: Record<string, string[]> = {
  text: ['text', 'question', 'question text', 'q', 'prompt'],
  optionA: ['optiona', 'option a', 'option_1', 'option1', 'choice a', 'correct'],
  optionB: ['optionb', 'option b', 'option_2', 'option2', 'choice b', 'wrong1', 'wrong a'],
  optionC: ['optionc', 'option c', 'option_3', 'option3', 'choice c', 'wrong2', 'wrong b'],
  optionD: ['optiond', 'option d', 'option_4', 'option4', 'choice d', 'wrong3', 'wrong c'],
  optionE: ['optione', 'option e', 'option_5', 'option5', 'choice e'],
  optionF: ['optionf', 'option f', 'option_6', 'option6', 'choice f'],
  correctIndex: ['correctindex', 'correct index', 'correct', 'correct answer', 'answer', 'answer index'],
  explanation: ['explanation', 'why', 'reason', 'feedback'],
  topic: ['topic', 'category', 'tag', 'subject'],
  difficulty: ['difficulty', 'level', 'difficulty level'],
  imageUrl: ['image', 'image url', 'imageurl', 'media', 'picture', 'photo'],
};

const DIFFICULTY_ALIASES: Record<string, Difficulty> = {
  easy: 'easy',
  e: 'easy',
  '1': 'easy',
  medium: 'medium',
  m: 'medium',
  '2': 'medium',
  normal: 'medium',
  hard: 'hard',
  h: 'hard',
  '3': 'hard',
  difficult: 'hard',
};

function normalizeKey(key: string): string {
  return key
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, ' ');
}

function resolveColumn(headers: string[], canonical: string): string | null {
  const normHeaders = new Map(headers.map((h) => [normalizeKey(h), h]));
  for (const alias of COLUMN_ALIASES[canonical] ?? []) {
    const found = normHeaders.get(normalizeKey(alias));
    if (found !== undefined) return found;
  }
  return null;
}

async function readWorkbookRows(buffer: Buffer): Promise<Record<string, unknown>[]> {
  const wb = new ExcelJS.Workbook();
  const loadInput = buffer as unknown as Parameters<typeof wb.xlsx.load>[0];
  await wb.xlsx.load(loadInput);
  const ws = wb.worksheets[0];
  if (!ws) return [];
  const rows: Record<string, unknown>[] = [];
  const headerRow = ws.getRow(1);
  const headers: string[] = [];
  headerRow.eachCell({ includeEmpty: false }, (cell, colNumber) => {
    headers[colNumber - 1] = String(cell.value ?? '').trim();
  });
  ws.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const record: Record<string, unknown> = {};
    headers.forEach((h, i) => {
      if (h) record[h] = row.getCell(i + 1).text?.trim() ?? '';
    });
    if (Object.values(record).some((v) => String(v ?? '').trim() !== '')) rows.push(record);
  });
  return rows;
}

export async function parseImportFile(
  buffer: Buffer,
  filename: string,
): Promise<{ headers: string[]; rows: Record<string, unknown>[] }> {
  const lower = filename.toLowerCase();
  if (lower.endsWith('.csv') || lower.endsWith('.txt')) {
    const content = buffer.toString('utf-8');
    const records = parse(content, { columns: true, skip_empty_lines: true, trim: true, relax_column_count: true }) as Record<string, string>[];
    const headers = records.length > 0 ? Object.keys(records[0]) : [];
    return { headers, rows: records };
  }
  if (lower.endsWith('.xlsx') || lower.endsWith('.xls')) {
    const rows = await readWorkbookRows(buffer);
    const headers = rows.length > 0 ? Object.keys(rows[0]) : [];
    return { headers, rows };
  }
  throw new Error('Unsupported file type. Use .csv, .txt, .xlsx or .xls');
}

export function validateImportedQuestion(
  raw: Record<string, unknown>,
  rowNumber: number,
): { ok: true; question: ImportedQuestion } | { ok: false; message: string } {
  const headers = Object.keys(raw);

  const textCol = resolveColumn(headers, 'text');
  const optHeaders: string[] = [];
  for (const c of ['optionA', 'optionB', 'optionC', 'optionD', 'optionE', 'optionF'] as const) {
    const h = resolveColumn(headers, c);
    if (h) optHeaders.push(h);
  }

  if (!textCol) return { ok: false, message: 'Missing "Question" column' };
  const text = String(raw[textCol] ?? '').trim();
  if (!text) return { ok: false, message: 'Question text is empty' };
  if (text.length < 2) return { ok: false, message: 'Question text is too short' };

  const options: string[] = [];
  for (const header of optHeaders) {
    const val = String(raw[header] ?? '').trim();
    if (val) options.push(val);
  }
  if (options.length < 2) return { ok: false, message: 'At least 2 non-empty answer options required' };
  if (options.length > 6) return { ok: false, message: 'Maximum 6 answer options allowed' };

  const correctCol = resolveColumn(headers, 'correctIndex');
  if (!correctCol) return { ok: false, message: 'Missing "Correct" column' };
  const correctRaw = String(raw[correctCol] ?? '').trim();
  let correctIndex = -1;
  if (/^[A-Fa-f]$/.test(correctRaw)) {
    correctIndex = correctRaw.toUpperCase().charCodeAt(0) - 65;
  } else {
    const num = Number(correctRaw);
    if (Number.isInteger(num) && num >= 0 && num <= options.length - 1) correctIndex = num;
  }
  if (correctIndex < 0 || correctIndex >= options.length) {
    return { ok: false, message: `Correct answer "${correctRaw}" does not match an option` };
  }

  let difficulty: Difficulty = 'medium';
  const diffCol = resolveColumn(headers, 'difficulty');
  if (diffCol) {
    const rawDiff = String(raw[diffCol] ?? '').trim().toLowerCase();
    if (rawDiff) {
      const mapped = DIFFICULTY_ALIASES[rawDiff];
      if (!mapped) return { ok: false, message: `Unknown difficulty "${rawDiff}" (use easy/medium/hard)` };
      difficulty = mapped;
    }
  }

  const explCol = resolveColumn(headers, 'explanation');
  const topicCol = resolveColumn(headers, 'topic');
  const imageCol = resolveColumn(headers, 'imageUrl');

  return {
    ok: true,
    question: {
      text,
      options,
      correctIndex,
      difficulty,
      explanation: explCol ? String(raw[explCol] ?? '').trim() : '',
      topic: topicCol ? String(raw[topicCol] ?? '').trim() : 'General',
      imageUrl: imageCol ? String(raw[imageCol] ?? '').trim() : '',
    },
  };
}

export async function buildImportReport(
  buffer: Buffer,
  filename: string,
): Promise<ImportReport> {
  const { headers, rows } = await parseImportFile(buffer, filename);

  if (rows.length === 0) {
    return { filename, totalRows: 0, valid: [], errors: [{ row: 1, message: 'No data rows found' }] };
  }

  const valid: ImportedQuestion[] = [];
  const errors: ImportRowError[] = [];
  const seenTexts = new Set<string>();

  rows.forEach((row, i) => {
    const result = validateImportedQuestion(row, i + 2);
    if (!result.ok) {
      errors.push({ row: i + 2, message: result.message });
      return;
    }
    if (seenTexts.has(result.question.text.toLowerCase())) {
      errors.push({ row: i + 2, message: 'Duplicate question text' });
      return;
    }
    seenTexts.add(result.question.text.toLowerCase());
    valid.push(result.question);
  });

  return { filename, totalRows: rows.length, valid, errors };
}