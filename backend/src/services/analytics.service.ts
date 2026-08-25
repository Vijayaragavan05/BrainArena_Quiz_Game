import {
  QuizResult,
  PerformanceAnalysis,
  LearningInsight,
  StudentAnswer,
} from '../models/index.js';
import { SCORING } from '../utils/constants.js';
import type { Difficulty } from '../utils/constants.js';
import { calculateQuestionScore, classifySpeedVsAccuracy } from './scoring.service.js';
import type { QuizSession } from '../models/QuizSession.js';
import type { IStudentAnswer } from '../models/StudentAnswer.js';

export interface LiveQuestionMeta {
  _id: string;
  index: number;
  topic: string;
  difficulty: 'easy' | 'medium' | 'hard';
  text: string;
  options: string[];
  correctIndex: number;
  imageUrl?: string;
}

export interface LiveAnswerInput {
  selectedIndex: number;
  correctIndex: number;
  isCorrect: boolean;
  score: number;
  responseTimeMs: number | null;
  initialIndex: number | null;
  answerChanges: number;
  answeredAt: Date;
}

export interface LiveParticipantData {
  studentId: string;
  name: string;
  score: number;
  correct: number;
  wrong: number;
  unanswered: number;
  totalResponseTimeMs: number;
  answeredCount: number;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

export async function finalizeQuiz(session: InstanceType<typeof QuizSession>, params: {
  questions: LiveQuestionMeta[];
  participants: Map<string, LiveParticipantData>;
  answers: Map<number, Map<string, LiveAnswerInput>>;
  durationMs: number;
}): Promise<{ results: Array<{ participant: string; rank: number; score: number }> }> {
  const { questions, participants, answers, durationMs } = params;
  const sessionId = session._id.toString();
  const quizId = session.quiz.toString();

  const maxScoreFor = (difficulty: Difficulty) =>
    Math.round(SCORING.basePoints * SCORING.difficultyMultiplier[difficulty]);

  const ranked = [...participants.values()].sort(
    (a, b) => b.score - a.score || b.correct - a.correct || a.totalResponseTimeMs - b.totalResponseTimeMs,
  );
  const rankByStudent = new Map<string, number>();
  ranked.forEach((p, i) => rankByStudent.set(p.studentId, i + 1));

  for (const [studentId, p] of participants) {
    const totalQuestions = questions.length;
    const accuracy = p.answeredCount > 0 ? p.correct / totalQuestions : 0;
    const avgResponseTimeMs = p.answeredCount > 0 ? p.totalResponseTimeMs / p.answeredCount : 0;

    let whatIfScore = p.score;
    for (const q of questions) {
      const answer = answers.get(q.index)?.get(studentId);
      if (!answer) {
        whatIfScore += maxScoreFor(q.difficulty);
        continue;
      }
      if (!answer.isCorrect) {
        whatIfScore += calculateQuestionScore({
          isCorrect: true,
          responseTimeMs: answer.responseTimeMs,
          durationMs,
          difficulty: q.difficulty,
        });
      }
    }

    const result = await QuizResult.create({
      session: sessionId,
      student: studentId,
      participant: p.studentId,
      quiz: quizId,
      totalQuestions,
      score: p.score,
      accuracy: round1(accuracy),
      correct: p.correct,
      wrong: p.wrong,
      unanswered: p.unanswered,
      rank: rankByStudent.get(studentId) ?? 0,
      avgResponseTimeMs: Math.round(avgResponseTimeMs),
      whatIfScore,
      completedAt: new Date(),
    });

    const topicMap = new Map<string, { correct: number; total: number }>();
    const difficultyMap = new Map<string, { correct: number; total: number }>();
    const perQuestion: Array<{
      question: string;
      questionIndex: number;
      isCorrect: boolean;
      responseTimeMs: number | null;
      topic: string;
      difficulty: 'easy' | 'medium' | 'hard';
    }> = [];

    for (const q of questions) {
      const t = topicMap.get(q.topic) ?? { correct: 0, total: 0 };
      t.total += 1;
      topicMap.set(q.topic, t);
      const d = difficultyMap.get(q.difficulty) ?? { correct: 0, total: 0 };
      d.total += 1;
      difficultyMap.set(q.difficulty, d);

      const answer = answers.get(q.index)?.get(studentId);
      const isCorrect = answer?.isCorrect ?? false;
      if (isCorrect) {
        t.correct += 1;
        d.correct += 1;
      }

      perQuestion.push({
        question: q._id,
        questionIndex: q.index,
        isCorrect,
        responseTimeMs: answer?.responseTimeMs ?? null,
        topic: q.topic,
        difficulty: q.difficulty,
      });
    }

    const topicPerformance = [...topicMap.entries()].map(([topic, v]) => ({
      topic,
      correct: v.correct,
      total: v.total,
      accuracy: round1(v.total > 0 ? v.correct / v.total : 0),
    }));
    const difficultyPerformance = [...difficultyMap.entries()].map(([difficulty, v]) => ({
      difficulty: difficulty as Difficulty,
      correct: v.correct,
      total: v.total,
      accuracy: round1(v.total > 0 ? v.correct / v.total : 0),
    }));

    await PerformanceAnalysis.create({
      student: studentId,
      quiz: quizId,
      session: sessionId,
      topicPerformance,
      difficultyPerformance,
      speedVsAccuracy: classifySpeedVsAccuracy({ accuracy, avgResponseTimeMs }),
      difficultQuestions: questions.filter((q) => !(answers.get(q.index)?.get(studentId)?.isCorrect)).map((q) => q._id),
      perQuestion,
    });

    const recommendations = buildRecommendations(topicPerformance, topicMap.size);
    await LearningInsight.create({
      student: studentId,
      quiz: quizId,
      session: sessionId,
      recommendations,
    });
  }

  return {
    results: ranked.map((p) => ({
      participant: p.studentId,
      rank: rankByStudent.get(p.studentId) ?? 0,
      score: p.score,
    })),
  };
}

export async function persistAnswer(
  session: InstanceType<typeof QuizSession>,
  params: {
    studentId: string;
    participantId: string;
    questionId: string;
    questionIndex: number;
    question: LiveQuestionMeta;
    answer: LiveAnswerInput;
  },
): Promise<IStudentAnswer> {
  const { studentId, participantId, questionId, questionIndex, question, answer } = params;
  return StudentAnswer.create({
    session: session._id,
    participant: participantId,
    student: studentId,
    quiz: session.quiz,
    question: questionId,
    questionIndex,
    questionSnapshot: { text: question.text, options: question.options },
    selectedIndex: answer.selectedIndex,
    correctIndex: answer.correctIndex,
    isCorrect: answer.isCorrect,
    score: answer.score,
    responseTimeMs: answer.responseTimeMs,
    initialIndex: answer.initialIndex,
    answerChanges: answer.answerChanges,
    answeredAt: answer.answeredAt,
    topic: question.topic,
    difficulty: question.difficulty,
  });
}

function buildRecommendations(
  topicPerformance: Array<{ topic: string; correct: number; total: number; accuracy: number }>,
  topicCount: number,
): Array<{ topic: string; type: 'strength' | 'weakness' | 'practice'; message: string }> {
  const recommendations: Array<{ topic: string; type: 'strength' | 'weakness' | 'practice'; message: string }> = [];

  for (const t of topicPerformance) {
    if (t.total === 0) continue;
    if (t.accuracy >= 0.8) {
      recommendations.push({
        topic: t.topic,
        type: 'strength',
        message: `Your accuracy in ${t.topic} is ${Math.round(t.accuracy * 100)}%. This is a strong area — keep it up.`,
      });
    } else if (t.accuracy < 0.5) {
      recommendations.push({
        topic: t.topic,
        type: 'weakness',
        message: `Your accuracy in ${t.topic} is ${Math.round(t.accuracy * 100)}%. This is significantly below your other topics. Consider reviewing the fundamentals before moving to harder questions.`,
      });
    } else {
      recommendations.push({
        topic: t.topic,
        type: 'practice',
        message: `Your accuracy in ${t.topic} is ${Math.round(t.accuracy * 100)}%. Practice medium-level ${t.topic} questions to solidify this area.`,
      });
    }
  }

  if (recommendations.length === 0 && topicCount > 0) {
    recommendations.push({
      topic: 'General',
      type: 'practice',
      message: 'Take another quiz to generate more specific learning insights.',
    });
  }

  return recommendations;
}