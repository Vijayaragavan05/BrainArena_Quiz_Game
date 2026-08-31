import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getAdminStats, type AdminStats } from '../services/admin';
import { Card } from '../components/ui/Card';
import { Spinner } from '../components/ui/Spinner';

export function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAdminStats().then(setStats).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center py-16"><Spinner /></div>;
  if (!stats) return <p className="text-slate-400">Failed to load.</p>;

  const cards = [
    { label: 'Pending Approvals', value: stats.pending, color: 'text-amber-300', bg: 'from-amber-500/20 to-orange-500/20' },
    { label: 'Total Users', value: stats.total, color: 'text-white', bg: 'from-violet-600/20 to-indigo-600/20' },
    { label: 'Teachers', value: stats.teachers, color: 'text-cyan-300', bg: 'from-cyan-500/20 to-blue-500/20' },
    { label: 'Students', value: stats.students, color: 'text-emerald-300', bg: 'from-emerald-500/20 to-green-500/20' },
    { label: 'Approved', value: stats.approved, color: 'text-emerald-300', bg: '' },
    { label: 'Rejected', value: stats.rejected, color: 'text-red-300', bg: '' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold text-white">Admin Overview</h1>
        <p className="mt-1 text-sm text-slate-400">Approve teachers, manage users, and enforce 50-player quiz capacity.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.slice(0, 4).map((c) => (
          <Card key={c.label} className={`bg-gradient-to-br ${c.bg} p-6`}>
            <div className="text-xs uppercase tracking-widest text-slate-400">{c.label}</div>
            <div className={`mt-2 text-3xl font-extrabold ${c.color}`}>{c.value}</div>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="p-5 text-center">
          <div className="text-sm text-slate-400">Approved</div>
          <div className="text-2xl font-bold text-emerald-300">{stats.approved}</div>
        </Card>
        <Card className="p-5 text-center">
          <div className="text-sm text-slate-400">Rejected</div>
          <div className="text-2xl font-bold text-red-300">{stats.rejected}</div>
        </Card>
        <Card className="p-5 text-center">
          <div className="text-sm text-slate-400">Admins</div>
          <div className="text-2xl font-bold text-amber-300">{stats.admins}</div>
        </Card>
      </div>

      <Card className="p-6">
        <h3 className="font-semibold text-white">Capacity Rule</h3>
        <p className="mt-1 text-sm text-slate-400">Each live quiz allows <span className="font-bold text-white">up to 50 participants</span>. Further joins are rejected with "quiz is full".</p>
        <div className="mt-4 flex gap-3">
          <Link to="/admin/users" className="btn-primary">Review pending teachers ({stats.pending})</Link>
          <Link to="/admin/all" className="btn-secondary">View all users</Link>
        </div>
      </Card>

      <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-200">
        Default admin: <span className="font-mono font-bold">admin@brainarena.local / Admin12345</span> — change via <span className="font-mono">ADMIN_EMAIL / ADMIN_PASSWORD</span> env on Render.
      </div>
    </div>
  );
}
