import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { listQuizzes } from '../services/quizzes';
import { getErrorMessage } from '../utils/errors';
import type { Quiz } from '../types';
import { Badge, difficultyTone } from '../components/ui/Badge';
import { IconPlay } from '../components/ui/icons';
import { Spinner } from '../components/ui/Spinner';

export function TeacherLiveSelectPage() {
  const navigate = useNavigate();
  const [quizzes, setQuizzes] = useState<Quiz[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listQuizzes()
      .then(setQuizzes)
      .catch((err) => setError(getErrorMessage(err, 'Failed to load quizzes')));
  }, []);

  const start = (quiz: Quiz) => {
    if (quiz.questions.length === 0) {
      setError('This quiz has no questions yet. Add questions before starting a live session.');
      return;
    }
    navigate(`/teacher/live/${quiz._id}`);
  };

  return (
    <div className="animate-fade-up">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-red-500/25 to-amber-500/25 text-red-700">
          <IconPlay className="h-6 w-6" />
        </div>
        <div>
          <h1 className="font-display text-3xl font-bold">Start a Live Quiz</h1>
          <p className="text-sm text-slate-400">Pick a quiz to start a live session and generate a Game PIN.</p>
        </div>
      </div>

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
            <p className="text-slate-300">No quizzes yet.</p>
            <p className="mt-1 text-sm text-slate-500">Create a quiz first, then come back here to go live.</p>
            <button onClick={() => navigate('/teacher/quizzes')} className="btn-primary mt-5">
              Create quiz
            </button>
          </div>
        ) : (
          quizzes.map((q, i) => (
            <div key={q._id} className="card-surface card-hover animate-fade-up flex flex-col p-5" style={{ animationDelay: `${i * 50}ms` }}>
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
              <button
                onClick={() => start(q)}
                disabled={q.questions.length === 0}
                className="btn-primary mt-4 w-full !py-2.5 disabled:opacity-40"
              >
                <IconPlay className="h-4 w-4" /> Start live
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}