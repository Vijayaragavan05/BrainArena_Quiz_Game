import type { ReactNode } from 'react';

type Tone = 'brand' | 'green' | 'amber' | 'red' | 'sky' | 'slate' | 'violet';

interface BadgeProps {
  tone?: Tone;
  children: ReactNode;
  className?: string;
}

const toneClass: Record<Tone, string> = {
  brand: 'border-violet-500/30 bg-violet-500/15 text-violet-300',
  green: 'border-emerald-500/30 bg-emerald-500/15 text-emerald-300',
  amber: 'border-amber-500/30 bg-amber-500/15 text-amber-300',
  red: 'border-red-500/30 bg-red-500/15 text-red-300',
  sky: 'border-cyan-500/30 bg-cyan-500/15 text-cyan-300',
  slate: 'border-white/10 bg-white/[0.06] text-slate-300',
  violet: 'border-fuchsia-500/30 bg-fuchsia-500/15 text-fuchsia-300',
};

export function Badge({ tone = 'slate', children, className = '' }: BadgeProps) {
  return <span className={`chip ${toneClass[tone]} ${className}`}>{children}</span>;
}

export const difficultyTone: Record<string, Tone> = {
  easy: 'green',
  medium: 'amber',
  hard: 'red',
};

export const statusTone: Record<string, Tone> = {
  draft: 'slate',
  published: 'green',
  archived: 'amber',
};