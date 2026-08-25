import { Link } from 'react-router-dom';
import { Logo } from '../components/ui/Logo';

export function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
      <Logo size="lg" />
      <h1 className="mt-4 font-display text-7xl font-extrabold text-gradient">404</h1>
      <p className="text-slate-400">This page does not exist.</p>
      <Link to="/" className="btn-primary mt-2">
        ← Back home
      </Link>
    </div>
  );
}