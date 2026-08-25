import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Pie,
  PieChart,
} from 'recharts';
import { getQuizOverview } from '../services/results';
import { exportQuizResultsCsv, exportQuizResultsXlsx } from '../services/export';
import { getErrorMessage } from '../utils/errors';
import type { TeacherQuizOverview } from '../types/analytics';
import { Badge, difficultyTone } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Spinner } from '../components/ui/Spinner';
import { IconDownload } from '../components/ui/icons';

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

export function TeacherAnalyticsDetailPage() {
  const { quizId } = useParams<{ quizId: string }>();
  const [data, setData] = useState<TeacherQuizOverview | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!quizId) return;
    getQuizOverview(quizId)
      .then(setData)
      .catch((err) => setError(getErrorMessage(err, 'Failed to load analytics')));
  }, [quizId]);

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
        <Spinner /> Loading analytics…
      </div>
    );
  }

  const { quiz, totals, questionStats, rankings } = data;

  const pieData = [
    { name: 'Correct', value: rankings.reduce((s, r) => s + r.correct, 0), color: '#22c55e' },
    { name: 'Wrong', value: rankings.reduce((s, r) => s + r.wrong, 0), color: '#ef4444' },
    { name: 'Unanswered', value: rankings.reduce((s, r) => s + r.unanswered, 0), color: '#64748b' },
  ];

  return (
    <div className="animate-fade-up">
      <Link to="/teacher/analytics" className="btn-ghost -ml-3 mb-4">
        ← All quizzes
      </Link>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h1 className="font-display text-3xl font-bold">{quiz.title}</h1>
          <Badge tone={difficultyTone[quiz.difficulty]} className="capitalize">
            {quiz.difficulty}
          </Badge>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => exportQuizResultsCsv(quizId!).catch(() => setError('Failed to export CSV'))}>
            <IconDownload className="h-3.5 w-3.5" /> CSV
          </Button>
          <Button variant="secondary" size="sm" onClick={() => exportQuizResultsXlsx(quizId!).catch(() => setError('Failed to export Excel'))}>
            <IconDownload className="h-3.5 w-3.5" /> Excel
          </Button>
        </div>
      </div>
      <p className="mt-1 text-sm text-slate-500">
        {quiz.topic} · {quiz.difficulty} difficulty
      </p>

      <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-5">
        <Stat label="Participants" value={String(totals.participants)} />
        <Stat label="Avg score" value={String(totals.avgScore)} />
        <Stat label="Highest" value={String(totals.highestScore)} accent="text-green-600" />
        <Stat label="Lowest" value={String(totals.lowestScore)} accent="text-red-600" />
        <Stat label="Avg accuracy" value={`${Math.round(totals.avgAccuracy * 100)}%`} />
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div className="card-surface animate-fade-up p-6">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-400">
            Answer distribution (whole class)
          </h2>
          <div className="mt-3 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={3}>
                  {pieData.map((d) => (
                    <Cell key={d.name} fill={d.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 12 }} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card-surface animate-fade-up p-6">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-400">Class rankings</h2>
          <div className="mt-3 h-56 overflow-y-auto pr-1">
            <table className="w-full text-left text-sm">
              <thead className="text-slate-400">
                <tr>
                  <th className="py-1 pr-2 font-medium">#</th>
                  <th className="py-1 pr-2 font-medium">Student</th>
                  <th className="py-1 pr-2 font-medium">Score</th>
                  <th className="py-1 font-medium">Acc</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {rankings.map((r) => (
                  <tr key={r.rank} className={r.rank === 1 ? 'bg-amber-500/10' : ''}>
                    <td className="py-1.5 pr-2 font-bold text-brand-400">{r.rank}</td>
                    <td className="py-1.5 pr-2">{r.student}</td>
                    <td className="py-1.5 pr-2 font-semibold">{r.score}</td>
                    <td className="py-1.5">{Math.round(r.accuracy * 100)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="card-surface animate-fade-up mt-4 p-6">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-400">Question-wise analysis</h2>
        <div className="mt-3 h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={questionStats.map((q) => ({ name: `Q${q.index + 1}`, ...q }))}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis domain={[0, 100]} stroke="#64748b" fontSize={12} tickFormatter={(v) => `${v}%`} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 12 }} />
              <Legend />
              <Bar dataKey="correctPct" name="Correct %" fill="#22c55e" radius={[4, 4, 0, 0]} maxBarSize={26} />
              <Bar dataKey="wrongPct" name="Wrong %" fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={26} />
              <Bar dataKey="unansweredPct" name="Unanswered %" fill="#64748b" radius={[4, 4, 0, 0]} maxBarSize={26} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card-surface animate-fade-up mt-4 p-6">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-400">Difficult questions</h2>
        <div className="mt-3 space-y-2">
          {questionStats.filter((q) => q.isDifficult).length === 0 ? (
            <p className="text-sm text-slate-500">No difficult questions detected.</p>
          ) : (
            questionStats
              .filter((q) => q.isDifficult)
              .map((q) => (
                <div key={q.qId} className="rounded-xl border border-red-900 bg-red-50 px-4 py-3 text-sm">
                  <span className="font-bold text-red-700">
                    Q{q.index + 1} · {q.text}
                  </span>
                  <span className="ml-3 text-xs text-slate-400">
                    ({q.correctPct}% correct · {q.topic} · {q.difficulty})
                  </span>
                </div>
              ))
          )}
        </div>
        <div className="mt-4 space-y-2">
          {questionStats.map((q, i) => (
            <div key={q.qId} className="animate-fade-in rounded-xl border border-white/[0.08] bg-surface-900/60/[0.06] px-4 py-3 text-sm" style={{ animationDelay: `${i * 40}ms` }}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span>
                  <b>Q{q.index + 1}.</b> {q.text}
                </span>
                <span className="text-xs text-slate-500">
                  {q.topic} · {q.difficulty}
                </span>
              </div>
              <div className="mt-1 flex flex-wrap gap-4 text-xs text-slate-400">
                <span className="text-green-600">{q.correctPct}% correct</span>
                <span className="text-red-600">{q.wrongPct}% wrong</span>
                <span className="text-slate-500">{q.unansweredPct}% unanswered</span>
                <span>avg time {Math.round((q.avgTimeMs / 1000) * 10) / 10}s</span>
                {q.isDifficult && <Badge tone="red">DIFFICULT</Badge>}
              </div>
              <div className="mt-2 flex flex-wrap gap-1">
                {q.optionCounts.map((c, j) => (
                  <span key={j} className="rounded bg-slate-900 px-2 py-0.5 text-[11px] text-slate-400">
                    {LETTERS[j]}: {c}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, accent = 'text-slate-100' }: { label: string; value: string; accent?: string }) {
  return (
    <div className="card-surface p-5 text-center">
      <div className={`text-2xl font-extrabold ${accent}`}>{value}</div>
      <div className="mt-1 text-xs text-slate-500">{label}</div>
    </div>
  );
}