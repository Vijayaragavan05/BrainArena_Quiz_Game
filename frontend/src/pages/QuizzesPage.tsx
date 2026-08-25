import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createQuiz, deleteQuiz, duplicateQuiz, listQuizzes, toggleArchiveQuiz } from '../services/quizzes';
import { getErrorMessage } from '../utils/errors';
import type { Quiz } from '../types';
import { Badge, difficultyTone, statusTone } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { IconList, IconPencil, IconPlay, IconPlus, IconRefresh, IconTrash, IconUpload } from '../components/ui/icons';
import { Spinner } from '../components/ui/Spinner';

export function QuizzesPage() {
  const navigate = useNavigate();
  const [quizzes, setQuizzes] = useState<Quiz[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(() => {
    listQuizzes()
      .then(setQuizzes)
      .catch((err) => setError(getErrorMessage(err, 'Failed to load quizzes')));
  }, []);

  useEffect(refresh, [refresh]);

  const handleNew = async () => {
    setBusy(true);
    setError(null);
    try {
      const quiz = await createQuiz({
        title: 'Untitled Quiz',
        topic: 'General',
        description: '',
        difficulty: 'medium',
        duration: 20,
      });
      navigate(`/teacher/quizzes/${quiz._id}`);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to create quiz'));
    } finally {
      setBusy(false);
    }
  };

  const handleDuplicate = async (id: string) => {
    try {
      await duplicateQuiz(id);
      refresh();
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to duplicate quiz'));
    }
  };

  const handleArchive = async (quiz: Quiz) => {
    try {
      await toggleArchiveQuiz(quiz._id);
      refresh();
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to update quiz'));
    }
  };

  const handleDelete = async (quiz: Quiz) => {
    if (!window.confirm(`Delete "${quiz.title}"? This cannot be undone.`)) return;
    try {
      await deleteQuiz(quiz._id);
      refresh();
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to delete quiz'));
    }
  };

  return (
    <div className="animate-fade-up">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold">Quizzes</h1>
          <p className="mt-1 text-slate-400">Create, edit, duplicate, archive or delete quizzes.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => navigate('/teacher/import')}>
            <IconUpload className="h-4 w-4" /> Import
          </Button>
          <Button onClick={handleNew} disabled={busy}>
            <IconPlus className="h-4 w-4" /> New Quiz
          </Button>
        </div>
      </div>

      {error && (
        <div className="animate-fade-in mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="mt-6 overflow-hidden rounded-2xl border border-white/[0.08]">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-white/[0.08] bg-surface-900/60 text-slate-400">
            <tr>
              <th className="px-4 py-3.5 font-medium">Title</th>
              <th className="px-4 py-3.5 font-medium">Topic</th>
              <th className="px-4 py-3.5 font-medium">Difficulty</th>
              <th className="px-4 py-3.5 font-medium">Questions</th>
              <th className="px-4 py-3.5 font-medium">Status</th>
              <th className="px-4 py-3.5 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/70 bg-surface-900/60/50">
            {quizzes === null ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-slate-500">
                  <Spinner className="mx-auto mb-2" /> Loading quizzes…
                </td>
              </tr>
            ) : quizzes.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center">
                  <IconList className="mx-auto h-10 w-10 text-slate-400" />
                  <p className="mt-3 font-medium text-slate-300">No quizzes yet</p>
                  <p className="mt-1 text-sm text-slate-500">Create your first quiz to get started.</p>
                  <Button onClick={handleNew} className="mt-4" disabled={busy}>
                    <IconPlus className="h-4 w-4" /> Create quiz
                  </Button>
                </td>
              </tr>
            ) : (
              quizzes.map((quiz) => (
                <tr key={quiz._id} className="transition hover:bg-surface-900/60/[0.08]/30">
                  <td className="px-4 py-3.5">
                    <button
                      onClick={() => navigate(`/teacher/quizzes/${quiz._id}`)}
                      className="font-semibold text-brand-400 hover:underline"
                    >
                      {quiz.title}
                    </button>
                  </td>
                  <td className="px-4 py-3.5">
                    <Badge tone="slate">{quiz.topic}</Badge>
                  </td>
                  <td className="px-4 py-3.5 capitalize">
                    <Badge tone={difficultyTone[quiz.difficulty]}>{quiz.difficulty}</Badge>
                  </td>
                  <td className="px-4 py-3.5 text-slate-300">{quiz.questions.length}</td>
                  <td className="px-4 py-3.5">
                    <Badge tone={statusTone[quiz.status]}>{quiz.status}</Badge>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex justify-end gap-1.5">
                      <ActionBtn
                        onClick={() => navigate(`/teacher/live/${quiz._id}`)}
                        disabled={quiz.questions.length === 0}
                        title="Start live"
                        className="border-brand-700 text-brand-400 hover:bg-brand-950/40"
                      >
                        <IconPlay className="h-3.5 w-3.5" />
                      </ActionBtn>
                      <ActionBtn
                        onClick={() => navigate(`/teacher/quizzes/${quiz._id}`)}
                        title="Edit"
                        className="border-white/[0.08] text-slate-300 hover:bg-surface-900/60/[0.08]"
                      >
                        <IconPencil className="h-3.5 w-3.5" />
                      </ActionBtn>
                      <ActionBtn
                        onClick={() => handleDuplicate(quiz._id)}
                        title="Duplicate"
                        className="border-white/[0.08] text-slate-300 hover:bg-surface-900/60/[0.08]"
                      >
                        <IconRefresh className="h-3.5 w-3.5" />
                      </ActionBtn>
                      <ActionBtn
                        onClick={() => handleArchive(quiz)}
                        title={quiz.status === 'archived' ? 'Unarchive' : 'Archive'}
                        className="border-white/[0.08] text-slate-300 hover:bg-surface-900/60/[0.08]"
                      >
                        {quiz.status === 'archived' ? '↩' : '🗂'}
                      </ActionBtn>
                      <ActionBtn
                        onClick={() => handleDelete(quiz)}
                        title="Delete"
                        className="border-red-900 text-red-600 hover:bg-red-50"
                      >
                        <IconTrash className="h-3.5 w-3.5" />
                      </ActionBtn>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ActionBtn({
  onClick,
  disabled,
  title,
  className = '',
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  title: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`inline-flex items-center justify-center rounded-lg border px-2.5 py-1.5 transition disabled:cursor-not-allowed disabled:opacity-40 ${className}`}
    >
      {children}
    </button>
  );
}