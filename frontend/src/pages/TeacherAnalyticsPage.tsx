import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listQuizzes } from '../services/quizzes';
import { getErrorMessage } from '../utils/errors';
import type { Quiz } from '../types';
import { Badge, difficultyTone } from '../components/ui/Badge';
import { IconArrowLeft, IconChart } from '../components/ui/icons';
import { Spinner } from '../components/ui/Spinner';

export function TeacherAnalyticsPage() {
  const [quizzes, setQuizzes] = useState<Quiz[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listQuizzes()
      .then(setQuizzes)
      .catch((err) => setError(getErrorMessage(err, 'Failed to load quizzes')));
  }, []);

  return (
    <div className="animate-fade-up">
      <h1 className="font-display text-3xl font-bold">Class Analytics</h1>
      <p className="mt-1 text-slate-400">
        Select a quiz to view class performance, rankings and question analysis.
      </p>

      {error && (
        <div className="animate-fade-in mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {quizzes === null ? (
          <div className="col-span-full flex items-center justify-center gap-2 py-12 text-slate-500">
            <Spinner /> Loading quizzes…
          </div>
        ) : quizzes.length === 0 ? (
          <div className="col-span-full rounded-2xl border border-dashed border-white/[0.08] p-10 text-center">
            <IconChart className="mx-auto h-10 w-10 text-slate-400" />
            <p className="mt-3 text-slate-300">No quizzes yet.</p>
            <p className="mt-1 text-sm text-slate-500">Create a quiz and run a live session to start gathering analytics.</p>
            <Link to="/teacher/quizzes" className="btn-primary mt-5">
              Create quiz
            </Link>
          </div>
        ) : (
          quizzes.map((q, i) => (
            <Link
              key={q._id}
              to={`/teacher/analytics/${q._id}`}
              className="card-surface card-hover animate-fade-up group block p-5"
              style={{ animationDelay: `${i * 50}ms` }}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-display font-bold text-slate-100">{q.title}</span>
                <Badge tone={difficultyTone[q.difficulty]} className="shrink-0 capitalize">
                  {q.difficulty}
                </Badge>
              </div>
              <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
                <Badge tone="slate">{q.topic}</Badge>
                <span>{q.questions.length} questions</span>
              </div>
              <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-brand-400 transition group-hover:translate-x-1">
                View analytics <IconArrowLeft className="h-4 w-4 rotate-180" />
              </span>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}