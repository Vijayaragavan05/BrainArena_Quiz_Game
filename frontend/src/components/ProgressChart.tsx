import { useState, useEffect } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from 'recharts';

interface ProgressChartProps {
  results: any[]; // StudentResultSummary[]
}

export function ProgressChart({ results }: ProgressChartProps) {
  const [chartData, setChartData] = useState<any[]>([]);

  useEffect(() => {
    if (!results || results.length === 0) return;
    const data = results
      .sort((a, b) => new Date(a.completedAt).getTime() - new Date(b.completedAt).getTime())
      .map((r, i) => ({
        name: `Quiz ${i + 1}`,
        completedAt: new Date(r.completedAt),
        score: r.score,
        accuracy: Math.round(r.accuracy * 100),
        rank: r.rank,
      }));
    setChartData(data);
  }, [results]);

  if (!chartData.length) {
    return (
      <div className="animate-fade-up p-8 text-center text-slate-500">
        <span className="text-3xl">📈</span>
        <p className="mt-2">No quiz results yet — give a live quiz a try!</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-up p-6 rounded-xl border border-white/[0.08] bg-surface-900/60">
      <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-4">
        Performance Progress
      </h2>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis
            dataKey="completedAt"
            stroke="#64748b"
            fontSize={12}
            tickFormatter={(value: Date) => value.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            domain={[0, 100]}
            stroke="#64748b"
            fontSize={12}
            tickFormatter={(v: number) => `${v}%`}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            contentStyle={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 12, color: '#0f172a' }}
            cursor={{ fill: 'rgba(37, 99, 235, 0.06)' }}
          />
          <Legend verticalAlign="bottom" height={36} />
          <Line type="monotone" dataKey="score" name="Score" stroke="#2563eb" fill="#2563eb" strokeWidth={2} />
          <Line type="monotone" dataKey="accuracy" name="Accuracy" stroke="#16a34a" fill="#16a34a" strokeWidth={2} />
          <Line type="monotone" dataKey="rank" name="Rank" stroke="#dc2626" fill="#dc2626" strokeWidth={2} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}