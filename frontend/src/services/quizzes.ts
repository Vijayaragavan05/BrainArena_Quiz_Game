import { api } from './api';
import type { Quiz, QuizInput, Question, QuestionInput, QuizStats } from '../types';

export async function listQuizzes(): Promise<Quiz[]> {
  const res = await api.get<{ quizzes: Quiz[] }>('/quizzes');
  return res.data.quizzes;
}

export async function getQuizStats(): Promise<QuizStats> {
  const res = await api.get<QuizStats>('/quizzes/stats');
  return res.data;
}

export async function getQuiz(id: string): Promise<Quiz> {
  const res = await api.get<{ quiz: Quiz }>(`/quizzes/${id}`);
  return res.data.quiz;
}

export async function createQuiz(input: QuizInput): Promise<Quiz> {
  const res = await api.post<{ quiz: Quiz }>('/quizzes', input);
  return res.data.quiz;
}

export async function updateQuiz(id: string, input: Partial<QuizInput>): Promise<Quiz> {
  const res = await api.put<{ quiz: Quiz }>(`/quizzes/${id}`, input);
  return res.data.quiz;
}

export async function deleteQuiz(id: string): Promise<void> {
  await api.delete(`/quizzes/${id}`);
}

export async function duplicateQuiz(id: string): Promise<Quiz> {
  const res = await api.post<{ quiz: Quiz }>(`/quizzes/${id}/duplicate`);
  return res.data.quiz;
}

export async function toggleArchiveQuiz(id: string): Promise<Quiz> {
  const res = await api.patch<{ quiz: Quiz }>(`/quizzes/${id}/archive`);
  return res.data.quiz;
}

export async function addQuestion(quizId: string, input: QuestionInput): Promise<Question> {
  const res = await api.post<{ question: Question }>(`/quizzes/${quizId}/questions`, input);
  return res.data.question;
}

export async function updateQuestion(
  quizId: string,
  questionId: string,
  input: Partial<QuestionInput>,
): Promise<Question> {
  const res = await api.put<{ question: Question }>(
    `/quizzes/${quizId}/questions/${questionId}`,
    input,
  );
  return res.data.question;
}

export async function removeQuestion(quizId: string, questionId: string): Promise<void> {
  await api.delete(`/quizzes/${quizId}/questions/${questionId}`);
}
