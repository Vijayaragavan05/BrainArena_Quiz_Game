import { useTheme } from '../contexts/ThemeContext';
import { IconMoon, IconSun } from './ui/icons';

export function ThemeToggle({ className = '' }: { className?: string }) {
  const { theme, toggle } = useTheme();
  const isLight = theme === 'light';
  return (
    <button
      onClick={toggle}
      aria-label={`Switch to ${isLight ? 'dark' : 'bright'} mode`}
      title={isLight ? 'Switch to dark mode' : 'Switch to bright mode'}
      className={`inline-flex h-9 w-9 items-center justify-center rounded-xl border backdrop-blur transition ${className} ${
        isLight
          ? 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
          : 'border-white/[0.12] bg-white/[0.06] text-slate-300 hover:bg-white/[0.10] hover:text-white'
      }`}
    >
      {isLight ? <IconMoon className="h-4 w-4" /> : <IconSun className="h-4 w-4" />}
    </button>
  );
}
