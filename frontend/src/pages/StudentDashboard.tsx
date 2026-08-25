import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { lookupSession } from '../services/sessions';
import { getErrorMessage } from '../utils/errors';
import { Button } from '../components/ui/Button';
import { Spinner } from '../components/ui/Spinner';
import { IconArrowLeft, IconChart, IconTarget } from '../components/ui/icons';

export function StudentDashboard() {
  const { user } = useAuth();

  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<{ quizTitle: string; teacherName: string; pin: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const handleLookup = async (e: FormEvent) => {
    e.preventDefault();
    if (pin.trim().length !== 6) return;
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      const s = await lookupSession(pin.trim());
      setInfo({ quizTitle: s.quizTitle, teacherName: s.teacherName, pin: s.pin });
    } catch (err) {
      setError(getErrorMessage(err, 'No quiz found for this PIN'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col">
      <div className="animate-fade-up text-center">
        <h1 className="font-display text-3xl font-bold">
          Hey, {user?.name.split(' ')[0]} 👋
        </h1>
        <p className="mt-2 text-slate-400">
          Enter the <span className="font-semibold text-slate-200">Game PIN</span> your teacher shared to join a live
          quiz.
        </p>
      </div>

      <div className="animate-fade-up mt-10">
        <form
          onSubmit={handleLookup}
          className="card-surface mx-auto flex w-full max-w-md items-center gap-2 p-2 pl-4"
        >
          <IconTarget className="h-5 w-5 shrink-0 text-brand-400" />
          <input
            value={pin}
            onChange={(e) => {
              setPin(e.target.value.replace(/\D/g, '').slice(0, 6));
              setInfo(null);
              setError(null);
            }}
            placeholder="Game PIN"
            inputMode="numeric"
            autoFocus
            className="w-full bg-transparent text-2xl font-mono font-bold tracking-[0.3em] text-slate-100 outline-none placeholder:text-base placeholder:font-sans placeholder:font-normal placeholder:tracking-normal placeholder:text-slate-500"
          />
          <Button type="submit" size="lg" disabled={pin.length !== 6 || busy} className="shrink-0 !rounded-xl !px-6">
            {busy ? <Spinner className="h-4 w-4 border-slate-300" /> : 'Join'}
          </Button>
        </form>

        {error && (
          <div className="animate-fade-in mx-auto mt-4 max-w-md rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-center text-sm text-red-700">
            {error}
          </div>
        )}

        {info && (
          <div className="animate-scale-in card-surface mx-auto mt-4 max-w-md p-5 text-center">
            <p className="text-sm text-slate-400">
              You're joining <span className="font-semibold text-slate-100">{info.quizTitle}</span>
            </p>
            <p className="mt-1 text-xs text-slate-500">hosted by {info.teacherName}</p>
            <Link to={`/student/join?pin=${info.pin}`} className="btn-primary mt-4 w-full !py-3">
              Enter lobby →
            </Link>
          </div>
        )}
      </div>

      <div className="animate-fade-up mt-auto pt-14">
        <Link to="/student/reports" className="card-surface card-hover group flex items-center justify-between p-5">
          <div className="flex items-center gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500/25 to-violet-500/25 text-brand-300">
              <IconChart className="h-5 w-5" />
            </div>
            <div>
              <div className="font-semibold text-slate-100">My performance reports</div>
              <div className="text-sm text-slate-400">
                Review every quiz you played — topics, difficulties, insights.
              </div>
            </div>
          </div>
          <IconArrowLeft className="h-5 w-5 rotate-180 text-slate-500 transition group-hover:translate-x-1 group-hover:text-brand-400" />
        </Link>
      </div>
    </div>
  );
}