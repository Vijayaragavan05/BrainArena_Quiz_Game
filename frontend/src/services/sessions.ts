import { api } from './api';

export async function lookupSession(pin: string): Promise<{
  sessionId: string;
  pin: string;
  status: string;
  quizTitle: string;
  quizTopic: string;
  teacherName: string;
}> {
  const res = await api.get(`/sessions/lookup/${encodeURIComponent(pin)}`);
  return res.data.session;
}