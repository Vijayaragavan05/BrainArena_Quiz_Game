import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { applyImport, buildSampleCsv, validateImportFile } from '../services/import';
import { listQuizzes } from '../services/quizzes';
import { getErrorMessage } from '../utils/errors';
import type { ImportReport } from '../services/import';
import type { Quiz } from '../types';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Spinner } from '../components/ui/Spinner';
import { IconCheck, IconDownload, IconFile, IconUpload, IconX } from '../components/ui/icons';

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

export function ImportQuestionsPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const presetQuizId = params.get('targetQuizId') ?? '';

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [report, setReport] = useState<ImportReport | null>(null);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [targetQuizId, setTargetQuizId] = useState(presetQuizId);
  const [saveToBank, setSaveToBank] = useState(!presetQuizId);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);

  useEffect(() => {
    listQuizzes().then(setQuizzes).catch(() => setQuizzes([]));
  }, []);

  const handleFile = async (file: File) => {
    setError(null);
    setDone(null);
    setReport(null);
    setFileName(file.name);
    setBusy(true);
    try {
      const r = await validateImportFile(file);
      setReport(r);
      if (r.valid.length > 0) setSaveToBank(!presetQuizId);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to parse file'));
    } finally {
      setBusy(false);
    }
  };

  const handleDownloadSample = () => {
    const url = URL.createObjectURL(buildSampleCsv());
    const a = document.createElement('a');
    a.href = url;
    a.download = 'brainarena-questions-template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleApply = async () => {
    if (!report || report.valid.length === 0) return;
    setBusy(true);
    setError(null);
    setDone(null);
    try {
      const target = saveToBank ? undefined : targetQuizId;
      const res = await applyImport(report.valid, target);
      setDone(`${res.imported} question(s) imported successfully.`);
      setReport(null);
      setFileName(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (target && presetQuizId) {
        setTimeout(() => navigate(`/teacher/quizzes/${presetQuizId}`), 1200);
      }
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to import questions'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl animate-fade-up">
      <button onClick={() => navigate(-1)} className="btn-ghost -ml-3 mb-4">
        ← Back
      </button>
      <h1 className="font-display text-3xl font-bold">Import Questions</h1>
      <p className="mt-1 text-slate-400">
        Upload a <b className="text-slate-200">.csv</b>, <b className="text-slate-200">.xlsx</b> or{' '}
        <b className="text-slate-200">.xls</b> file. Columns: Question, Option A–F, Correct (letter or index),
        Explanation, Topic, Difficulty.
      </p>

      <div className="card-surface mt-6 flex flex-wrap items-center gap-4 p-6">
        <label className="btn-primary cursor-pointer !px-6 !py-3">
          <IconUpload className="h-4 w-4" />
          {busy ? 'Processing…' : 'Choose file'}
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.txt,.xlsx,.xls"
            className="hidden"
            disabled={busy}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
            }}
          />
        </label>
        <Button variant="secondary" onClick={handleDownloadSample}>
          <IconDownload className="h-4 w-4" /> Download template
        </Button>
        {fileName && (
          <span className="inline-flex items-center gap-2 text-sm text-slate-400">
            <IconFile className="h-4 w-4 text-brand-400" /> {fileName}
          </span>
        )}
      </div>

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

      {report && (
        <>
          <div className="mt-6 flex flex-wrap gap-3">
            <div className="card-surface px-6 py-4">
              <div className="text-2xl font-extrabold">{report.totalRows}</div>
              <div className="text-xs text-slate-500">Rows</div>
            </div>
            <div className="rounded-2xl border border-green-900 bg-green-50 px-6 py-4">
              <div className="text-2xl font-extrabold text-green-600">{report.valid.length}</div>
              <div className="text-xs text-slate-500">Valid</div>
            </div>
            <div className="rounded-2xl border border-red-900 bg-red-50 px-6 py-4">
              <div className="text-2xl font-extrabold text-red-600">{report.errors.length}</div>
              <div className="text-xs text-slate-500">With errors</div>
            </div>
          </div>

          {report.errors.length > 0 && (
            <div className="animate-fade-in mt-4 rounded-2xl border border-red-900 bg-red-950/20 p-5">
              <h3 className="text-xs font-semibold uppercase tracking-widest text-red-700">Errors</h3>
              <ul className="mt-2 space-y-1 text-sm text-red-200">
                {report.errors.map((e, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <IconX className="mt-0.5 h-3.5 w-3.5 shrink-0" /> Row {e.row}: {e.message}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {report.valid.length > 0 && (
            <>
              <div className="card-surface animate-fade-up mt-4 p-5">
                <h3 className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                  Valid questions ({report.valid.length})
                </h3>
                <div className="mt-3 max-h-72 space-y-2 overflow-y-auto pr-1">
                  {report.valid.map((q, i) => (
                    <div key={i} className="rounded-xl border border-white/[0.08] bg-surface-900/60/[0.06] p-3 text-sm">
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-semibold text-slate-200">
                          {q.text}
                          <span className="ml-2 text-xs text-slate-500">
                            {q.topic} · <span className="capitalize">{q.difficulty}</span>
                          </span>
                        </span>
                        <Badge tone="green" className="!text-[10px]">OK</Badge>
                      </div>
                      <div className="mt-1 flex flex-wrap gap-1 text-xs text-slate-400">
                        {q.options.map((o, j) => (
                          <span
                            key={j}
                            className={`rounded px-1.5 py-0.5 ${
                              j === q.correctIndex
                                ? 'bg-green-100 font-bold text-green-700'
                                : 'bg-slate-900 text-slate-400'
                            }`}
                          >
                            {LETTERS[j]}. {o}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="card-surface animate-fade-up mt-4 p-6">
                <h3 className="text-xs font-semibold uppercase tracking-widest text-slate-400">Import into</h3>
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
                <div className="mt-4">
                  <Button
                    onClick={handleApply}
                    disabled={busy || (!saveToBank && !targetQuizId)}
                    className="bg-emerald-600 from-emerald-600 to-emerald-700 hover:brightness-110"
                  >
                    {busy ? <Spinner className="h-4 w-4 border-slate-300" /> : null}
                    {busy ? 'Importing…' : `Import ${report.valid.length} question(s)`}
                  </Button>
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}