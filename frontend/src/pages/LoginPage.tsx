import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { login } from '../services/auth';
import { getErrorMessage } from '../utils/errors';
import { Logo } from '../components/ui/Logo';
import { ThemeToggle } from '../components/ThemeToggle';
import { Button } from '../components/ui/Button';
import { Spinner } from '../components/ui/Spinner';

export function LoginPage() {
  const { login: setAuth } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await login({ email, password });
      setAuth(res.token, res.user);
      navigate(res.user.role === 'teacher' ? '/teacher' : '/student', { replace: true });
    } catch (err) {
      setError(getErrorMessage(err, 'Login failed. Please try again.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#0a0a12] px-4 py-10">
      <div className="absolute right-4 top-4 z-20">
        <ThemeToggle />
      </div>
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="absolute -top-32 left-1/2 h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-violet-600/20 blur-[80px]" />
        <div className="absolute bottom-0 right-0 h-[400px] w-[600px] rounded-full bg-cyan-500/12 blur-[80px]" />
      </div>

      <div className="animate-scale-in card-surface relative w-full max-w-md p-8">
        <div className="mb-6 text-center">
          <Logo size="lg" to="/" />
          <h1 className="mt-4 font-display text-2xl font-bold text-white">Welcome back</h1>
          <p className="mt-1 text-sm text-slate-400">Login to continue to the Arena.</p>
        </div>

        {error && (
          <div className="animate-fade-in mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm text-red-300">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-300">Email</label>
            <input className="input-field" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-300">Password</label>
            <input className="input-field" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Your password" required />
          </div>
          <Button type="submit" size="lg" className="w-full" disabled={submitting}>
            {submitting ? <Spinner className="h-4 w-4" /> : 'Login'}
          </Button>
        </form>

        <p className="mt-5 text-center text-sm text-slate-400">
          No account? <Link to="/register" className="font-semibold text-violet-400 hover:underline">Create one</Link>
        </p>
        <Link to="/" className="mt-3 block text-center text-sm text-slate-500 hover:text-slate-300">
          ← Back home
        </Link>
      </div>
    </div>
  );
}
