import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getQuizStats, listQuizzes } from '../services/quizzes';
import { getErrorMessage } from '../utils/errors';
import type { QuizStats } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { IconList, IconPlay, IconSparkles } from '../components/ui/icons';

export function TeacherDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<QuizStats | null>(null);
  const [recent, setRecent] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([getQuizStats(), listQuizzes()])
      .then(([s, quizzes]) => {
        setStats(s);
        setRecent(quizzes.length);
      })
      .catch((err) => setError(getErrorMessage(err, 'Failed to load dashboard')));
  }, []);

  const cards = stats
    ? [
        { label: 'Total quizzes', value: stats.total, accent: 'text-brand-400' },
        { label: 'Drafts', value: stats.drafts, accent: 'text-slate-300' },
        { label: 'Published', value: stats.published, accent: 'text-emerald-400' },
        { label: 'Questions', value: stats.totalQuestions, accent: 'text-amber-600' },
        { label: 'Recent quizzes', value: recent, accent: 'text-cyan-400' },
      ]
    : [];

  return (
    <div className="animate-fade-up">
      <h1 className="font-display text-3xl font-bold">
        Welcome back, {user?.name.split(' ')[0]} 👋
      </h1>
      <p className="mt-1 text-slate-400">Create quizzes, run live games, and analyze how your class performed.</p>

      {error && (
        <div className="animate-fade-in mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
        {cards.map((c, i) => (
          <div
            key={c.label}
            className="card-surface animate-fade-up p-5"
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <div className={`text-3xl font-extrabold ${c.accent}`}>{c.value}</div>
            <div className="mt-1 text-sm text-slate-400">{c.label}</div>
          </div>
        ))}
      </div>

      <div className="mt-10 grid gap-4 md:grid-cols-3">
        <ActionCard
          to="/teacher/quizzes"
          icon={IconList}
          title="Manage quizzes"
          desc="Build, edit and organize your quizzes."
          cta="Open quizzes →"
        />
        <ActionCard
          to="/teacher/live"
          icon={IconPlay}
          title="Host a live quiz"
          desc="Start a game, share the PIN, watch it unfold live."
          cta="Go live →"
        />
        <ActionCard
          to="/teacher/ai"
          icon={IconSparkles}
          title="Generate with AI"
          desc="Turn a topic or PDF into a question set in seconds."
          cta="Try AI →"
        />
      </div>
    </div>
  );
}

function ActionCard({
  to,
  icon: Icon,
  title,
  desc,
  cta,
}: {
  to: string;
  icon: (p: { className?: string }) => React.ReactElement;
  title: string;
  desc: string;
  cta: string;
}) {
  return (
    <Link to={to} className="card-surface card-hover group flex flex-col p-6">
      <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500/25 to-violet-500/25 text-brand-300">
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="font-display text-base font-bold text-slate-100">{title}</h3>
      <p className="mt-1 flex-1 text-sm text-slate-400">{desc}</p>
      <span className="mt-4 text-sm font-semibold text-brand-400 transition group-hover:translate-x-1">
        {cta}
      </span>
    </Link>
  );
}