import { useAuth } from '../contexts/AuthContext';

export function useHomePath(): string {
  const { user } = useAuth();
  if (user?.role === 'teacher') return '/teacher';
  if (user?.role === 'student') return '/student';
  return '/';
}
