import { api } from './api';
import type {
  StudentResultSummary,
  StudentReportDetail,
  TeacherQuizResults,
  TeacherQuizOverview,
} from '../types/analytics';

export async function listMyResults(): Promise<StudentResultSummary[]> {
  const res = await api.get<{ results: StudentResultSummary[] }>('/results/student/me');
  return res.data.results;
}

export async function getMyResult(resultId: string): Promise<StudentReportDetail> {
  const res = await api.get<StudentReportDetail>(`/results/student/${resultId}`);
  return res.data;
}

export async function getQuizResults(quizId: string): Promise<TeacherQuizResults> {
  const res = await api.get(`/results/quiz/${quizId}`);
  return res.data;
}

export async function getQuizOverview(quizId: string): Promise<TeacherQuizOverview> {
  const res = await api.get(`/results/quiz/${quizId}/overview`);
  return res.data;
}