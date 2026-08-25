import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import type { ApiHealth } from '../types';
import { Logo } from '../components/ui/Logo';
import { ThemeToggle } from '../components/ThemeToggle';
import { IconBolt, IconChart, IconTrophy, IconUsers } from '../components/ui/icons';

const FEATURES = [
  {
    icon: IconBolt,
    title: 'Real-time live quizzes',
    desc: 'Host with a 6-digit PIN. Students join instantly and race the clock — server-authoritative scoring, zero lag.',
  },
  {
    icon: IconChart,
    title: 'Why you got that score',
    desc: 'Every result dissected: topic & difficulty breakdowns, speed vs accuracy, what-if scoring, AI insights.',
  },
  {
    icon: IconUsers,
    title: 'Live opponent comparison',
    desc: 'See your rank, accuracy and response time vs every opponent — live, not just at the end.',
  },
  {
    icon: IconTrophy,
    title: 'Grow from every game',
    desc: 'Reports and progress tracking turn every match into a leveling-up moment.',
  },
];

const STEPS = [
  { n: '01', title: 'Create', desc: 'Build by hand, from your bank, CSV, or let AI generate from a topic or PDF — now with images.' },
  { n: '02', title: 'Host', desc: 'Start live. A neon PIN appears — players join in seconds.' },
  { n: '03', title: 'Play', desc: 'Answer against the clock. Feel the arena energy.' },
  { n: '04', title: 'Analyze', desc: 'Deep reports the instant the quiz ends.' },
];

export function HomePage() {
  const [health, setHealth] = useState<ApiHealth | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<ApiHealth>('/health')
      .then((res) => setHealth(res.data))
      .catch((err) => setError(err.response?.data?.error || err.message));
  }, []);

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0a0a12]">
      {/* Neon glows */}
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="absolute -top-32 left-1/2 h-[520px] w-[900px] -translate-x-1/2 rounded-full bg-violet-600/20 blur-[90px]" />
        <div className="absolute top-24 -right-32 h-[400px] w-[600px] rounded-full bg-cyan-500/12 blur-[80px]" />
        <div className="absolute bottom-0 left-0 h-[500px] w-[700px] rounded-full bg-fuchsia-600/08 blur-[90px]" />
      </div>

      <header className="relative z-10 mx-auto flex max-w-6xl items-center justify-between border-b border-white/[0.08] bg-[#0a0a12]/60 px-6 py-5 backdrop-blur-xl">
        <Logo />
        <nav className="flex items-center gap-3">
          <ThemeToggle />
          <Link to="/login" className="btn-ghost">
            Login
          </Link>
          <Link to="/register" className="btn-primary">
            Get started free
          </Link>
        </nav>
      </header>

      <main className="relative z-10 mx-auto max-w-6xl px-6 pb-24">
        <section className="pt-16 text-center md:pt-24">
          <div className="animate-fade-up inline-flex items-center gap-2 rounded-full border border-violet-500/20 bg-violet-500/10 px-4 py-1.5 text-sm font-medium text-violet-300 backdrop-blur">
            <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400 shadow-[0_0_8px_rgb(16_185_129/0.6)]" />
            {error ? 'Backend unreachable — start the server' : health ? `Live · database ${health.database}` : 'Checking backend…'}
          </div>

          <h1 className="animate-fade-up mx-auto mt-6 max-w-3xl font-display text-5xl font-extrabold leading-[1.05] tracking-tight text-white md:text-7xl">
            Enter the <span className="text-gradient">Arena</span>.
          </h1>
          <p className="animate-fade-up mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-slate-400 md:text-xl">
            Kahoot made quizzes fun. <span className="font-semibold text-white">BrainArena</span> makes them
            powerful — live battles, media-rich questions, and analytics that show <em className="text-violet-300 not-italic">why</em> you scored the way you did.
          </p>

          <div className="animate-fade-up mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link to="/register" className="btn-primary !px-8 !py-3.5 !text-base">
              Create your free account
            </Link>
            <Link to="/login" className="btn-secondary !px-8 !py-3.5 !text-base">
              I already have an account
            </Link>
          </div>

          {/* Hero preview — glass card */}
          <div className="animate-scale-in mx-auto mt-14 max-w-3xl rounded-[28px] border border-white/[0.08] bg-white/[0.04] p-2 backdrop-blur-xl">
            <div className="rounded-[20px] border border-white/[0.06] bg-gradient-to-br from-violet-600/20 via-indigo-600/20 to-cyan-500/20 p-8 text-left">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-violet-600 font-display font-extrabold">Q</div>
                <div>
                  <div className="text-sm font-bold text-white">Live question — with image</div>
                  <div className="text-xs text-slate-300">Kahoot-style media + 4 neon answer tiles</div>
                </div>
                <span className="ml-auto rounded-full bg-emerald-500 px-3 py-1 text-xs font-bold text-white">12s</span>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-red-500 p-3 text-sm font-bold text-white">A · Paris</div>
                <div className="rounded-xl bg-blue-500 p-3 text-sm font-bold text-white">B · London</div>
                <div className="rounded-xl bg-amber-500 p-3 text-sm font-bold text-white">C · Rome</div>
                <div className="rounded-xl bg-emerald-500 p-3 text-sm font-bold text-white">D · Berlin</div>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-20 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f, i) => {
            const Icon = f.icon;
            return (
              <div key={f.title} className="card-surface card-hover animate-fade-up p-6" style={{ animationDelay: `${i * 80}ms` }}>
                <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-violet-500/15 text-violet-300 ring-1 ring-violet-500/20">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mb-1.5 font-display text-base font-bold text-white">{f.title}</h3>
                <p className="text-sm leading-relaxed text-slate-400">{f.desc}</p>
              </div>
            );
          })}
        </section>

        <section className="mt-20">
          <h2 className="text-center font-display text-3xl font-bold text-white md:text-4xl">
            From idea to insight in <span className="text-gradient">4 steps</span>
          </h2>
          <div className="mt-10 grid gap-6 md:grid-cols-4">
            {STEPS.map((s, i) => (
              <div key={s.n} className="animate-fade-up relative" style={{ animationDelay: `${i * 100}ms` }}>
                <div className="font-display text-5xl font-extrabold text-white/[0.08]">{s.n}</div>
                <h3 className="mt-2 font-display text-lg font-bold text-white">{s.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-slate-400">{s.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="card-surface animate-fade-up mt-20 overflow-hidden">
          <div className="flex flex-col items-center gap-6 bg-gradient-to-br from-violet-600/20 via-transparent to-cyan-500/10 px-8 py-12 text-center md:flex-row md:justify-between md:text-left">
            <div>
              <h2 className="font-display text-3xl font-bold text-white">Ready to enter the arena?</h2>
              <p className="mt-2 max-w-xl text-slate-400">Join thousands of players turning every quiz into a chance to level up.</p>
            </div>
            <Link to="/register" className="btn-primary shrink-0 !px-8 !py-3.5 !text-base">
              Start playing →
            </Link>
          </div>
        </section>
      </main>

      <footer className="relative z-10 border-t border-white/[0.06] py-6 text-center text-sm text-slate-500">
        BrainArena · Premium Dark Gaming · Media-rich live quizzes
      </footer>
    </div>
  );
}
