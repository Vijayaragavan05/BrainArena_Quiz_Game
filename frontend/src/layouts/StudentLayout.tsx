import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Logo } from '../components/ui/Logo';
import { ThemeToggle } from '../components/ThemeToggle';
import { IconArrowLeft, IconLogout } from '../components/ui/icons';

export function StudentLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const showBack = location.pathname !== '/student';

  const initials = (user?.name ?? '?')
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div className="flex min-h-screen flex-col bg-[#0a0a12]">
      <header className="sticky top-0 z-30 border-b border-white/[0.08] bg-[#0a0a12]/70 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-4">
          <div className="flex items-center gap-3">
            {showBack && (
              <button
                onClick={() => navigate('/student')}
                title="Back to dashboard"
                className="rounded-lg p-2 text-slate-400 transition hover:bg-white/[0.06] hover:text-slate-100"
              >
                <IconArrowLeft className="h-4 w-4" />
              </button>
            )}
            <Logo to="/student" size="sm" />
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <div className="hidden text-right sm:block">
              <div className="text-sm font-semibold text-slate-100">{user?.name}</div>
              <div className="text-[11px] text-slate-500 capitalize">{user?.role}</div>
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 text-xs font-bold text-white shadow-[0_0_12px_rgb(139_92_246/0.4)]">
              {initials}
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
      </header>

      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8">
        <Outlet />
      </main>
    </div>
  );
}