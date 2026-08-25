import { api } from './api';
import type { Difficulty, Question } from '../types';

export interface BankQuestion extends Question {
  usedInQuizzes: number;
}

export interface BankListResponse {
  questions: BankQuestion[];
  stats: { total: number };
}

export async function listBank(params?: { topic?: string; difficulty?: string; q?: string }): Promise<BankListResponse> {
  const query = new URLSearchParams();
  if (params?.topic) query.set('topic', params.topic);
  if (params?.difficulty) query.set('difficulty', params.difficulty);
  if (params?.q) query.set('q', params.q);
  const res = await api.get<BankListResponse>(`/bank?${query.toString()}`);
  return res.data;
}

export async function listBankTopics(): Promise<string[]> {
  const res = await api.get<{ topics: string[] }>('/bank/topics');
  return res.data.topics;
}

export async function addQuestionToBank(input: {
  text: string;
  options: string[];
  correctIndex: number;
  explanation?: string;
  topic?: string;
  difficulty: Difficulty;
}): Promise<{ question: Question }> {
  const res = await api.post<{ question: Question }>('/bank/questions', input);
  return res.data;
}

export async function removeQuestionFromBank(id: string): Promise<void> {
  await api.delete(`/bank/questions/${id}`);
}

export async function addBankQuestionsToQuiz(quizId: string, questionIds: string[]): Promise<{ added: number }> {
  const res = await api.post<{ added: number }>(`/bank/add-to-quiz/${quizId}`, { questionIds });
  return res.data;
}