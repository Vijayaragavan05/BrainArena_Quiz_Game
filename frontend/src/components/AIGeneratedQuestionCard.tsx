import { useState } from 'react';
import type { ImportedQuestion, Difficulty } from '../types';
import { Badge, difficultyTone } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Spinner } from '../components/ui/Spinner';
import { IconCheck, IconPencil, IconRefresh, IconX } from '../components/ui/icons';

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

interface Props {
  index: number;
  question: ImportedQuestion;
  approved: boolean;
  regenerating: boolean;
  alternatives: ImportedQuestion[] | null;
  onToggleApprove: () => void;
  onEdit: (updated: ImportedQuestion) => void;
  onRegenerate: () => void;
  onPickAlternative: (q: ImportedQuestion) => void;
  onCancelAlternatives: () => void;
  onRemove: () => void;
}

export function AIGeneratedQuestionCard({
  index,
  question,
  approved,
  regenerating,
  alternatives,
  onToggleApprove,
  onEdit,
  onRegenerate,
  onPickAlternative,
  onCancelAlternatives,
  onRemove,
}: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<ImportedQuestion | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const startEdit = () => {
    setDraft({ ...question, options: [...question.options] });
    setEditing(true);
    setSaveError(null);
  };

  const saveEdit = () => {
    if (!draft) return;
    const opts = draft.options.map((o) => o.trim());
    if (!draft.text.trim()) return setSaveError('Question text is required');
    if (opts.some((o) => !o)) return setSaveError('All options must be filled');
    if (draft.correctIndex < 0 || draft.correctIndex >= opts.length) {
      return setSaveError('Correct answer must be one of the options');
    }
    onEdit({ ...draft, text: draft.text.trim(), options: opts });
    setEditing(false);
  };

  return (
    <div
      className={`card-surface animate-fade-up p-5 transition ${
        !approved ? 'opacity-60' : ''
      }`}
      style={{ animationDelay: `${index * 40}ms` }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2">
          <button
            onClick={onToggleApprove}
            title={approved ? 'Approved — click to reject' : 'Rejected — click to approve'}
            className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border transition ${
              approved
                ? 'border-emerald-500 bg-emerald-500 text-white'
                : 'border-slate-600 bg-surface-900/60 text-transparent hover:border-slate-400'
            }`}
          >
            <IconCheck className="h-3.5 w-3.5" />
          </button>
          <div>
            <p className="font-semibold text-slate-100">
              <span className="mr-1 text-brand-400">{index + 1}.</span> {question.text}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Badge tone={approved ? 'green' : 'slate'}>{approved ? 'Approved' : 'Rejected'}</Badge>
              <Badge tone={difficultyTone[question.difficulty]} className="capitalize">
                {question.difficulty}
              </Badge>
              <Badge tone="slate">{question.topic}</Badge>
            </div>
          </div>
        </div>
        <div className="flex shrink-0 gap-1.5">
          <Button variant="ghost" size="sm" onClick={startEdit} title="Edit this question">
            <IconPencil className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="sm" onClick={onRegenerate} disabled={regenerating} title="Generate alternatives">
            {regenerating ? <Spinner className="h-3.5 w-3.5" /> : <IconRefresh className="h-3.5 w-3.5" />}
          </Button>
          <Button variant="ghost" size="sm" onClick={onRemove} title="Remove this question">
            <IconX className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {question.options.map((o, i) => (
          <span
            key={i}
            className={`rounded-lg px-2.5 py-1 text-xs ${
              i === question.correctIndex
                ? 'bg-green-100 font-bold text-green-700'
                : 'bg-surface-900/60 text-slate-400'
            }`}
          >
            {LETTERS[i]}. {o}
          </span>
        ))}
      </div>
      {question.explanation && (
        <p className="mt-2 text-xs text-slate-500">
          <span className="font-semibold text-slate-400">Why:</span> {question.explanation}
        </p>
      )}

      {editing && draft && (
        <div className="mt-4 rounded-xl border border-white/[0.08] bg-surface-900/60 p-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-400">Edit question</p>
          <textarea
            className="input-field min-h-16"
            value={draft.text}
            onChange={(e) => setDraft({ ...draft, text: e.target.value })}
          />
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {draft.options.map((opt, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-violet-500/10 text-xs font-bold text-brand-300">
                  {LETTERS[i]}
                </span>
                <input
                  className="input-field !py-1.5"
                  value={opt}
                  onChange={(e) => {
                    const next = [...draft.options];
                    next[i] = e.target.value;
                    setDraft({ ...draft, options: next });
                  }}
                />
              </div>
            ))}
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-400">Correct answer</label>
              <select
                className="input-field !py-1.5"
                value={draft.correctIndex}
                onChange={(e) => setDraft({ ...draft, correctIndex: Number(e.target.value) })}
              >
                {draft.options.map((_, i) => (
                  <option key={i} value={i}>
                    {LETTERS[i]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-400">Topic</label>
              <input
                className="input-field !py-1.5"
                value={draft.topic ?? ''}
                onChange={(e) => setDraft({ ...draft, topic: e.target.value })}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-400">Difficulty</label>
              <select
                className="input-field !py-1.5"
                value={draft.difficulty}
                onChange={(e) => setDraft({ ...draft, difficulty: e.target.value as Difficulty })}
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>
          </div>
          <input
            className="input-field mt-3 !py-1.5"
            placeholder="Explanation"
            value={draft.explanation ?? ''}
            onChange={(e) => setDraft({ ...draft, explanation: e.target.value })}
          />
          {saveError && <p className="mt-2 text-xs text-red-600">{saveError}</p>}
          <div className="mt-3 flex gap-2">
            <Button size="sm" onClick={saveEdit}>
              Save
            </Button>
            <Button size="sm" variant="secondary" onClick={() => setEditing(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {alternatives && (
        <div className="animate-fade-in mt-4 rounded-xl border border-brand-700/50 bg-brand-950/20 p-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-brand-300">
            Alternative versions — pick one
          </p>
          <div className="space-y-2">
            {alternatives.map((alt, i) => (
              <button
                key={i}
                onClick={() => onPickAlternative(alt)}
                className="w-full rounded-lg border border-white/[0.08] bg-surface-900/60 px-3 py-2 text-left text-sm text-slate-300 transition hover:border-brand-500 hover:bg-violet-500/10"
              >
                <span className="font-semibold text-brand-300">Option {i + 1}:</span> {alt.text}
              </button>
            ))}
          </div>
          <Button size="sm" variant="ghost" className="mt-2" onClick={onCancelAlternatives}>
            Cancel
          </Button>
        </div>
      )}
    </div>
  );
}