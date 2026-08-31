import { api } from './api';

export interface AdminUser {
  _id: string;
  name: string;
  email: string;
  role: 'teacher' | 'student' | 'admin';
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}

export interface AdminStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  teachers: number;
  students: number;
  admins: number;
}

export async function getAdminUsers(params?: { status?: string; role?: string; q?: string }) {
  const { data } = await api.get<{ users: AdminUser[] }>('/admin/users', { params });
  return data.users;
}

export async function getAdminStats() {
  const { data } = await api.get<AdminStats>('/admin/stats');
  return data;
}

export async function approveUser(id: string) {
  const { data } = await api.post(`/admin/users/${id}/approve`);
  return data.user as AdminUser;
}

export async function rejectUser(id: string) {
  const { data } = await api.post(`/admin/users/${id}/reject`);
  return data.user as AdminUser;
}

export async function deleteUser(id: string) {
  const { data } = await api.delete(`/admin/users/${id}`);
  return data;
}
