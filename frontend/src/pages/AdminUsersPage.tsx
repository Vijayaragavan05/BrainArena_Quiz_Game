import { useEffect, useState } from 'react';
import { getAdminUsers, approveUser, rejectUser, deleteUser, type AdminUser } from '../services/admin';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Spinner } from '../components/ui/Spinner';

export function AdminUsersPage({ mode }: { mode: 'pending' | 'all' }) {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');

  const load = async () => {
    setLoading(true);
    const params: Record<string, string> = {};
    if (mode === 'pending') { params.status = 'pending'; params.role = 'teacher'; }
    if (q) params.q = q;
    const list = await getAdminUsers(params);
    setUsers(list);
    setLoading(false);
  };

  useEffect(() => { void load(); }, [mode]);

  const handleApprove = async (id: string) => {
    await approveUser(id);
    setUsers((prev) => prev.map((u) => (u._id === id ? { ...u, status: 'approved' } as AdminUser : u)));
  };
  const handleReject = async (id: string) => {
    await rejectUser(id);
    setUsers((prev) => prev.map((u) => (u._id === id ? { ...u, status: 'rejected' } as AdminUser : u)));
  };
  const handleDelete = async (id: string) => {
    if (!confirm('Delete this user?')) return;
    await deleteUser(id);
    setUsers((prev) => prev.filter((u) => u._id !== id));
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-white">{mode === 'pending' ? 'Pending Teacher Approvals' : 'All Users'}</h1>
          <p className="text-sm text-slate-400">{mode === 'pending' ? 'Teachers must be approved before they can log in and host quizzes.' : 'Search and manage all accounts.'}</p>
        </div>
        <div className="flex gap-2">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name or email" className="input-field w-64 !py-2" />
          <Button variant="secondary" onClick={load}>Search</Button>
        </div>
      </div>

      {loading ? <div className="flex justify-center py-12"><Spinner /></div> : users.length === 0 ? (
        <Card className="p-10 text-center text-slate-400">{mode === 'pending' ? 'No pending teachers — all caught up!' : 'No users found.'}</Card>
      ) : (
        <div className="space-y-2">
          {users.map((u) => (
            <Card key={u._id} className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div className="min-w-0">
                <div className="font-semibold text-white">{u.name} <span className="font-normal text-slate-400">· {u.email}</span></div>
                <div className="mt-1 flex gap-2">
                  <Badge tone={u.role === 'admin' ? 'violet' : u.role === 'teacher' ? 'brand' : 'sky'}>{u.role}</Badge>
                  <Badge tone={u.status === 'approved' ? 'green' : u.status === 'pending' ? 'amber' : 'red'}>{u.status}</Badge>
                  <span className="text-xs text-slate-500">{new Date(u.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
              <div className="flex gap-2">
                {u.status === 'pending' && (
                  <>
                    <Button onClick={() => handleApprove(u._id)}>Approve</Button>
                    <Button variant="secondary" onClick={() => handleReject(u._id)}>Reject</Button>
                  </>
                )}
                {u.status !== 'pending' && u.role !== 'admin' && (
                  <Button variant="ghost" onClick={() => handleDelete(u._id)} className="!text-red-400">Delete</Button>
                )}
                {u.status === 'rejected' && (
                  <Button onClick={() => handleApprove(u._id)}>Approve</Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
