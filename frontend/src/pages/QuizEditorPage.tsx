import { useCallback, useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { addQuestion, getQuiz, removeQuestion, updateQuestion, updateQuiz } from '../services/quizzes';
import { exportQuizQuestionsCsv } from '../services/export';
import { getErrorMessage } from '../utils/errors';
import { QuestionForm } from '../components/QuestionForm';
import { Badge, difficultyTone } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Spinner } from '../components/ui/Spinner';
import {
  IconBank,
  IconDownload,
  IconPencil,
  IconPlus,
  IconTrash,
  IconUpload,
} from '../components/ui/icons';
import type { Question, QuestionInput, Quiz, QuizInput, Difficulty } from '../types';

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

export function QuizEditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice] = useState<string | null>((location.state as { notice?: string } | null)?.notice ?? null);
  const [savingMeta, setSavingMeta] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [showForm, setShowForm] = useState(false);

  const [meta, setMeta] = useState<QuizInput>({
    title: '',
    topic: '',
    description: '',
    difficulty: 'medium',
    duration: 20,
  });

  const refresh = useCallback(() => {
    if (!id) return;
    getQuiz(id)
      .then((q) => {
        setQuiz(q);
        setMeta({
          title: q.title,
          topic: q.topic,
          description: q.description,
          difficulty: q.difficulty,
          duration: q.duration,
        });
      })
      .catch((err) => setError(getErrorMessage(err, 'Failed to load quiz')));
  }, [id]);

  useEffect(refresh, [refresh]);

  const handleSaveMeta = async () => {
    if (!id) return;
    setSavingMeta(true);
    setError(null);
    try {
      const updated = await updateQuiz(id, meta);
      setQuiz(updated);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to save quiz'));
    } finally {
      setSavingMeta(false);
    }
  };

  const handleSubmitQuestion = async (input: QuestionInput) => {
    if (!id) return;
    if (editingQuestion) {
      await updateQuestion(id, editingQuestion._id, input);
    } else {
      await addQuestion(id, input);
    }
    setShowForm(false);
    setEditingQuestion(null);
    refresh();
  };

  const handleDeleteQuestion = async (q: Question) => {
    if (!id) return;
    if (!window.confirm('Delete this question?')) return;
    try {
      await removeQuestion(id, q._id);
      refresh();
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to delete question'));
    }
  };

  if (error && !quiz) {
    return (
      <div className="animate-fade-in rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        {error}
      </div>
    );
  }

  if (!quiz) {
    return (
      <div className="flex items-center gap-2 text-slate-500">
        <Spinner /> Loading quiz…
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl">
      <button onClick={() => navigate('/teacher/quizzes')} className="btn-ghost -ml-3 mb-4">
        ← Back to quizzes
      </button>

      <div className="animate-fade-up flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h1 className="font-display text-3xl font-bold">{quiz.title}</h1>
          <Badge tone={difficultyTone[quiz.difficulty]} className="capitalize">
            {quiz.difficulty}
          </Badge>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" onClick={() => exportQuizQuestionsCsv(quiz._id).catch(() => setError('Failed to export CSV'))}>
            <IconDownload className="h-3.5 w-3.5" /> CSV
          </Button>
          <Button variant="secondary" size="sm" onClick={() => navigate(`/teacher/question-bank?addToQuiz=${quiz._id}`)}>
            <IconBank className="h-3.5 w-3.5" /> Question bank
          </Button>
          <Button variant="secondary" size="sm" onClick={() => navigate(`/teacher/import?targetQuizId=${quiz._id}`)}>
            <IconUpload className="h-3.5 w-3.5" /> Import file
          </Button>
          <Button size="sm" onClick={() => navigate(`/teacher/live/${quiz._id}`)} disabled={quiz.questions.length === 0}>
            ▶ Start live
          </Button>
        </div>
      </div>

      {error && (
        <div className="animate-fade-in mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
          {error}
        </div>
      )}

      {notice && (
        <div className="animate-fade-in mt-4 rounded-xl border border-green-200 bg-green-50 px-4 py-2.5 text-sm text-green-700">
          {notice}
        </div>
      )}

      {/* Metadata */}
      <section className="card-surface animate-fade-up mt-6 p-6">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-400">Quiz details</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-300">Title</label>
            <input
              className="input-field"
              value={meta.title}
              onChange={(e) => setMeta({ ...meta, title: e.target.value })}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-300">Topic</label>
            <input
              className="input-field"
              value={meta.topic}
              onChange={(e) => setMeta({ ...meta, topic: e.target.value })}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1.5 block text-sm font-medium text-slate-300">Description</label>
            <textarea
              className="input-field"
              value={meta.description}
              onChange={(e) => setMeta({ ...meta, description: e.target.value })}
              rows={2}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-300">Difficulty</label>
            <select
              className="input-field"
              value={meta.difficulty}
              onChange={(e) => setMeta({ ...meta, difficulty: e.target.value as Difficulty })}
            >
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-300">
              Time per question (seconds)
            </label>
            <input
              type="number"
              min={5}
              max={300}
              className="input-field"
              value={meta.duration}
              onChange={(e) => setMeta({ ...meta, duration: Number(e.target.value) })}
            />
          </div>
        </div>
        <div className="mt-5 flex justify-end">
          <Button onClick={handleSaveMeta} disabled={savingMeta}>
            {savingMeta ? 'Saving…' : 'Save quiz details'}
          </Button>
        </div>
      </section>

      {/* Questions */}
      <section className="mt-8">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-400">
            Questions ({quiz.questions.length})
          </h2>
          <Button
            onClick={() => {
              setEditingQuestion(null);
              setShowForm(true);
            }}
          >
            <IconPlus className="h-4 w-4" /> Add question
          </Button>
        </div>

        {showForm && (
          <div className="mb-4">
            <QuestionForm
              initial={editingQuestion}
              onSubmit={handleSubmitQuestion}
              onCancel={() => {
                setShowForm(false);
                setEditingQuestion(null);
              }}
            />
          </div>
        )}

        <div className="space-y-3">
          {quiz.questions.length === 0 && !showForm && (
            <div className="rounded-2xl border border-dashed border-white/[0.08] p-10 text-center">
              <p className="text-slate-300">No questions yet.</p>
              <p className="mt-1 text-sm text-slate-500">
                Add one manually, import from a file, or pull from your question bank.
              </p>
              <div className="mt-4 flex justify-center gap-2">
                <Button
                  onClick={() => {
                    setEditingQuestion(null);
                    setShowForm(true);
                  }}
                >
                  <IconPlus className="h-4 w-4" /> Add question
                </Button>
                <Button variant="secondary" onClick={() => navigate(`/teacher/question-bank?addToQuiz=${quiz._id}`)}>
                  <IconBank className="h-4 w-4" /> From bank
                </Button>
              </div>
            </div>
          )}
          {quiz.questions.map((q, index) => (
            <div key={q._id} className="card-surface animate-fade-up p-5" style={{ animationDelay: `${index * 50}ms` }}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-violet-500/10 text-xs font-bold text-brand-300">
                      {index + 1}
                    </span>
                    <Badge tone={difficultyTone[q.difficulty]} className="capitalize">
                      {q.difficulty}
                    </Badge>
                    {q.topic && <Badge tone="slate">{q.topic}</Badge>}
                  </div>
                  <p className="mt-2.5 text-sm font-medium text-slate-100">{q.text}</p>
                  <div className="mt-3 grid gap-1 sm:grid-cols-2">
                    {q.options.map((opt, i) => (
                      <div
                        key={i}
                        className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm ${
                          i === q.correctIndex
                            ? 'bg-green-50 text-green-700'
                            : 'bg-surface-900/60 text-slate-400'
                        }`}
                      >
                        <span className="font-bold">{LETTERS[i]}</span>
                        <span>{opt}</span>
                        {i === q.correctIndex && <span className="ml-auto text-[10px] uppercase tracking-wide">Correct</span>}
                      </div>
                    ))}
                  </div>
                  {q.explanation && <p className="mt-2 text-xs text-slate-500">💡 {q.explanation}</p>}
                </div>
                <div className="flex shrink-0 gap-2">
                  <button
                    onClick={() => {
                      setEditingQuestion(q);
                      setShowForm(true);
                    }}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.08] px-2.5 py-1.5 text-xs font-semibold text-slate-300 transition hover:bg-surface-900/60/[0.08]"
                  >
                    <IconPencil className="h-3.5 w-3.5" /> Edit
                  </button>
                  <button
                    onClick={() => handleDeleteQuestion(q)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-red-900 px-2.5 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-50"
                  >
                    <IconTrash className="h-3.5 w-3.5" /> Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}