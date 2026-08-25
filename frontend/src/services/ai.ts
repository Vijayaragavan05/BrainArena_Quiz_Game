import { api } from './api';
import type { ImportedQuestion, Difficulty } from '../types';

export interface AIConfig {
  provider: 'gemini' | 'openai' | 'mock' | 'none';
  enabled: boolean;
  model: string;
}

export async function getAIConfig(): Promise<AIConfig> {
  const res = await api.get<AIConfig>('/ai/config');
  return res.data;
}

export async function generateFromTopic(input: {
  topic: string;
  count: number;
  difficulty: Difficulty;
}): Promise<ImportedQuestion[]> {
  const res = await api.post<{ questions: ImportedQuestion[] }>('/ai/questions', input);
  return res.data.questions;
}

export async function generateFromMaterial(input: {
  material: string;
  count: number;
  difficulty: Difficulty;
  topic?: string;
}): Promise<ImportedQuestion[]> {
  const res = await api.post<{ questions: ImportedQuestion[] }>('/ai/material', input);
  return res.data.questions;
}

export async function extractMaterialText(file: File): Promise<{ text: string; chars: number }> {
  const form = new FormData();
  form.append('file', file);
  const res = await api.post<{ text: string; chars: number }>('/ai/material/extract', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
}

export async function regenerateQuestion(input: {
  question: ImportedQuestion;
  count: number;
}): Promise<ImportedQuestion[]> {
  const res = await api.post<{ questions: ImportedQuestion[] }>('/ai/regenerate', input);
  return res.data.questions;
}