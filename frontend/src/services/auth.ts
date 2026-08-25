import { api } from './api';
import type { AuthResponse } from '../types';

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  role: 'teacher' | 'student';
}

export async function register(payload: RegisterPayload): Promise<AuthResponse> {
  const res = await api.post<AuthResponse>('/auth/register', payload);
  return res.data;
}

export async function login(payload: { email: string; password: string }): Promise<AuthResponse> {
  const res = await api.post<AuthResponse>('/auth/login', payload);
  return res.data;
}

export async function fetchMe(): Promise<{ user: { _id: string; name: string; email: string; role: string } }> {
  const res = await api.get('/auth/me');
  return res.data;
}
