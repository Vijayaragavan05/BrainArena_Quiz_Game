import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getSocket } from '../services/socket';
import type { QuestionStartPayload, QuestionEndPayload, LeaderboardRow } from '../types/socket';
import { Logo } from '../components/ui/Logo';
import { Badge } from '../components/ui/Badge';
import { Spinner } from '../components/ui/Spinner';
import { ThemeToggle } from '../components/ThemeToggle';
import { IconCheck, IconTrophy, IconUsers, IconSwords } from '../components/ui/icons';

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];
const OPTION_COLORS = [
  'from-red-500/20 to-red-600/10 border-red-500/40 text-red-100',
  'from-blue-500/20 to-blue-600/10 border-blue-500/40 text-blue-100',
  'from-amber-500/20 to-amber-600/10 border-amber-500/40 text-amber-100',
  'from-emerald-500/20 to-emerald-600/10 border-emerald-500/40 text-emerald-100',
  'from-violet-500/20 to-violet-600/10 border-violet-500/40 text-violet-100',
  'from-cyan-500/20 to-cyan-600/10 border-cyan-500/40 text-cyan-100',
];

type Stage = 'joining' | 'lobby' | 'question' | 'between' | 'complete';

export function StudentLivePage() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const pin = new URLSearchParams(window.location.search).get('pin') ?? '';

  const [stage, setStage] = useState<Stage>('joining');
  const [error, setError] = useState<string | null>(null);
  const [participants, setParticipants] = useState<Array<{ studentId: string; name: string }>>([]);
  const [question, setQuestion] = useState<QuestionStartPayload | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [initialIndex, setInitialIndex] = useState<number | null>(null);
  const [changes, setChanges] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [questionEnd, setQuestionEnd] = useState<QuestionEndPayload | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardRow[]>([]);
  const [myRank, setMyRank] = useState<LeaderboardRow | null>(null);
  const [totalScore, setTotalScore] = useState(0);
  const [view, setView] = useState<'board' | 'compare'>('board');

  const socketRef = useRef<ReturnType<typeof getSocket> | null>(null);

  useEffect(() => {
    const socket = getSocket();
    socketRef.current = socket;
    socket.connect();

    const onError = (e: { message: string }) => {
      setError(e.message);
      setStage('complete');
    };

    socket.on('error', onError);
    socket.on('student:joined', () => setStage('lobby'));
    socket.on('lobby:update', (p: { participants: Array<{ studentId: string; name: string }> }) =>
      setParticipants(p.participants),
    );

    socket.on('question:start', (q: QuestionStartPayload) => {
      setQuestion(q);
      setSelected(null);
      setInitialIndex(null);
      setChanges(0);
      setSubmitted(false);
      setQuestionEnd(null);
      setStage('question');
    });

    socket.on('answer:ack', (a: { totalScore: number }) => {
      setSubmitted(true);
      setTotalScore(a.totalScore);
    });

    socket.on('question:end', (e: QuestionEndPayload) => {
      setQuestionEnd(e);
      setStage('between');
    });

    socket.on('leaderboard:update', (lb: { rankings: LeaderboardRow[] }) => {
      setLeaderboard(lb.rankings);
    });

    socket.on('quiz:complete', () => {
      setStage('complete');
    });

    if (token) {
      socket.emit('student:join', { token, pin });
    }

    return () => {
      socket.off('error', onError);
      socket.off('student:joined');
      socket.off('lobby:update');
      socket.off('question:start');
      socket.off('answer:ack');
      socket.off('question:end');
      socket.off('leaderboard:update');
      socket.off('quiz:complete');
    };
  }, [token, pin]);

  useEffect(() => {
    if (stage !== 'question' || !question) return;
    const tick = () => {
      const left = Math.max(0, question.durationMs - (Date.now() - question.startedAt));
      setTimeLeft(Math.ceil(left / 1000));
    };
    tick();
    const id = setInterval(tick, 200);
    return () => clearInterval(id);
  }, [stage, question]);

  useEffect(() => {
    const row = leaderboard.find(
      (r) => r.studentId === JSON.parse(localStorage.getItem('brainarena_user') ?? '{}')._id,
    );
    setMyRank(row ?? null);
  }, [leaderboard]);

  const myId = JSON.parse(localStorage.getItem('brainarena_user') ?? '{}')._id as string;

  const choose = (i: number) => {
    if (submitted) return;
    setSelected((prev) => {
      if (prev === null) {
        setInitialIndex(i);
      } else if (prev !== i) {
        setChanges((c) => c + 1);
      }
      return i;
    });
  };

  const submit = () => {
    if (selected === null || submitted) return;
    socketRef.current?.emit('student:answer', {
      questionIndex: question?.index,
      selectedIndex: selected,
      initialIndex,
      answerChanges: changes,
    });
  };

  if (stage === 'joining') {
    return (
      <Centered>
        <Spinner className="h-8 w-8" />
        <p className="mt-4 text-slate-400">Joining quiz {pin}…</p>
      </Centered>
    );
  }

  if (stage === 'complete') {
    return (
      <Centered>
        <div className="animate-scale-in card-surface w-full max-w-xl p-10 text-center">
          {error ? (
            <div className="animate-fade-in mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
              {error}
            </div>
          ) : (
            <>
              <IconTrophy className="mx-auto h-12 w-12 text-amber-600" />
              <h1 className="mt-4 font-display text-3xl font-bold">Quiz complete!</h1>
              {myRank && (
                <div className="mt-6">
                  <div className="text-xs uppercase tracking-widest text-slate-500">Your rank</div>
                  <div className="text-gradient mt-1 font-display text-6xl font-extrabold">#{myRank.rank}</div>
                  <div className="mt-2 text-slate-300">
                    {myRank.score} points · {myRank.correct} correct · {myRank.wrong} wrong
                  </div>
                </div>
              )}

              <div className="mt-6 text-left">
                <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-300">
                  <IconSwords className="h-4 w-4 text-brand-400" /> Final vs opponents
                </p>
                <div className="max-h-56 space-y-2 overflow-y-auto">
                  {leaderboard
                    .filter((r) => r.studentId !== myId)
                    .map((o) => (
                      <div
                        key={o.studentId}
                        className={`flex items-center justify-between gap-2 rounded-xl border px-4 py-2.5 text-sm ${
                          myRank && myRank.score >= o.score
                            ? 'border-green-200/50 bg-green-50 text-green-200'
                            : 'border-red-200/50 bg-red-50 text-red-200'
                        }`}
                      >
                        <span className="min-w-0 truncate font-semibold">
                          <span className="text-slate-500">#{o.rank}</span> {o.name}
                        </span>
                        <span className="shrink-0">
                          {o.score} pts · {Math.round(o.accuracy * 100)}% · {Math.round(o.avgResponseTimeMs / 100) / 10}s
                        </span>
                        <span className="shrink-0 text-xs font-bold">
                          {myRank && myRank.score >= o.score ? 'You beat ✓' : 'Beat you ✗'}
                        </span>
                      </div>
                    ))}
                  {leaderboard.length <= 1 && (
                    <p className="rounded-xl bg-surface-900/60/[0.06] px-4 py-3 text-sm text-slate-500">
                      No opponents — you were the only player.
                    </p>
                  )}
                </div>
              </div>
            </>
          )}
          <button onClick={() => navigate('/student/reports')} className="btn-primary mt-8 w-full !py-3">
            View full report →
          </button>
        </div>
      </Centered>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-30 border-b border-white/[0.08]/80 bg-surface-900/60/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4">
          <Logo to="/student" size="sm" />
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <span className="rounded-full border border-white/[0.08] bg-surface-900/60 px-3 py-1 font-mono text-sm font-bold tracking-widest text-slate-300">
              {pin}
            </span>
            {totalScore > 0 && (
              <Badge tone="brand" className="!px-3 !py-1 !text-sm !font-bold">
                {totalScore} pts
              </Badge>
            )}
          </div>
        </div>
      </header>

      {stage === 'lobby' && (
        <Centered>
          <div className="animate-scale-in card-surface w-full max-w-md p-10 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500/25 to-green-600/25 text-emerald-300">
              <IconCheck className="h-8 w-8" />
            </div>
            <h1 className="mt-5 font-display text-3xl font-bold">You're in!</h1>
            <p className="mt-2 text-slate-400">Waiting for the teacher to start the quiz…</p>
            <div className="mt-6 flex items-center justify-center gap-2 text-sm text-slate-300">
              <IconUsers className="h-4 w-4 text-brand-400" />
              <span>
                <span className="font-bold text-slate-100">{participants.length}</span> player(s) joined
              </span>
            </div>
            <div className="mt-3 flex max-h-36 flex-wrap justify-center gap-2 overflow-y-auto">
              {participants.map((p, i) => (
                <span
                  key={p.studentId}
                  className="animate-fade-in rounded-full border border-white/[0.08] bg-surface-900/60/[0.06] px-3 py-1 text-xs text-slate-300"
                  style={{ animationDelay: `${i * 30}ms` }}
                >
                  {p.name}
                </span>
              ))}
            </div>
          </div>
        </Centered>
      )}

      {stage === 'question' && question && (
        <div className="flex flex-1 flex-col px-4 py-6">
          <div className="mx-auto w-full max-w-2xl">
            <div className="mb-4 flex items-center justify-between">
              <span className="text-sm text-slate-400">
                Question <span className="font-bold text-slate-200">{question.index + 1}</span> of {question.total}
              </span>
              <span
                className={`rounded-full px-4 py-1.5 font-mono text-lg font-bold tabular-nums ${
                  timeLeft <= 5
                    ? 'animate-pulse bg-red-950 text-red-700'
                    : 'border border-white/[0.08] bg-surface-900/60 text-slate-100'
                }`}
              >
                {timeLeft}s
              </span>
            </div>

            <h2 className="animate-fade-up font-display text-2xl font-semibold leading-snug text-white">
              {question.question.text}
            </h2>

            {question.question.imageUrl && (
              <div className="animate-fade-up mt-4 overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.04]">
                <img src={question.question.imageUrl} alt="Question media" className="max-h-64 w-full object-contain" />
              </div>
            )}

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {question.question.options.map((opt, i) => (
                <button
                  key={i}
                  onClick={() => choose(i)}
                  disabled={submitted}
                  className={`group flex items-center gap-3 rounded-2xl border bg-gradient-to-br px-5 py-4 text-left text-lg font-medium transition ${
                    selected === i
                      ? 'border-brand-500 bg-brand-600 shadow-glow text-white'
                      : `${OPTION_COLORS[i % OPTION_COLORS.length]} hover:-translate-y-0.5`
                  } ${submitted ? 'cursor-not-allowed opacity-70' : ''}`}
                >
                  <span
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl font-bold ${
                      selected === i ? 'bg-surface-900/60/20 text-white' : 'bg-surface-900/60 text-brand-300'
                    }`}
                  >
                    {LETTERS[i]}
                  </span>
                  {opt}
                </button>
              ))}
            </div>

            <div className="mt-6 flex items-center justify-between">
              {changes > 0 && !submitted && (
                <span className="animate-fade-in text-xs text-slate-500">Changed answer {changes} time(s)</span>
              )}
              <button
                onClick={submit}
                disabled={selected === null || submitted}
                className={`ml-auto rounded-2xl px-8 py-3 text-lg font-bold transition ${
                  submitted
                    ? 'bg-emerald-600 text-white'
                    : 'bg-gradient-to-r from-brand-600 to-violet-600 text-white shadow-glow hover:brightness-110 disabled:opacity-40 disabled:shadow-none'
                }`}
              >
                {submitted ? 'Locked in ✓' : 'Submit answer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {stage === 'between' && questionEnd && (
        <Centered>
          <div className="animate-scale-in card-surface w-full max-w-2xl p-8 text-center">
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
              {questionEnd.timeUp ? "Time's up!" : 'Question results'}
            </p>
            <div className="mt-3 text-slate-300">
              Correct answer:{' '}
              <span className="font-bold text-green-600">
                {LETTERS[questionEnd.correctIndex]}. {questionEnd.correctAnswerText}
              </span>
            </div>
            <div className="mt-2 text-sm text-slate-400">
              {questionEnd.correctCount} of {questionEnd.participantCount} answered correctly
            </div>

            <div className="mt-5 flex justify-center gap-2">
              <button
                onClick={() => setView('board')}
                className={`rounded-xl px-4 py-1.5 text-sm font-semibold transition ${
                  view === 'board'
                    ? 'bg-gradient-to-r from-brand-600 to-violet-600 text-white shadow-glow'
                    : 'border border-white/[0.08] text-slate-300 hover:bg-surface-900/60/[0.08]'
                }`}
              >
                <IconUsers className="mr-1 inline h-3.5 w-3.5" /> Leaderboard
              </button>
              <button
                onClick={() => setView('compare')}
                className={`rounded-xl px-4 py-1.5 text-sm font-semibold transition ${
                  view === 'compare'
                    ? 'bg-gradient-to-r from-brand-600 to-violet-600 text-white shadow-glow'
                    : 'border border-white/[0.08] text-slate-300 hover:bg-surface-900/60/[0.08]'
                }`}
              >
                <IconSwords className="mr-1 inline h-3.5 w-3.5" /> Compare vs Opponents
              </button>
            </div>

            {view === 'board' ? (
              <div className="mt-6 text-left">
                <p className="mb-2 text-sm font-semibold text-slate-300">Leaderboard</p>
                <div className="space-y-1.5">
                  {leaderboard.slice(0, 5).map((r) => (
                    <div
                      key={r.studentId}
                      className={`flex items-center justify-between rounded-xl px-4 py-2.5 text-sm ${
                        myRank?.studentId === r.studentId
                          ? 'border border-brand-500 bg-violet-500/10 text-white'
                          : 'bg-surface-900/60/[0.06] text-slate-300'
                      }`}
                    >
                      <span className="font-bold">
                        <span className="text-slate-500">#{r.rank}</span> {r.name}
                      </span>
                      <span>{r.score} pts</span>
                    </div>
                  ))}
                </div>
                {myRank && (
                  <p className="mt-4 text-center text-sm text-slate-300">
                    Your rank: <span className="font-bold text-brand-400">#{myRank.rank}</span>
                  </p>
                )}
              </div>
            ) : (
              <OpponentComparison
                myRank={myRank}
                opponents={leaderboard.filter((r) => r.studentId !== myId)}
              />
            )}

            <p className="mt-6 text-sm text-slate-500">Waiting for the teacher…</p>
          </div>
        </Centered>
      )}
    </div>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-10 text-center">{children}</div>
  );
}

function OpponentComparison({
  myRank,
  opponents,
}: {
  myRank: LeaderboardRow | null;
  opponents: LeaderboardRow[];
}) {
  if (!myRank) return null;
  return (
    <div className="mt-6 text-left">
      <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-300">
        <IconSwords className="h-4 w-4 text-brand-400" /> You vs {opponents.length} opponent(s)
      </p>
      <div className="space-y-2">
        {opponents.length === 0 && (
          <p className="rounded-xl bg-surface-900/60/[0.06] px-4 py-3 text-sm text-slate-500">
            You're the only player — invite friends to battle!
          </p>
        )}
        {opponents.map((o) => (
          <div
            key={o.studentId}
            className="animate-fade-in rounded-xl border border-white/[0.08] bg-surface-900/60/[0.06] p-4"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <span className="text-slate-500">#{o.rank}</span>{' '}
                <span className="font-bold text-slate-100">{o.name}</span>
              </div>
              <span className="text-lg font-extrabold text-brand-300">{o.score} pts</span>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
              <CompareCell
                label="Score"
                you={String(myRank.score)}
                opp={String(o.score)}
                youWon={myRank.score >= o.score}
              />
              <CompareCell
                label="Correct"
                you={String(myRank.correct)}
                opp={String(o.correct)}
                youWon={myRank.correct >= o.correct}
              />
              <CompareCell
                label="Wrong"
                you={String(myRank.wrong)}
                opp={String(o.wrong)}
                youWon={myRank.wrong <= o.wrong}
              />
              <CompareCell
                label="Accuracy"
                you={`${Math.round(myRank.accuracy * 100)}%`}
                opp={`${Math.round(o.accuracy * 100)}%`}
                youWon={myRank.accuracy >= o.accuracy}
              />
              <CompareCell
                label="Avg response"
                you={`${Math.round(myRank.avgResponseTimeMs / 100) / 10}s`}
                opp={`${Math.round(o.avgResponseTimeMs / 100) / 10}s`}
                youWon={myRank.avgResponseTimeMs <= o.avgResponseTimeMs}
              />
              <CompareCell
                label="Unanswered"
                you={String(myRank.unanswered)}
                opp={String(o.unanswered)}
                youWon={myRank.unanswered <= o.unanswered}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CompareCell({
  label,
  you,
  opp,
  youWon,
}: {
  label: string;
  you: string;
  opp: string;
  youWon: boolean;
}) {
  return (
    <div className={`rounded-lg px-2.5 py-1.5 ${youWon ? 'bg-green-50' : 'bg-red-50'}`}>
      <div className="text-[10px] uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-0.5 flex items-center justify-between gap-1 text-slate-300">
        <span className={`font-bold ${youWon ? 'text-green-700' : 'text-red-700'}`}>
          {you}
          {youWon ? ' ✓' : ' ✗'}
        </span>
        <span className="text-[10px] text-slate-400">vs {opp}</span>
      </div>
    </div>
  );
}