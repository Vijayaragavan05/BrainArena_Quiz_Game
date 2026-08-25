import { useEffect, useState } from 'react';
import type { ReactElement } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { getMyResult } from '../services/results';
import { exportStudentReportPdf } from '../services/export';
import { getErrorMessage } from '../utils/errors';
import type { StudentReportDetail } from '../types/analytics';
import { Badge } from '../components/ui/Badge';
import { Spinner } from '../components/ui/Spinner';
import { IconDownload, IconTarget, IconTrophy } from '../components/ui/icons';

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

const SPEED_LABELS: Record<string, string> = {
  fast_and_accurate: 'Fast & Accurate',
  accurate_but_slow: 'Accurate but Slow',
  fast_but_error_prone: 'Fast but Error-Prone',
  slow_needs_improvement: 'Slow & Needs Improvement',
};

const TYPE_STYLES: Record<string, string> = {
  strength: 'border-green-200/60 bg-green-50 text-green-700',
  practice: 'border-amber-200/60 bg-amber-50 text-amber-700',
  weakness: 'border-red-200/60 bg-red-50 text-red-700',
};

export function StudentResultsPage() {
  const { resultId } = useParams<{ resultId: string }>();
  const [data, setData] = useState<StudentReportDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (!resultId) return;
    getMyResult(resultId)
      .then(setData)
      .catch((err) => setError(getErrorMessage(err, 'Failed to load report')));
  }, [resultId]);

  const handleExport = async () => {
    if (!resultId) return;
    setExporting(true);
    try {
      await exportStudentReportPdf(resultId);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to download PDF'));
    } finally {
      setExporting(false);
    }
  };

  if (error) {
    return (
      <div className="animate-fade-in rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        {error}
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center gap-2 py-16 text-slate-500">
        <Spinner /> Loading report…
      </div>
    );
  }

  const { result, performance, insights, questions } = data;

  return (
    <div>
      <div className="animate-fade-up flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link to="/student/reports" className="text-sm text-slate-400 hover:text-slate-200">
            ← All reports
          </Link>
          <div className="mt-1 flex items-center gap-2">
            <h1 className="font-display text-3xl font-bold">{result.quiz.title}</h1>
            <Badge tone="slate">{result.quiz.topic}</Badge>
          </div>
          <p className="mt-1 text-sm text-slate-500">{new Date(result.completedAt).toLocaleString()}</p>
        </div>
        <button onClick={handleExport} disabled={exporting} className="btn-secondary">
          <IconDownload className="h-4 w-4" />
          {exporting ? 'Preparing…' : 'Download PDF'}
        </button>
      </div>

      {/* Summary cards */}
      <div className="animate-fade-up mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Score" value={String(result.score)} />
        <Stat label="Rank" value={`#${result.rank}`} accent="text-brand-400" icon={IconTrophy} />
        <Stat label="Accuracy" value={`${Math.round(result.accuracy * 100)}%`} />
        <Stat
          label="Avg response"
          value={`${Math.round((result.avgResponseTimeMs / 1000) * 10) / 10}s`}
          icon={IconTarget}
        />
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3 text-center">
        <div className="card-surface p-4">
          <div className="text-2xl font-bold text-green-600">{result.correct}</div>
          <div className="text-xs text-slate-500">Correct</div>
        </div>
        <div className="card-surface p-4">
          <div className="text-2xl font-bold text-red-600">{result.wrong}</div>
          <div className="text-xs text-slate-500">Wrong</div>
        </div>
        <div className="card-surface p-4">
          <div className="text-2xl font-bold text-slate-400">{result.unanswered}</div>
          <div className="text-xs text-slate-500">Unanswered</div>
        </div>
      </div>

      {/* What-if */}
      <div className="card-surface animate-fade-up mt-4 p-6">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-400">What-if analysis</h2>
        <div className="mt-4 flex flex-wrap items-end gap-8">
          <div>
            <div className="text-xs text-slate-500">Actual score</div>
            <div className="text-4xl font-extrabold">{result.score}</div>
          </div>
          <div className="text-slate-400">→</div>
          <div>
            <div className="text-xs text-slate-500">Potential score</div>
            <div className="text-4xl font-extrabold text-amber-600">{result.whatIfScore}</div>
          </div>
          <div>
            <div className="text-xs text-slate-500">Potential improvement</div>
            <div className="text-4xl font-extrabold text-green-600">
              +{Math.max(0, result.whatIfScore - result.score)}
            </div>
          </div>
        </div>
        <p className="mt-4 text-xs text-slate-400">
          Hypothetical: your score if every incorrect or unanswered question had been answered correctly.
        </p>
      </div>

      {/* Speed vs accuracy */}
      <div className="card-surface animate-fade-up mt-4 flex flex-wrap items-center gap-3 p-6">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-400">Speed vs accuracy</h2>
        <Badge tone="brand" className="!px-4 !py-1.5 !text-sm !font-bold">
          {SPEED_LABELS[performance.speedVsAccuracy] ?? performance.speedVsAccuracy}
        </Badge>
        <span className="text-sm text-slate-500">
          {Math.round(result.accuracy * 100)}% accuracy · {Math.round((result.avgResponseTimeMs / 1000) * 10) / 10}s avg
          response
        </span>
      </div>

      {/* Charts */}
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div className="card-surface animate-fade-up p-6">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-400">Topic performance</h2>
          <div className="mt-4 h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={performance.topicPerformance}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="topic" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis domain={[0, 100]} stroke="#64748b" fontSize={12} tickFormatter={(v) => `${v}%`} tickLine={false} axisLine={false} />
                <Tooltip
                  formatter={(v) => [`${v}%`, 'Accuracy']}
                  contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 12 }}
                  cursor={{ fill: 'rgba(99,102,241,0.08)' }}
                />
                <Bar dataKey="accuracy" name="Accuracy %" fill="#6366f1" radius={[6, 6, 0, 0]} maxBarSize={42} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card-surface animate-fade-up p-6">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-400">Difficulty performance</h2>
          <div className="mt-4 h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={performance.difficultyPerformance}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="difficulty" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis domain={[0, 100]} stroke="#64748b" fontSize={12} tickFormatter={(v) => `${v}%`} tickLine={false} axisLine={false} />
                <Tooltip
                  formatter={(v) => [`${v}%`, 'Accuracy']}
                  contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 12 }}
                  cursor={{ fill: 'rgba(34,211,238,0.08)' }}
                />
                <Bar dataKey="accuracy" name="Accuracy %" fill="#22d3ee" radius={[6, 6, 0, 0]} maxBarSize={42} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Insights */}
      <div className="card-surface animate-fade-up mt-4 p-6">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-400">
          Personalized learning insights
        </h2>
        <div className="mt-4 space-y-2">
          {insights.recommendations.length === 0 ? (
            <p className="text-sm text-slate-500">Complete another quiz to generate more insights.</p>
          ) : (
            insights.recommendations.map((r, i) => (
              <div key={i} className={`animate-fade-in rounded-xl border px-4 py-3 text-sm ${TYPE_STYLES[r.type] ?? ''}`}>
                <span className="font-bold">{r.topic}:</span> {r.message}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Question-wise report */}
      <div className="card-surface animate-fade-up mt-4 p-6">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-400">Question-by-question</h2>
        <div className="mt-4 space-y-3">
          {questions.map((q) => (
            <div key={q.questionIndex} className="rounded-xl border border-white/[0.08] bg-surface-900/60/[0.06] p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-semibold">
                  Q{q.questionIndex + 1}. {q.text}
                </span>
                <Badge tone={q.isCorrect ? 'green' : q.selectedIndex === null ? 'slate' : 'red'}>
                  {q.isCorrect ? 'CORRECT' : q.selectedIndex === null ? 'UNANSWERED' : 'WRONG'}
                </Badge>
              </div>
              <div className="mt-3 grid gap-1 sm:grid-cols-2">
                {q.options.map((opt, i) => {
                  const isCorrectOpt = i === q.correctIndex;
                  const isSelected = i === q.selectedIndex;
                  return (
                    <div
                      key={i}
                      className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm ${
                        isCorrectOpt
                          ? 'bg-green-50 text-green-700'
                          : isSelected
                            ? 'bg-red-50 text-red-700'
                            : 'bg-surface-900/60 text-slate-400'
                      }`}
                    >
                      <span className="font-bold">{LETTERS[i]}</span>
                      {opt}
                      {isSelected && <span className="ml-auto text-[10px] uppercase tracking-wide">Yours</span>}
                      {isCorrectOpt && <span className="ml-auto text-[10px] uppercase tracking-wide">Correct</span>}
                    </div>
                  );
                })}
              </div>
              <div className="mt-2 flex flex-wrap gap-4 text-xs text-slate-500">
                <span>
                  Your answer: <b>{q.selectedIndex === null ? '—' : LETTERS[q.selectedIndex]}</b>
                </span>
                <span>
                  Correct: <b>{LETTERS[q.correctIndex]}</b>
                </span>
                <span>
                  Time: <b>{q.responseTimeMs === null ? '—' : `${Math.round((q.responseTimeMs / 1000) * 10) / 10}s`}</b>
                </span>
                <span>
                  Score: <b>{q.score}</b>
                </span>
                {q.answerChanges > 0 && (
                  <span>
                    Answer changed: <b>{q.answerChanges}×</b>
                  </span>
                )}
              </div>
              {q.explanation && (
                <p className="mt-2 rounded-lg bg-slate-900 px-3 py-2 text-xs text-slate-400">💡 {q.explanation}</p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  accent = 'text-slate-100',
  icon: Icon,
}: {
  label: string;
  value: string;
  accent?: string;
  icon?: (p: { className?: string }) => ReactElement;
}) {
  return (
    <div className="card-surface p-5 text-center">
      {Icon && <Icon className="mx-auto mb-1.5 h-5 w-5 text-slate-500" />}
      <div className={`text-3xl font-extrabold ${accent}`}>{value}</div>
      <div className="mt-1 text-xs text-slate-500">{label}</div>
    </div>
  );
}