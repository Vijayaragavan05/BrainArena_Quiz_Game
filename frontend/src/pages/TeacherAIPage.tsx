import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  extractMaterialText,
  generateFromMaterial,
  generateFromTopic,
  getAIConfig,
  regenerateQuestion,
} from '../services/ai';
import { applyImport } from '../services/import';
import { listQuizzes } from '../services/quizzes';
import { getErrorMessage } from '../utils/errors';
import type { AIConfig } from '../services/ai';
import type { Difficulty, ImportedQuestion, Quiz } from '../types';
import { Badge } from '../components/ui/Badge';
import { AIGeneratedQuestionCard } from '../components/AIGeneratedQuestionCard';
import { Button } from '../components/ui/Button';
import { Spinner } from '../components/ui/Spinner';
import { IconBank, IconCheck, IconSparkles, IconUpload } from '../components/ui/icons';

type Mode = 'topic' | 'material';

const PROVIDER_LABEL: Record<string, string> = {
  gemini: 'Gemini',
  openai: 'OpenAI',
  mock: 'Demo generator (mock)',
  none: 'Disabled',
};

export function TeacherAIPage() {
  const navigate = useNavigate();
  const [config, setConfig] = useState<AIConfig | null>(null);
  const [mode, setMode] = useState<Mode>('topic');
  const [topic, setTopic] = useState('');
  const [count, setCount] = useState(5);
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [material, setMaterial] = useState('');
  const [materialTopic, setMaterialTopic] = useState('');
  const [fileName, setFileName] = useState<string | null>(null);

  const [generated, setGenerated] = useState<ImportedQuestion[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [approved, setApproved] = useState<Set<number>>(new Set());
  const [regeneratingIdx, setRegeneratingIdx] = useState<number | null>(null);
  const [alternatives, setAlternatives] = useState<Record<number, ImportedQuestion[]>>({});

  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [targetQuizId, setTargetQuizId] = useState('');
  const [saveToBank, setSaveToBank] = useState(true);
  const [applying, setApplying] = useState(false);
  const [done, setDone] = useState<string | null>(null);

  const refreshQuizzes = useCallback(() => {
    listQuizzes().then(setQuizzes).catch(() => setQuizzes([]));
  }, []);

  useEffect(() => {
    getAIConfig().then(setConfig).catch(() => setConfig(null));
    refreshQuizzes();
  }, [refreshQuizzes]);

  const handleGenerate = async () => {
    setBusy(true);
    setError(null);
    setDone(null);
    setGenerated(null);
    try {
      let questions: ImportedQuestion[];
      if (mode === 'topic') {
        if (!topic.trim()) throw new Error('Enter a topic');
        questions = await generateFromTopic({ topic: topic.trim(), count, difficulty });
      } else {
        if (!material.trim()) throw new Error('Provide learning material text or a file');
        questions = await generateFromMaterial({
          material: material.trim(),
          count,
          difficulty,
          topic: materialTopic.trim() || undefined,
        });
      }
      setGenerated(questions);
      setApproved(new Set(questions.map((_, i) => i)));
      setAlternatives({});
    } catch (err) {
      setError(getErrorMessage(err, 'Generation failed'));
    } finally {
      setBusy(false);
    }
  };

  const handleFile = async (file: File) => {
    setBusy(true);
    setError(null);
    setFileName(file.name);
    try {
      const res = await extractMaterialText(file);
      setMaterial((prev) => (prev ? `${prev}\n\n${res.text}` : res.text));
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to read file'));
      setFileName(null);
    } finally {
      setBusy(false);
    }
  };

  const handleApply = async () => {
    if (!generated || generated.length === 0) return;
    const selected = generated.filter((_, i) => approved.has(i));
    if (selected.length === 0) {
      setError('Approve at least one question before saving.');
      return;
    }
    setApplying(true);
    setError(null);
    setDone(null);
    try {
      const target = saveToBank ? undefined : targetQuizId;
      const res = await applyImport(selected, target);
      setDone(`${res.imported} AI-generated question(s) saved${target ? ' to quiz' : ' to question bank'}.`);
      setGenerated(null);
      setApproved(new Set());
      setAlternatives({});
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to save questions'));
    } finally {
      setApplying(false);
    }
  };

  const handleToggleApprove = (idx: number) => {
    setApproved((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const handleEdit = (idx: number, updated: ImportedQuestion) => {
    if (!generated) return;
    const next = [...generated];
    next[idx] = updated;
    setGenerated(next);
    setAlternatives((prev) => ({ ...prev, [idx]: [] }));
  };

  const handleRemove = (idx: number) => {
    if (!generated) return;
    const next = generated.filter((_, i) => i !== idx);
    setGenerated(next);
    setApproved((prev) => {
      const mapped = new Set<number>();
      prev.forEach((i) => {
        if (i < idx) mapped.add(i);
        else if (i > idx) mapped.add(i - 1);
      });
      return mapped;
    });
    setAlternatives((prev) => {
      const mapped: Record<number, ImportedQuestion[]> = {};
      Object.entries(prev).forEach(([k, v]) => {
        const ki = Number(k);
        if (ki < idx) mapped[ki] = v;
        else if (ki > idx) mapped[ki - 1] = v;
      });
      return mapped;
    });
  };

  const handleRegenerate = async (idx: number) => {
    if (!generated || regeneratingIdx !== null) return;
    setRegeneratingIdx(idx);
    setError(null);
    try {
      const variants = await regenerateQuestion({ question: generated[idx], count: 3 });
      setAlternatives((prev) => ({ ...prev, [idx]: variants }));
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to regenerate alternatives'));
    } finally {
      setRegeneratingIdx(null);
    }
  };

  const handlePickAlternative = (idx: number, alt: ImportedQuestion) => {
    if (!generated) return;
    const next = [...generated];
    next[idx] = alt;
    setGenerated(next);
    setApproved((prev) => new Set(prev).add(idx));
    setAlternatives((prev) => ({ ...prev, [idx]: [] }));
  };

  const modeBtn = (m: Mode, label: string) => (
    <button
      onClick={() => setMode(m)}
      className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
        mode === m
          ? 'bg-gradient-to-r from-brand-600 to-violet-600 text-white shadow-glow'
          : 'border border-white/[0.08] text-slate-300 hover:bg-surface-900/60/[0.08]'
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="mx-auto max-w-4xl animate-fade-up">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500/25 to-violet-500/25 text-brand-300">
          <IconSparkles className="h-6 w-6" />
        </div>
        <div>
          <h1 className="font-display text-3xl font-bold">AI Question Generator</h1>
          <p className="text-sm text-slate-400">Turn a topic or your study material into ready-to-use questions.</p>
        </div>
      </div>

      {config && (
        <div className="mt-4">
          <Badge tone={config.enabled ? 'green' : 'red'}>
            Provider: {PROVIDER_LABEL[config.provider] ?? config.provider}
            {config.enabled ? ` · model: ${config.model}` : ' · configure AI_PROVIDER in backend/.env'}
          </Badge>
        </div>
      )}

      {error && (
        <div className="animate-fade-in mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
          {error}
        </div>
      )}
      {done && (
        <div className="animate-fade-in mt-4 rounded-xl border border-green-200 bg-green-50 px-4 py-2.5 text-sm text-green-700">
          <IconCheck className="mr-1 inline h-4 w-4" /> {done}
        </div>
      )}

      <div className="card-surface animate-fade-up mt-5 p-6">
        <div className="flex gap-2">
          {modeBtn('topic', 'From topic')}
          {modeBtn('material', 'From material / PDF')}
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          {mode === 'topic' ? (
            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-sm font-medium text-slate-300">Topic</label>
              <input
                className="input-field"
                placeholder="e.g. Photosynthesis, World War II, Algebra…"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
              />
            </div>
          ) : (
            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-sm font-medium text-slate-300">
                Learning material{' '}
                <span className="text-xs font-normal text-slate-500">(paste or upload .txt / .pdf / .md)</span>
              </label>
              <textarea
                className="input-field h-40 resize-y"
                placeholder="Paste the study material here…"
                value={material}
                onChange={(e) => setMaterial(e.target.value)}
              />
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <label className="btn-secondary cursor-pointer !py-1.5">
                  <IconUpload className="h-4 w-4" />
                  {busy ? 'Reading…' : 'Upload file'}
                  <input
                    type="file"
                    accept=".pdf,.txt,.md,.csv"
                    className="hidden"
                    disabled={busy}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleFile(f);
                    }}
                  />
                </label>
                {fileName && <span className="text-sm text-slate-400">{fileName}</span>}
              </div>
              <div className="mt-3">
                <label className="mb-1.5 block text-sm font-medium text-slate-300">
                  Optional topic override{' '}
                  <span className="text-xs font-normal text-slate-500">(defaults to "Generated")</span>
                </label>
                <input
                  className="input-field"
                  placeholder="e.g. Biology"
                  value={materialTopic}
                  onChange={(e) => setMaterialTopic(e.target.value)}
                />
              </div>
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-300">Number of questions</label>
            <select className="input-field" value={count} onChange={(e) => setCount(Number(e.target.value))}>
              {[1, 2, 3, 5, 8, 10, 15, 20].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-300">Difficulty</label>
            <select
              className="input-field"
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value as Difficulty)}
            >
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </div>
        </div>

        <div className="mt-5">
          <Button onClick={handleGenerate} disabled={busy} size="lg">
            {busy ? <Spinner className="h-4 w-4 border-slate-300" /> : <IconSparkles className="h-4 w-4" />}
            {busy ? 'Generating…' : 'Generate questions'}
          </Button>
        </div>
      </div>

      {generated && generated.length > 0 && (
        <div className="mt-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-400">
              Review {generated.length} generated questions · {approved.size} approved
            </h2>
            <p className="text-xs text-slate-500">Approve (✓), edit (✎) or regenerate (⟳) each question before saving.</p>
          </div>
          <div className="mt-3 space-y-3">
            {generated.map((q, i) => (
              <AIGeneratedQuestionCard
                key={i}
                index={i}
                question={q}
                approved={approved.has(i)}
                regenerating={regeneratingIdx === i}
                alternatives={alternatives[i] ?? null}
                onToggleApprove={() => handleToggleApprove(i)}
                onEdit={(updated) => handleEdit(i, updated)}
                onRegenerate={() => handleRegenerate(i)}
                onPickAlternative={(alt) => handlePickAlternative(i, alt)}
                onCancelAlternatives={() =>
                  setAlternatives((prev) => ({ ...prev, [i]: [] }))
                }
                onRemove={() => handleRemove(i)}
              />
            ))}
          </div>

          <div className="card-surface animate-fade-up mt-4 p-6">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-slate-400">Save questions</h3>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                onClick={() => setSaveToBank(true)}
                className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                  saveToBank
                    ? 'bg-gradient-to-r from-brand-600 to-violet-600 text-white shadow-glow'
                    : 'border border-white/[0.08] text-slate-300 hover:bg-surface-900/60/[0.08]'
                }`}
              >
                Question bank
              </button>
              <button
                onClick={() => setSaveToBank(false)}
                className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                  !saveToBank
                    ? 'bg-gradient-to-r from-brand-600 to-violet-600 text-white shadow-glow'
                    : 'border border-white/[0.08] text-slate-300 hover:bg-surface-900/60/[0.08]'
                }`}
              >
                A quiz
              </button>
            </div>
            {!saveToBank && (
              <select
                value={targetQuizId}
                onChange={(e) => setTargetQuizId(e.target.value)}
                className="input-field mt-3 w-full"
              >
                <option value="">Select a quiz…</option>
                {quizzes.map((q) => (
                  <option key={q._id} value={q._id}>
                    {q.title}
                  </option>
                ))}
              </select>
            )}
            <div className="mt-4 flex flex-wrap gap-3">
              <Button
                onClick={handleApply}
                disabled={applying || (!saveToBank && !targetQuizId)}
                className="bg-emerald-600 from-emerald-600 to-emerald-700 hover:brightness-110"
              >
                {applying ? 'Saving…' : `Save ${approved.size} approved question(s)`}
              </Button>
              <Button variant="ghost" onClick={() => navigate('/teacher/question-bank')}>
                <IconBank className="h-4 w-4" /> Open question bank →
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}