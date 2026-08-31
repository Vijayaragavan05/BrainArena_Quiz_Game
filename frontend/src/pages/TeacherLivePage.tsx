import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getSocket } from '../services/socket';
import { IconChart, IconPlay, IconTrophy, IconUsers, IconX } from '../components/ui/icons';
import { Spinner } from '../components/ui/Spinner';
import type {
  QuestionStartPayload,
  QuestionEndPayload,
  LeaderboardRow,
  HostStartedPayload,
} from '../types/socket';

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

type Stage = 'starting' | 'lobby' | 'question' | 'between' | 'complete';

export function TeacherLivePage() {
  const { quizId } = useParams<{ quizId: string }>();
  const { token } = useAuth();
  const navigate = useNavigate();

  const [stage, setStage] = useState<Stage>('starting');
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<HostStartedPayload | null>(null);
  const [participants, setParticipants] = useState<Array<{ studentId: string; name: string }>>([]);
  const [question, setQuestion] = useState<QuestionStartPayload | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [questionEnd, setQuestionEnd] = useState<QuestionEndPayload | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardRow[]>([]);
  const [completedQuizId, setCompletedQuizId] = useState<string | null>(null);

  const socketRef = useRef<ReturnType<typeof getSocket> | null>(null);

  useEffect(() => {
    const socket = getSocket();
    socketRef.current = socket;
    socket.connect();

    const onError = (e: { message: string }) => setError(e.message);

    socket.on('error', onError);
    socket.on('host:started', (p: HostStartedPayload) => {
      setSession(p);
      setStage('lobby');
    });
    socket.on('lobby:update', (p: { participants: Array<{ studentId: string; name: string }> }) =>
      setParticipants(p.participants),
    );
    socket.on('question:start', (q: QuestionStartPayload) => {
      setQuestion(q);
      setQuestionEnd(null);
      setStage('question');
    });
    socket.on('question:end', (e: QuestionEndPayload) => {
      setQuestionEnd(e);
      setStage('between');
    });
    socket.on('leaderboard:update', (lb: { rankings: LeaderboardRow[] }) => setLeaderboard(lb.rankings));
    socket.on('quiz:complete', (c: { quizId: string }) => {
      setCompletedQuizId(c.quizId);
      setStage('complete');
    });

    if (token && quizId) {
      socket.emit('host:start', { token, quizId });
    }

    return () => {
      socket.off('error', onError);
      socket.off('host:started');
      socket.off('lobby:update');
      socket.off('question:start');
      socket.off('question:end');
      socket.off('leaderboard:update');
      socket.off('quiz:complete');
    };
  }, [token, quizId]);

  useEffect(() => {
    if (stage !== 'question' || !question) return;
    const tick = () =>
      setTimeLeft(Math.max(0, Math.ceil((question.durationMs - (Date.now() - question.startedAt)) / 1000)));
    tick();
    const id = setInterval(tick, 200);
    return () => clearInterval(id);
  }, [stage, question]);

  const startQuestion = (index: number) => {
    socketRef.current?.emit('host:start-question', { index });
  };

  const next = () => {
    socketRef.current?.emit('host:next');
  };

  const endQuiz = () => {
    socketRef.current?.emit('host:end');
  };

  const answered = questionEnd ? questionEnd.answerCount : 0;
  const total = session?.totalQuestions ?? 0;

  return (
    <div className="mx-auto max-w-3xl">
      <button onClick={() => navigate('/teacher/quizzes')} className="btn-ghost -ml-3 mb-4">
        ← Back to quizzes
      </button>

      {error && (
        <div className="animate-fade-in mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
          {error}
        </div>
      )}

      {stage === 'starting' && (
        <div className="flex items-center justify-center gap-2 py-16 text-slate-500">
          <Spinner className="h-6 w-6" /> Starting live session…
        </div>
      )}

      {stage === 'lobby' && session && (
        <div className="animate-scale-in card-surface p-10 text-center">
          <h1 className="font-display text-3xl font-bold">{session.quizTitle}</h1>
          <p className="mt-2 text-sm text-slate-400">Share this PIN with your students</p>
          <div className="mx-auto mt-5 w-fit rounded-2xl border border-brand-500/40 bg-surface-900/60 px-10 py-5 font-mono text-6xl font-extrabold tracking-[0.4em] text-brand-400 shadow-glow">
            {session.pin}
          </div>
          <div className="mt-6 flex items-center justify-center gap-2 text-slate-300">
            <IconUsers className="h-5 w-5 text-brand-400" />
            <span>
              <span className="font-bold text-slate-100">{participants.length}/50</span> player(s) joined
            </span>
          </div>
          <div className="mt-3 flex max-h-28 flex-wrap justify-center gap-2 overflow-y-auto">
            {participants.map((p, i) => (
              <span
                key={p.studentId}
                className="animate-fade-in rounded-full border border-white/[0.08] bg-surface-900/60/[0.06] px-3 py-1 text-xs text-slate-300"
                style={{ animationDelay: `${i * 25}ms` }}
              >
                {p.name}
              </span>
            ))}
          </div>
          <button
            onClick={() => startQuestion(0)}
            disabled={participants.length === 0}
            className="btn-primary mt-8 !px-10 !py-3.5 !text-lg"
          >
            <IconPlay className="h-5 w-5" /> Start quiz
          </button>
          <p className="mt-3 text-xs text-slate-400">
            {participants.length === 0 ? 'Waiting for at least one player to join…' : 'Good to go!'}
          </p>
        </div>
      )}

      {stage === 'question' && question && (
        <div className="card-surface animate-scale-in p-8">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-400">
              Question <span className="font-bold text-slate-200">{question.index + 1}</span> of {total}
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
          <h2 className="mt-5 font-display text-xl font-semibold text-white">{question.question.text}</h2>
          {question.question.imageUrl && (
            <div className="mt-4 overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.04]">
              <img src={question.question.imageUrl} alt="Question media" className="max-h-64 w-full object-contain" />
            </div>
          )}
          <div className="mt-5 grid gap-2 sm:grid-cols-2">
            {question.question.options.map((opt, i) => (
              <div
                key={i}
                className="flex items-center gap-2.5 rounded-xl border border-white/[0.08] bg-surface-900/60/[0.06] px-4 py-2.5 text-sm text-slate-300"
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-violet-500/10 text-sm font-bold text-brand-300">
                  {LETTERS[i]}
                </span>
                {opt}
              </div>
            ))}
          </div>
          <div className="mt-6 flex items-center justify-between">
            <button onClick={next} className="btn-secondary">
              End question
            </button>
            <button
              onClick={endQuiz}
              className="inline-flex items-center gap-2 rounded-xl border border-red-900 px-5 py-2.5 font-semibold text-red-600 transition hover:bg-red-50"
            >
              <IconX className="h-4 w-4" /> End quiz
            </button>
          </div>
        </div>
      )}

      {stage === 'between' && questionEnd && (
        <div className="card-surface animate-scale-in p-8">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
            Question {questionEnd.index + 1} results
          </p>
          <p className="mt-3 text-slate-300">
            Correct answer:{' '}
            <span className="font-bold text-green-600">
              {LETTERS[questionEnd.correctIndex]}. {questionEnd.correctAnswerText}
            </span>
          </p>
          <div className="mt-3 flex flex-wrap gap-6 text-sm text-slate-400">
            <span>
              Answered: <span className="font-semibold text-slate-200">{answered}</span>
            </span>
            <span>
              Correct: <span className="font-semibold text-green-600">{questionEnd.correctCount}</span>
            </span>
            <span>
              Players: <span className="font-semibold text-slate-200">{questionEnd.participantCount}</span>
            </span>
          </div>

          <p className="mb-2 mt-6 flex items-center gap-2 text-sm font-semibold text-slate-300">
            <IconTrophy className="h-4 w-4 text-amber-600" /> Leaderboard
          </p>
          <div className="space-y-1.5">
            {leaderboard.map((r) => (
              <div
                key={r.studentId}
                className={`flex items-center justify-between rounded-xl px-4 py-2.5 text-sm text-slate-300 ${
                  r.rank === 1 ? 'border border-amber-500/40 bg-amber-500/10' : 'bg-surface-900/60/[0.06]'
                }`}
              >
                <span className="font-bold">
                  <span className="text-slate-500">#{r.rank}</span> {r.name}
                </span>
                <span>
                  {r.score} pts · {r.correct} correct
                </span>
              </div>
            ))}
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            {questionEnd.index + 1 < total ? (
              <button
                onClick={() => startQuestion(questionEnd.index + 1)}
                className="btn-primary !px-7 !py-2.5"
              >
                <IconPlay className="h-4 w-4" /> Next question
              </button>
            ) : (
              <button
                onClick={endQuiz}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-green-700 px-7 py-2.5 font-semibold text-white transition hover:brightness-110"
              >
                <IconTrophy className="h-4 w-4" /> Finish quiz
              </button>
            )}
            <button
              onClick={endQuiz}
              className="rounded-xl border border-red-900 px-5 py-2.5 font-semibold text-red-600 transition hover:bg-red-50"
            >
              End quiz
            </button>
          </div>
        </div>
      )}

      {stage === 'complete' && (
        <div className="card-surface animate-scale-in p-10 text-center">
          <IconTrophy className="mx-auto h-12 w-12 text-amber-600" />
          <h1 className="mt-4 font-display text-3xl font-bold">Quiz finished!</h1>
          <p className="mt-2 text-sm text-slate-400">Final leaderboard</p>
          <div className="mt-5 space-y-1.5 text-left">
            {leaderboard.map((r) => (
              <div
                key={r.studentId}
                className={`flex items-center justify-between rounded-xl px-4 py-2.5 text-sm text-slate-300 ${
                  r.rank === 1
                    ? 'border border-amber-500/40 bg-amber-500/10'
                    : r.rank === 2
                      ? 'border border-slate-500/40 bg-surface-900/60/[0.06]0/10'
                      : r.rank === 3
                        ? 'border border-orange-700/40 bg-orange-800/10'
                        : 'bg-surface-900/60/[0.06]'
                }`}
              >
                <span className="font-bold">
                  <span className="text-slate-500">#{r.rank}</span> {r.name}
                </span>
                <span>{r.score} pts</span>
              </div>
            ))}
          </div>
          {completedQuizId && (
            <button
              onClick={() => navigate(`/teacher/analytics/${completedQuizId}`)}
              className="btn-primary mt-8 !px-8 !py-3"
            >
              <IconChart className="h-4 w-4" /> View class analytics
            </button>
          )}
        </div>
      )}
    </div>
  );
}