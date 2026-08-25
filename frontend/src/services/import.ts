import { api } from './api';
import type { ImportedQuestion } from '../types';

export interface ImportReport {
  filename: string;
  totalRows: number;
  valid: ImportedQuestion[];
  errors: Array<{ row: number; message: string }>;
}

export async function validateImportFile(file: File): Promise<ImportReport> {
  const form = new FormData();
  form.append('file', file);
  const res = await api.post<{ report: ImportReport }>('/import/validate', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data.report;
}

export async function applyImport(questions: ImportedQuestion[], targetQuizId?: string): Promise<{ imported: number }> {
  const res = await api.post<{ imported: number }>('/import/apply', { questions, targetQuizId });
  return res.data;
}

export function buildSampleCsv(): Blob {
  const header = 'Question,Option A,Option B,Option C,Option D,Correct,Explanation,Topic,Difficulty';
  const rows = [
    ['What is the capital of France?', 'Rome', 'Paris', 'Madrid', 'Berlin', 'B', 'Paris is the capital of France.', 'Geography', 'easy'],
    ['Which of these is a planet?', 'Sun', 'Moon', 'Mars', 'Asteroid', 'C', 'Mars is a planet.', 'Science', 'hard'],
    ['2 + 2 = ?', '3', '4', '5', '6', 'B', 'Basic arithmetic.', 'Math', 'easy'],
    ['Who wrote Romeo and Juliet?', 'Dickens', 'Shakespeare', 'Hemingway', 'Twain', 'B', 'Shakespeare wrote it.', 'Literature', 'medium'],
  ];
  const csv = [header, ...rows.map((r) => r.map((c) => `"${c}"`).join(','))].join('\n');
  return new Blob([csv], { type: 'text/csv' });
}