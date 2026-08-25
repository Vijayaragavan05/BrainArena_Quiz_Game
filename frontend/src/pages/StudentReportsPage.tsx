import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listMyResults } from '../services/results';
import { getErrorMessage } from '../utils/errors';
import type { StudentResultSummary } from '../types/analytics';
import { Badge } from '../components/ui/Badge';
import { IconChart, IconTrophy } from '../components/ui/icons';
import { Spinner } from '../components/ui/Spinner';

export function StudentReportsPage() {
  const [results, setResults] = useState<StudentResultSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listMyResults()
      .then(setResults)
      .catch((err) => setError(getErrorMessage(err, 'Failed to load reports')));
  }, []);

  return (
    <div>
      <div className="animate-fade-up">
        <h1 className="font-display text-3xl font-bold">My Performance Reports</h1>
        <p className="mt-1 text-slate-400">Every quiz you played, and the story behind each score.</p>
      </div>

      {error && (
        <div className="animate-fade-in mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="mt-6 space-y-3">
        {results === null ? (
          <div className="flex items-center justify-center gap-2 py-16 text-slate-500">
            <Spinner className="h-4 w-4" /> Loading reports…
          </div>
        ) : results.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/[0.08] p-12 text-center">
            <IconChart className="mx-auto h-10 w-10 text-slate-400" />
            <p className="mt-4 font-medium text-slate-300">No quizzes completed yet</p>
            <p className="mt-1 text-sm text-slate-500">
              Join a live quiz with a Game PIN on your dashboard to get your first report.
            </p>
            <Link to="/student" className="btn-primary mt-5">
              Back to dashboard
            </Link>
          </div>
        ) : (
          results.map((r, i) => (
            <Link
              key={r._id}
              to={`/student/results/${r._id}`}
              className="card-surface card-hover animate-fade-up group block p-5"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-display text-base font-bold text-slate-100">{r.quiz.title}</span>
                    <Badge tone="slate">{r.quiz.topic}</Badge>
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    {new Date(r.completedAt).toLocaleString()}
                  </div>
                </div>
                <div className="flex items-center gap-6 text-right">
                  <div>
                    <div className="text-[11px] uppercase tracking-wide text-slate-500">Score</div>
                    <div className="text-lg font-bold text-slate-100">{r.score}</div>
                  </div>
                  <div>
                    <div className="text-[11px] uppercase tracking-wide text-slate-500">Rank</div>
                    <div className="text-lg font-bold text-brand-400">#{r.rank}</div>
                  </div>
                  <div>
                    <div className="text-[11px] uppercase tracking-wide text-slate-500">Accuracy</div>
                    <div className="text-lg font-bold">{Math.round(r.accuracy * 100)}%</div>
                  </div>
                  {r.rank === 1 && <IconTrophy className="h-6 w-6 text-amber-600" />}
                </div>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}