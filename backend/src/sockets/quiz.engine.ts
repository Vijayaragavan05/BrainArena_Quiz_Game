import { Server, Socket } from 'socket.io';
import { Quiz } from '../models/Quiz.js';
import { User } from '../models/User.js';
import { QuizSession } from '../models/QuizSession.js';
import { Participant } from '../models/Participant.js';
import { createSession } from '../services/session.service.js';
import { verifyToken } from '../utils/jwt.js';
import { Types } from 'mongoose';
import { calculateQuestionScore } from '../services/scoring.service.js';
import { finalizeQuiz, persistAnswer, type LiveAnswerInput, type LiveQuestionMeta } from '../services/analytics.service.js';
import type { PopulatedQuiz } from '../types/populated.js';
import { MAX_PARTICIPANTS_PER_QUIZ } from '../utils/constants.js';

const ANSWER_GRACE_MS = 1000;

interface GameParticipant {
  studentId: string;
  name: string;
  score: number;
  correct: number;
  wrong: number;
  unanswered: number;
  totalResponseTimeMs: number;
  answeredCount: number;
  sockets: Set<string>;
  teamId?: string;
  teamName?: string;
}

interface Game {
  sessionId: string;
  quizId: string;
  teacherId: string;
  teacherSocketId: string;
  pin: string;
  status: 'lobby' | 'live' | 'finished';
  isTeamBattle: boolean;
  teams: Array<{ id: string; name: string; color: string }>;
  questions: LiveQuestionMeta[];
  currentIndex: number;
  questionStartedAt: number;
  durationMs: number;
  timer: NodeJS.Timeout | null;
  participants: Map<string, GameParticipant>;
  answers: Map<number, Map<string, LiveAnswerInput>>;
}

const GAMES = new Map<string, Game>();

function roomFor(pin: string): string {
  return `game-${pin}`;
}

function getGameForSocket(socket: Socket): Game | null {
  for (const game of GAMES.values()) {
    if (game.teacherSocketId === socket.id) return game;
    for (const p of game.participants.values()) {
      if (p.sockets.has(socket.id)) return game;
    }
  }
  return null;
}

function broadcastLeaderboard(io: Server, game: Game): void {
  const rankings = [...game.participants.values()]
    .sort((a, b) => b.score - a.score || b.correct - a.correct || a.totalResponseTimeMs - b.totalResponseTimeMs)
    .map((p, i) => ({
      rank: i + 1,
      studentId: p.studentId,
      name: p.name,
      score: p.score,
      correct: p.correct,
      wrong: p.wrong,
      unanswered: p.unanswered,
      accuracy: p.answeredCount > 0 ? Math.round((p.correct / p.answeredCount) * 100) / 100 : 0,
      avgResponseTimeMs: p.answeredCount > 0 ? Math.round(p.totalResponseTimeMs / p.answeredCount) : 0,
      teamId: p.teamId,
      teamName: p.teamName,
    }));
  // Team aggregates for Team Battle
  let teamLeaderboard: Array<{ teamId: string; teamName: string; color: string; score: number; members: number; correct: number }> | undefined;
  if (game.isTeamBattle) {
    const map = new Map<string, { teamId: string; teamName: string; color: string; score: number; members: number; correct: number }>();
    for (const t of game.teams) map.set(t.id, { teamId: t.id, teamName: t.name, color: t.color, score: 0, members: 0, correct: 0 });
    for (const p of game.participants.values()) {
      if (!p.teamId) continue;
      const agg = map.get(p.teamId);
      if (!agg) continue;
      agg.score += p.score;
      agg.members += 1;
      agg.correct += p.correct;
    }
    teamLeaderboard = [...map.values()].sort((a, b) => b.score - a.score);
  }
  io.to(roomFor(game.pin)).emit('leaderboard:update', { rankings, teamLeaderboard, isTeamBattle: game.isTeamBattle });
}

function endQuestion(io: Server, game: Game, timeUp: boolean): void {
  if (!game.questions.length) return;
  const q = game.questions[game.currentIndex];
  if (!game.timer && !timeUp) return;

  if (game.timer) {
    clearTimeout(game.timer);
    game.timer = null;
  }

  const answers = game.answers.get(game.currentIndex) ?? new Map<string, LiveAnswerInput>();
  let correctCount = 0;
  for (const p of game.participants.values()) {
    const a = answers.get(p.studentId);
    if (!a) {
      p.unanswered += 1;
    } else if (a.isCorrect) {
      correctCount += 1;
    }
  }

  io.to(roomFor(game.pin)).emit('question:end', {
    index: game.currentIndex,
    correctIndex: q.correctIndex,
    correctAnswerText: q.options[q.correctIndex],
    answerCount: answers.size,
    correctCount,
    participantCount: game.participants.size,
    timeUp,
  });

  broadcastLeaderboard(io, game);
}

async function finalize(io: Server, game: Game): Promise<void> {
  const session = await QuizSession.findById(game.sessionId);
  if (!session) return;
  session.status = 'finished';
  session.endedAt = new Date();
  await session.save();

  const summary = await finalizeQuiz(session, {
    questions: game.questions,
    participants: game.participants,
    answers: game.answers,
    durationMs: game.durationMs,
  });

  io.to(roomFor(game.pin)).emit('quiz:complete', {
    quizId: game.quizId,
    sessionId: game.sessionId,
    results: summary.results,
  });
}

export function setupQuizSockets(io: Server): void {
  io.on('connection', (socket: Socket) => {
    socket.on('host:start', async (payload: { token: string; quizId: string; isTeamBattle?: boolean }) => {
      try {
        const user = await authenticate(payload.token);
        if (user.role !== 'teacher') {
          return socket.emit('error', { message: 'Only teachers can host a quiz' });
        }

        const quiz = await Quiz.findOne({ _id: payload.quizId, teacher: user._id }).populate('questions');
        if (!quiz) {
          return socket.emit('error', { message: 'Quiz not found' });
        }
        if (quiz.questions.length === 0) {
          return socket.emit('error', { message: 'This quiz has no questions yet' });
        }

        const session = await createSession(String(user._id), payload.quizId, { isTeamBattle: Boolean(payload.isTeamBattle) });
        const populatedQuiz = quiz as unknown as PopulatedQuiz;
        const questions: LiveQuestionMeta[] = populatedQuiz.questions.map((q, index) => ({
          _id: String(q._id),
          index,
          topic: q.topic || 'General',
          difficulty: q.difficulty,
          text: q.text,
          options: q.options,
          correctIndex: q.correctIndex,
          imageUrl: (q as unknown as { imageUrl?: string }).imageUrl ?? '',
        }));

        const game: Game = {
          sessionId: session._id.toString(),
          quizId: quiz._id.toString(),
          teacherId: String(user._id),
          teacherSocketId: socket.id,
          pin: session.pin,
          status: 'lobby',
          isTeamBattle: Boolean((session as any).isTeamBattle),
          teams: ((session as any).teams as Array<{ id: string; name: string; color: string }>) || [],
          questions,
          currentIndex: 0,
          questionStartedAt: 0,
          durationMs: quiz.duration * 1000,
          timer: null,
          participants: new Map(),
          answers: new Map(),
        };
        GAMES.set(game.pin, game);
        await socket.join(roomFor(game.pin));

        socket.emit('host:started', {
          pin: game.pin,
          sessionId: game.sessionId,
          quizTitle: quiz.title,
          totalQuestions: game.questions.length,
          durationMs: game.durationMs,
          isTeamBattle: game.isTeamBattle,
          teams: game.teams,
        });
      } catch (err) {
        socket.emit('error', { message: (err as Error).message });
      }
    });

    socket.on('host:start-question', async (payload: { index: number }) => {
      const game = getGameForSocket(socket);
      if (!game || game.teacherSocketId !== socket.id) {
        return socket.emit('error', { message: 'You are not hosting this quiz' });
      }
      if (game.timer) {
        return socket.emit('error', { message: 'A question is already running' });
      }
      if (payload.index < 0 || payload.index >= game.questions.length) {
        return socket.emit('error', { message: 'Invalid question index' });
      }

      game.status = 'live';
      game.currentIndex = payload.index;
      game.questionStartedAt = Date.now();
      const q = game.questions[payload.index];

      socket.emit('question:start', {
        index: q.index,
        total: game.questions.length,
        question: { text: q.text, options: q.options, imageUrl: q.imageUrl },
        durationMs: game.durationMs,
        startedAt: game.questionStartedAt,
      });
      io.to(roomFor(game.pin)).except(socket.id).emit('question:start', {
        index: q.index,
        total: game.questions.length,
        question: { text: q.text, options: q.options, imageUrl: q.imageUrl },
        durationMs: game.durationMs,
        startedAt: game.questionStartedAt,
      });

      game.timer = setTimeout(() => {
        if (game.timer && GAMES.get(game.pin)) {
          endQuestion(io, game, true);
        }
      }, game.durationMs + ANSWER_GRACE_MS);
    });

    socket.on('host:next', async () => {
      const game = getGameForSocket(socket);
      if (!game || game.teacherSocketId !== socket.id) return;
      endQuestion(io, game, false);
    });

    socket.on('host:end', async () => {
      const game = getGameForSocket(socket);
      if (!game || game.teacherSocketId !== socket.id) return;
      endQuestion(io, game, true);
      await finalize(io, game);
      GAMES.delete(game.pin);
    });

    socket.on('student:join', async (payload: { token?: string; pin: string; name?: string; teamId?: string }) => {
      try {
        const isGuest = !payload.token && payload.name && payload.name.trim().length >= 2;
        const guestName = typeof payload.name === 'string' ? payload.name.trim() : 'Guest';
        let user: { _id: string; name: string; role: string };
        if (isGuest) {
          const guestId = new Types.ObjectId();
          user = { _id: guestId.toString(), name: guestName, role: 'student' };
        } else {
          user = await authenticate(payload.token || '');
          if (user.role !== 'student') {
            return socket.emit('error', { message: 'Only students can join quizzes' });
          }
        }

        const session = await QuizSession.findOne({ pin: payload.pin.trim().toUpperCase() });
        if (!session) {
          return socket.emit('error', { message: 'No quiz is running with this PIN' });
        }
        if (session.status !== 'lobby') {
          return socket.emit('error', { message: 'This quiz has already started' });
        }

        const game = GAMES.get(session.pin);
        if (!game) {
          return socket.emit('error', { message: 'This quiz session is not active' });
        }

        const isNew = !game.participants.has(user._id);
        if (isNew && game.participants.size >= MAX_PARTICIPANTS_PER_QUIZ) {
          return socket.emit('error', { message: `This quiz is full (${MAX_PARTICIPANTS_PER_QUIZ} players max)` });
        }

        let teamId: string | undefined;
        let teamName: string | undefined;
        if (game.isTeamBattle) {
          if (!payload.teamId) return socket.emit('error', { message: 'Please select a team (Team A/B/C/D)' });
          const t = game.teams.find((x) => x.id === payload.teamId);
          if (!t) return socket.emit('error', { message: 'Invalid team' });
          teamId = t.id;
          teamName = t.name;
        }

        const participant = await Participant.findOneAndUpdate(
          { session: session._id, student: user._id },
          { $set: { name: user.name, disconnected: false, teamId, teamName }, $setOnInsert: { joinedAt: new Date() } },
          { upsert: true, returnDocument: 'after' },
        );

        let gp = game.participants.get(user._id);
        if (!gp) {
          gp = {
            studentId: user._id,
            name: user.name,
            score: 0,
            correct: 0,
            wrong: 0,
            unanswered: 0,
            totalResponseTimeMs: 0,
            answeredCount: 0,
            sockets: new Set(),
            teamId,
            teamName,
          };
          game.participants.set(gp.studentId, gp);
        } else {
          (gp as any).teamId = teamId;
          (gp as any).teamName = teamName;
        }
        gp.sockets.add(socket.id);

        await socket.join(roomFor(game.pin));
        socket.emit('student:joined', {
          sessionId: session._id.toString(),
          pin: game.pin,
          participantId: String(participant._id),
          teamId,
          teamName,
        });

        io.to(roomFor(game.pin)).emit('lobby:update', {
          participants: [...game.participants.values()].map((p) => ({
            studentId: p.studentId,
            name: p.name,
            teamId: p.teamId,
            teamName: p.teamName,
          })),
          isTeamBattle: game.isTeamBattle,
          teams: game.teams,
        });
      } catch (err) {
        socket.emit('error', { message: (err as Error).message });
      }
    });

    socket.on('student:answer', async (payload: {
      questionIndex: number;
      selectedIndex: number;
      initialIndex: number | null;
      answerChanges: number;
    }) => {
      try {
        const game = getGameForSocket(socket);
      if (!game) {
        return socket.emit('error', { message: 'You are not in a quiz' });
      }

      let studentId: string | null = null;
      for (const [sid, p] of game.participants) {
        if (p.sockets.has(socket.id)) {
          studentId = sid;
          break;
        }
      }
      if (!studentId) {
        return socket.emit('error', { message: 'Join the quiz before answering' });
      }
      if (!game.timer || game.currentIndex !== payload.questionIndex) {
        return socket.emit('error', { message: 'No question is open right now' });
      }

      const q = game.questions[game.currentIndex];
      const existing = game.answers.get(game.currentIndex)?.get(studentId);
      if (existing) {
        socket.emit('answer:ack', {
          isCorrect: existing.isCorrect,
          score: existing.score,
          totalScore: game.participants.get(studentId)!.score,
          alreadyAnswered: true,
        });
        return;
      }
      if (payload.selectedIndex < 0 || payload.selectedIndex >= q.options.length) {
        return socket.emit('error', { message: 'Invalid answer' });
      }

      const elapsed = Date.now() - game.questionStartedAt;
      const responseTimeMs = Math.min(elapsed, game.durationMs);
      const isCorrect = payload.selectedIndex === q.correctIndex;
      const score = calculateQuestionScore({
        isCorrect,
        responseTimeMs,
        durationMs: game.durationMs,
        difficulty: q.difficulty,
      });

      const answer: LiveAnswerInput = {
        selectedIndex: payload.selectedIndex,
        correctIndex: q.correctIndex,
        isCorrect,
        score,
        responseTimeMs,
        initialIndex: payload.initialIndex ?? null,
        answerChanges: payload.answerChanges ?? 0,
        answeredAt: new Date(),
      };

      if (!game.answers.has(game.currentIndex)) {
        game.answers.set(game.currentIndex, new Map());
      }
      game.answers.get(game.currentIndex)!.set(studentId, answer);

      const gp = game.participants.get(studentId)!;
      gp.score += score;
      if (isCorrect) gp.correct += 1;
      else gp.wrong += 1;
      gp.totalResponseTimeMs += responseTimeMs;
      gp.answeredCount += 1;

      const session = await QuizSession.findById(game.sessionId);
      const participant = await Participant.findOne({ session: game.sessionId, student: studentId });
      if (session && participant) {
        await persistAnswer(session, {
          studentId,
          participantId: String(participant._id),
          questionId: q._id,
          questionIndex: game.currentIndex,
          question: q,
          answer,
        });
        participant.score = gp.score;
        participant.correct = gp.correct;
        participant.wrong = gp.wrong;
        participant.avgResponseTimeMs = Math.round(gp.totalResponseTimeMs / Math.max(1, gp.answeredCount));
        await participant.save();
      }

      socket.emit('answer:ack', {
        isCorrect,
        score,
        totalScore: gp.score,
        alreadyAnswered: false,
      });
      } catch (err) {
        console.error('[socket] student:answer error:', err);
        socket.emit('error', { message: (err as Error).message });
      }
    });

    socket.on('disconnect', () => {
      for (const game of GAMES.values()) {
        if (game.teacherSocketId === socket.id) {
          if (game.timer) clearTimeout(game.timer);
          GAMES.delete(game.pin);
          return;
        }
        for (const [studentId, p] of game.participants) {
          if (p.sockets.delete(socket.id) && p.sockets.size === 0) {
            void Participant.updateOne(
              { session: game.sessionId, student: studentId },
              { $set: { disconnected: true } },
            ).exec();
          }
        }
      }
    });
  });
}

async function authenticate(token: string): Promise<{ _id: string; name: string; role: string }> {
  if (!token) throw new Error('Authentication required');
  const payload = verifyToken(token);
  if (payload.sub.startsWith('guest_')) {
    return { _id: payload.sub, name: 'Guest', role: payload.role };
  }
  const user = await User.findById(payload.sub).lean();
  if (!user) {
    throw new Error('Invalid token');
  }
  return { _id: String(user._id), name: user.name, role: user.role };
}