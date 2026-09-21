import { useState } from 'react';
import type { FormEvent } from 'react';
import type { Question, QuestionInput, Difficulty } from '../types';
import { getErrorMessage } from '../utils/errors';
import { Button } from './ui/Button';

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

interface QuestionFormProps {
  initial?: Question | null;
  onSubmit: (input: QuestionInput) => Promise<void>;
  onCancel: () => void;
}

export function QuestionForm({ initial, onSubmit, onCancel }: QuestionFormProps) {
  const [text, setText] = useState(initial?.text ?? '');
  const [options, setOptions] = useState<string[]>(
    initial ? [...initial.options, '', '', '', ''].slice(0, 4) : ['', '', '', ''],
  );
  const [correctIndex, setCorrectIndex] = useState(initial?.correctIndex ?? 0);
  const [topic, setTopic] = useState(initial?.topic ?? '');
  const [difficulty, setDifficulty] = useState<Difficulty>(initial?.difficulty ?? 'medium');
  const [explanation, setExplanation] = useState(initial?.explanation ?? '');
  const [imageUrl, setImageUrl] = useState(initial?.imageUrl ?? '');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedOptions = options.map((o) => o.trim());
    if (!text.trim()) return setError('Question text is required');
    if (trimmedOptions.some((o) => !o)) return setError('All four options are required');
    if (correctIndex < 0 || correctIndex >= trimmedOptions.length) {
      return setError('Correct answer must be one of the options');
    }

    if (imageUrl.trim()) {
      try {
        new URL(imageUrl.trim());
      } catch {
        return setError('Image URL must be a valid URL or leave it empty');
      }
    }

    setSubmitting(true);
    try {
      await onSubmit({
        text: text.trim(),
        options: trimmedOptions,
        correctIndex,
        topic: topic.trim(),
        difficulty,
        explanation: explanation.trim(),
        imageUrl: imageUrl.trim(),
      });
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to save question'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="animate-scale-in card-surface space-y-4 p-6">
      {error && (
        <div className="animate-fade-in rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
          {error}
        </div>
      )}

      <div>
        <label className="mb-1.5 block text-sm font-medium text-slate-300">Question</label>
        <textarea
          className="input-field min-h-20 resize-y"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Enter the question"
        />
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-slate-300">
           Media — Image URL <span className="font-normal text-slate-500">(shown to players)</span>
        </label>
        <div className="flex gap-2">
          <input
            className="input-field flex-1"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="https://example.com/image.jpg — or leave empty"
          />
          {imageUrl.trim() && (
            <button type="button" onClick={() => setImageUrl('')} className="btn-secondary !px-3">
              Clear
            </button>
          )}
        </div>
        {imageUrl.trim() && (
          <div className="mt-3 overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.04]">
            <img
              src={imageUrl.trim()}
              alt="Question preview"
              className="max-h-48 w-full object-contain"
              onError={(e) => ((e.target as HTMLImageElement).style.display = 'none')}
            />
          </div>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {options.map((opt, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-violet-500/10 text-sm font-bold text-brand-300">
              {LETTERS[i]}
            </span>
            <input
              className="input-field"
              value={opt}
              onChange={(e) => {
                const next = [...options];
                next[i] = e.target.value;
                setOptions(next);
              }}
              placeholder={`Option ${LETTERS[i]}`}
            />
          </div>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-300">Correct answer</label>
          <select
            className="input-field"
            value={correctIndex}
            onChange={(e) => setCorrectIndex(Number(e.target.value))}
          >
            {options.map((_, i) => (
              <option key={i} value={i}>
                {LETTERS[i]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-300">Topic</label>
          <input
            className="input-field"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="e.g. Arrays"
          />
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

      <div>
        <label className="mb-1.5 block text-sm font-medium text-slate-300">
          Explanation <span className="font-normal text-slate-500">(shown in the report after the quiz)</span>
        </label>
        <textarea
          className="input-field min-h-16 resize-y"
          value={explanation}
          onChange={(e) => setExplanation(e.target.value)}
          placeholder="Why is this the correct answer?"
        />
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? 'Saving…' : initial ? 'Save question' : 'Add question'}
        </Button>
      </div>
    </form>
  );
}