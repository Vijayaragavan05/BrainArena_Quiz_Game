import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { register } from '../services/auth';
import type { Role } from '../types';
import { useHomePath } from '../hooks/useHome';
import { getErrorMessage } from '../utils/errors';
import { Logo } from '../components/ui/Logo';
import { ThemeToggle } from '../components/ThemeToggle';
import { Button } from '../components/ui/Button';
import { Spinner } from '../components/ui/Spinner';
import { IconCheck } from '../components/ui/icons';

export function RegisterPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const homePath = useHomePath();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Role>('student');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await register({ name, email, password, role });
      login(res.token, res.user);
      navigate(role === 'teacher' ? '/teacher' : '/student', { replace: true });
    } catch (err) {
      setError(getErrorMessage(err, 'Registration failed. Please try again.'));
    } finally {
      setSubmitting(false);
    }
  };

  const roleOptions: { value: Role; title: string; desc: string }[] = [
    { value: 'student', title: 'Student', desc: 'Join live quizzes & track my reports' },
    { value: 'teacher', title: 'Teacher', desc: 'Create quizzes, host live games & analyze' },
  ];

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#0a0a12] px-4 py-10">
      <div className="absolute right-4 top-4 z-20">
        <ThemeToggle />
      </div>
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="absolute -top-32 left-1/2 h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-violet-600/20 blur-[80px]" />
        <div className="absolute bottom-0 right-0 h-[400px] w-[600px] rounded-full bg-cyan-500/12 blur-[80px]" />
      </div>

      <div className="animate-scale-in card-surface relative w-full max-w-lg p-8">
        <div className="mb-6 text-center">
          <Logo size="lg" to="/" />
          <h1 className="mt-4 font-display text-2xl font-bold text-white">Create an account</h1>
          <p className="mt-1 text-sm text-slate-400">Join the Arena as a teacher or student.</p>
        </div>

        {error && (
          <div className="animate-fade-in mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm text-red-300">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-300">Name</label>
            <input className="input-field" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your full name" required minLength={2} />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-300">Email</label>
            <input className="input-field" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-300">Password</label>
            <input className="input-field" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters" required minLength={8} />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-300">I am a…</label>
            <div className="grid gap-3 sm:grid-cols-2">
              {roleOptions.map((r) => (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => setRole(r.value)}
                  className={`rounded-xl border p-4 text-left backdrop-blur transition ${
                    role === r.value ? 'border-violet-500 bg-violet-500/15 shadow-glow' : 'border-white/[0.08] bg-white/[0.04] hover:border-white/[0.14]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold capitalize text-white">{r.title}</span>
                    {role === r.value && <IconCheck className="h-4 w-4 text-violet-400" />}
                  </div>
                  <p className="mt-1 text-xs text-slate-400">{r.desc}</p>
                </button>
              ))}
            </div>
          </div>
          <Button type="submit" size="lg" className="w-full" disabled={submitting}>
            {submitting ? <Spinner className="h-4 w-4" /> : 'Create account'}
          </Button>
        </form>

        <p className="mt-5 text-center text-sm text-slate-400">
          Already have an account? <Link to="/login" className="font-semibold text-violet-400 hover:underline">Login</Link>
        </p>
        <Link to={homePath} className="mt-3 block text-center text-sm text-slate-500 hover:text-slate-300">
          ← Back
        </Link>
      </div>
    </div>
  );
}
