import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  addBankQuestionsToQuiz,
  addQuestionToBank,
  listBank,
  listBankTopics,
  removeQuestionFromBank,
} from '../services/bank';
import { listQuizzes } from '../services/quizzes';
import { getErrorMessage } from '../utils/errors';
import type { BankQuestion } from '../services/bank';
import type { Difficulty, Quiz } from '../types';
import { Badge, difficultyTone } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { IconBank, IconCheck, IconPlus, IconSearch, IconTrash, IconX } from '../components/ui/icons';
import { Spinner } from '../components/ui/Spinner';

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

export function QuestionBankPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const addToQuizId = params.get('addToQuiz') ?? '';

  const [questions, setQuestions] = useState<BankQuestion[] | null>(null);
  const [topics, setTopics] = useState<string[]>([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [topicFilter, setTopicFilter] = useState('');
  const [diffFilter, setDiffFilter] = useState('');
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    text: '',
    optionA: '',
    optionB: '',
    optionC: '',
    optionD: '',
    correctIndex: 0,
    explanation: '',
    topic: '',
    difficulty: 'medium' as Difficulty,
  });
  const [formBusy, setFormBusy] = useState(false);

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [adding, setAdding] = useState(false);

  const targetQuiz = quizzes.find((q) => q._id === addToQuizId);

  const refresh = useCallback(() => {
    listBank({ topic: topicFilter || undefined, difficulty: diffFilter || undefined, q: search || undefined })
      .then((r) => {
        setQuestions(r.questions);
        setSelected((prev) => {
          const next = new Set<string>();
          r.questions.forEach((q) => {
            if (prev.has(q._id)) next.add(q._id);
          });
          return next;
        });
      })
      .catch((err) => setError(getErrorMessage(err, 'Failed to load question bank')));
  }, [topicFilter, diffFilter, search]);

  useEffect(() => {
    listBankTopics().then(setTopics).catch(() => setTopics([]));
    listQuizzes().then(setQuizzes).catch(() => setQuizzes([]));
  }, []);

  useEffect(refresh, [refresh]);

  const handleAdd = async () => {
    const options = [form.optionA, form.optionB, form.optionC, form.optionD].filter((o) => o.trim());
    if (options.length < 2) {
      setError('At least 2 non-empty options required');
      return;
    }
    setFormBusy(true);
    setError(null);
    try {
      await addQuestionToBank({
        text: form.text,
        options,
        correctIndex: Math.min(form.correctIndex, options.length - 1),
        explanation: form.explanation,
        topic: form.topic || 'General',
        difficulty: form.difficulty,
      });
      setShowForm(false);
      setForm({
        text: '',
        optionA: '',
        optionB: '',
        optionC: '',
        optionD: '',
        correctIndex: 0,
        explanation: '',
        topic: '',
        difficulty: 'medium',
      });
      refresh();
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to add question'));
    } finally {
      setFormBusy(false);
    }
  };

  const handleRemove = async (id: string) => {
    try {
      await removeQuestionFromBank(id);
      refresh();
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to remove question'));
    }
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleAddSelected = async () => {
    if (!addToQuizId || selected.size === 0) return;
    setAdding(true);
    setError(null);
    try {
      const res = await addBankQuestionsToQuiz(addToQuizId, [...selected]);
      navigate(`/teacher/quizzes/${addToQuizId}`, { state: { notice: `${res.added} question(s) added to quiz` } });
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to add questions to quiz'));
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="animate-fade-up">
      {addToQuizId && (
        <div className="animate-fade-in mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-brand-700 bg-brand-950/30 p-4 shadow-glow">
          <p className="text-sm text-slate-200">
            Select questions to add to{' '}
            <b className="text-brand-400">{targetQuiz?.title ?? 'quiz'}</b>
          </p>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => navigate(`/teacher/quizzes/${addToQuizId}`)}>
              <IconX className="h-4 w-4" /> Cancel
            </Button>
            <Button size="sm" onClick={handleAddSelected} disabled={selected.size === 0 || adding}>
              <IconCheck className="h-4 w-4" />
              {adding ? 'Adding…' : `Add ${selected.size} to quiz`}
            </Button>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold">Question Bank</h1>
          <p className="mt-1 text-slate-400">
            Reusable questions. <span className="font-semibold text-slate-200">{questions?.length ?? 0}</span> saved.
          </p>
        </div>
        <Button onClick={() => setShowForm((s) => !s)} variant={showForm ? 'secondary' : 'primary'}>
          {showForm ? <IconX className="h-4 w-4" /> : <IconPlus className="h-4 w-4" />}
          {showForm ? 'Close form' : 'New Question'}
        </Button>
      </div>

      {error && (
        <div className="animate-fade-in mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
          {error}
        </div>
      )}

      {showForm && (
        <div className="animate-scale-in card-surface mt-5 p-6">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-400">New bank question</h2>
          <div className="mt-4 grid gap-3">
            <input
              className="input-field"
              placeholder="Question text"
              value={form.text}
              onChange={(e) => setForm({ ...form, text: e.target.value })}
            />
            <div className="grid gap-3 sm:grid-cols-2">
              {(['optionA', 'optionB', 'optionC', 'optionD'] as const).map((key, i) => (
                <div key={key} className="flex items-center gap-2">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-violet-500/10 text-sm font-bold text-brand-300">
                    {LETTERS[i]}
                  </span>
                  <input
                    className="input-field"
                    placeholder={`Option ${LETTERS[i]}`}
                    value={form[key]}
                    onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                  />
                </div>
              ))}
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-300">Correct answer</label>
                <select
                  className="input-field"
                  value={form.correctIndex}
                  onChange={(e) => setForm({ ...form, correctIndex: Number(e.target.value) })}
                >
                  {LETTERS.slice(0, 4).map((l, i) => (
                    <option key={l} value={i}>
                      {l}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-300">Topic</label>
                <input
                  className="input-field"
                  placeholder="General"
                  value={form.topic}
                  onChange={(e) => setForm({ ...form, topic: e.target.value })}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-300">Difficulty</label>
                <select
                  className="input-field"
                  value={form.difficulty}
                  onChange={(e) => setForm({ ...form, difficulty: e.target.value as Difficulty })}
                >
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </div>
            </div>
            <input
              className="input-field"
              placeholder="Explanation (optional)"
              value={form.explanation}
              onChange={(e) => setForm({ ...form, explanation: e.target.value })}
            />
            <div>
              <Button onClick={handleAdd} disabled={formBusy} className="bg-emerald-600 from-emerald-600 to-emerald-700 hover:brightness-110">
                {formBusy ? 'Saving…' : 'Save to bank'}
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="mt-5 flex flex-wrap gap-2">
        <div className="relative">
          <IconSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            className="input-field w-64 !pl-9"
            placeholder="Search questions…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="input-field w-auto"
          value={topicFilter}
          onChange={(e) => setTopicFilter(e.target.value)}
        >
          <option value="">All topics</option>
          {topics.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <select
          className="input-field w-auto"
          value={diffFilter}
          onChange={(e) => setDiffFilter(e.target.value)}
        >
          <option value="">All difficulties</option>
          <option value="easy">Easy</option>
          <option value="medium">Medium</option>
          <option value="hard">Hard</option>
        </select>
      </div>

      <div className="mt-4 space-y-3">
        {questions === null ? (
          <div className="flex items-center justify-center gap-2 py-12 text-slate-500">
            <Spinner /> Loading bank…
          </div>
        ) : questions.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/[0.08] p-10 text-center">
            <IconBank className="mx-auto h-10 w-10 text-slate-400" />
            <p className="mt-3 text-slate-300">No questions in the bank yet.</p>
            <p className="mt-1 text-sm text-slate-500">Add one above or import from a file.</p>
          </div>
        ) : (
          questions.map((q, i) => (
            <div
              key={q._id}
              className={`card-surface animate-fade-up p-5 transition ${
                addToQuizId && selected.has(q._id) ? '!border-brand-500 shadow-glow' : ''
              }`}
              style={{ animationDelay: `${i * 40}ms` }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  {addToQuizId && (
                    <input
                      type="checkbox"
                      className="mt-1.5 h-5 w-5 accent-brand-600"
                      checked={selected.has(q._id)}
                      onChange={() => toggleSelect(q._id)}
                    />
                  )}
                  <div>
                    <p className="font-semibold text-slate-100">{q.text}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <Badge tone="slate">{q.topic}</Badge>
                      <Badge tone={difficultyTone[q.difficulty]} className="capitalize">
                        {q.difficulty}
                      </Badge>
                      <span className="text-xs text-slate-500">
                        used in {q.usedInQuizzes} quiz{q.usedInQuizzes === 1 ? '' : 'zes'}
                      </span>
                    </div>
                  </div>
                </div>
                {!addToQuizId && (
                  <button
                    onClick={() => handleRemove(q._id)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-red-900 px-2.5 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-50"
                  >
                    <IconTrash className="h-3.5 w-3.5" /> Remove
                  </button>
                )}
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {q.options.map((o, i) => (
                  <span
                    key={i}
                    className={`rounded-lg px-2.5 py-1 text-xs ${
                      i === q.correctIndex
                        ? 'bg-green-100 font-bold text-green-700'
                        : 'bg-surface-900/60 text-slate-400'
                    }`}
                  >
                    {LETTERS[i]}. {o}
                  </span>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}