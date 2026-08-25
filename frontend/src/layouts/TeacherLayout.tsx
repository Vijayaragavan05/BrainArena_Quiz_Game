import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Logo } from '../components/ui/Logo';
import { ThemeToggle } from '../components/ThemeToggle';
import { IconBank, IconChart, IconGrid, IconList, IconLogout, IconPlay, IconSparkles } from '../components/ui/icons';

const NAV_ITEMS = [
  { to: '/teacher', label: 'Dashboard', icon: IconGrid, end: true },
  { to: '/teacher/quizzes', label: 'Quizzes', icon: IconList, end: false },
  { to: '/teacher/live', label: 'Live Quiz', icon: IconPlay, end: false },
  { to: '/teacher/question-bank', label: 'Question Bank', icon: IconBank, disabled: false },
  { to: '/teacher/ai', label: 'AI Generation', icon: IconSparkles, disabled: false },
  { to: '/teacher/analytics', label: 'Analytics', icon: IconChart, end: false },
];

export function TeacherLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const initials = (user?.name ?? '?')
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div className="flex min-h-screen bg-[#0a0a12]">
      <aside className="fixed inset-y-0 left-0 z-30 flex w-64 flex-col border-r border-white/[0.08] bg-[#0a0a12]/80 backdrop-blur-xl">
        <div className="flex h-16 items-center justify-between border-b border-white/[0.08] px-5">
          <Logo to="/teacher" />
          <ThemeToggle />
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          <p className="px-3 pb-2 pt-1 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
            Workspace
          </p>
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                    isActive
                      ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-glow'
                      : 'text-slate-400 hover:bg-white/[0.06] hover:text-slate-100'
                  }`
                }
              >
                <Icon className="h-[18px] w-[18px] shrink-0" />
                {item.label}
              </NavLink>
            );
          })}
        </nav>

        <div className="border-t border-white/[0.08] p-3">
          <div className="flex items-center gap-3 rounded-xl bg-white/[0.06] px-2 py-2 backdrop-blur">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 text-xs font-bold text-white shadow-[0_0_12px_rgb(139_92_246/0.4)]">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold text-slate-100">{user?.name}</div>
              <div className="text-[11px] text-slate-500 capitalize">{user?.role}</div>
            </div>
            <button
              onClick={handleLogout}
              title="Logout"
              className="rounded-lg p-2 text-slate-500 transition hover:bg-red-500/10 hover:text-red-400"
            >
              <IconLogout className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      <main className="ml-64 min-w-0 flex-1 px-6 py-8 md:px-10">
        <Outlet />
      </main>
    </div>
  );
}