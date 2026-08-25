import { Request, Response } from 'express';
import { QuizResult, PerformanceAnalysis, LearningInsight, StudentAnswer, Quiz, Question } from '../models/index.js';
import { AppError } from '../middleware/error.js';
import type { PopulatedQuiz } from '../types/populated.js';

export async function listMyResults(req: Request, res: Response): Promise<void> {
  const studentId = String(req.user!._id);
  const results = await QuizResult.find({ student: studentId })
    .sort({ completedAt: -1 })
    .populate('quiz', 'title topic difficulty')
    .limit(50);
  res.json({ results });
}

export async function getMyResult(req: Request, res: Response): Promise<void> {
  const studentId = String(req.user!._id);
  const { resultId } = req.params;

  const result = await QuizResult.findOne({ _id: resultId, student: studentId })
    .populate('quiz', 'title topic difficulty duration');
  if (!result) {
    throw new AppError(404, 'Result not found');
  }

  const [performance, insights, answers] = await Promise.all([
    PerformanceAnalysis.findOne({ student: studentId, session: result.session }),
    LearningInsight.findOne({ student: studentId, session: result.session }),
    StudentAnswer.find({ student: studentId, session: result.session }).sort({ questionIndex: 1 }),
  ]);

  const questionIds = answers.map((a) => a.question);
  const questions = await Question.find({ _id: { $in: questionIds } });

  const questionMap = new Map(questions.map((q) => [String(q._id), q]));

  const detail = answers.map((a) => {
    const q = questionMap.get(String(a.question));
    return {
      questionIndex: a.questionIndex,
      text: a.questionSnapshot.text,
      options: a.questionSnapshot.options,
      selectedIndex: a.selectedIndex,
      correctIndex: a.correctIndex,
      isCorrect: a.isCorrect,
      score: a.score,
      responseTimeMs: a.responseTimeMs,
      answerChanges: a.answerChanges,
      topic: a.topic,
      difficulty: a.difficulty,
      explanation: q?.explanation ?? '',
    };
  });

  res.json({ result, performance, insights, questions: detail });
}

export async function listQuizResults(req: Request, res: Response): Promise<void> {
  const teacherId = String(req.user!._id);
  const { quizId } = req.params;

  const quiz = await Quiz.findOne({ _id: quizId, teacher: teacherId });
  if (!quiz) {
    throw new AppError(404, 'Quiz not found');
  }

  const results = await QuizResult.find({ quiz: quizId })
    .populate('student', 'name email')
    .sort({ score: -1 });
  res.json({ results });
}

export async function getQuizOverview(req: Request, res: Response): Promise<void> {
  const teacherId = String(req.user!._id);
  const { quizId } = req.params;

  const quiz = await Quiz.findOne({ _id: quizId, teacher: teacherId }).populate('questions');
  if (!quiz) {
    throw new AppError(404, 'Quiz not found');
  }
  const populatedQuiz = quiz as unknown as PopulatedQuiz;

  const results = await QuizResult.find({ quiz: quizId })
    .populate('student', 'name email')
    .sort({ score: -1 });

  const total = results.length;
  const scores = results.map((r) => r.score);
  const accuracies = results.map((r) => r.accuracy);
  const avgScore = total ? Math.round(scores.reduce((a, b) => a + b, 0) / total) : 0;
  const avgAccuracy = total
    ? Math.round((accuracies.reduce((a, b) => a + b, 0) / total) * 100) / 100
    : 0;

  const perQuestion = populatedQuiz.questions.map((q, index) => ({
    index,
    qId: String(q._id),
    text: q.text,
    topic: q.topic,
    difficulty: q.difficulty,
  }));

  const answers = await StudentAnswer.find({ quiz: quizId });
  const answerByQuestion = new Map<string, typeof answers>();
  for (const a of answers) {
    const key = `${a.questionIndex}`;
    if (!answerByQuestion.has(key)) answerByQuestion.set(key, []);
    answerByQuestion.get(key)!.push(a);
  }

  const questionStats = perQuestion.map((pq) => {
    const q = populatedQuiz.questions[pq.index];
    const list = answerByQuestion.get(`${pq.index}`) ?? [];
    let correct = 0;
    let wrong = 0;
    let unanswered = 0;
    const times: number[] = [];
    const optionCounts = new Array<number>(q.options.length).fill(0);

    for (const a of list) {
      if (a.selectedIndex === null) {
        unanswered += 1;
      } else if (a.selectedIndex === q.correctIndex) {
        correct += 1;
      } else {
        wrong += 1;
      }
      if (a.selectedIndex !== null) optionCounts[a.selectedIndex] += 1;
      if (a.responseTimeMs !== null) times.push(a.responseTimeMs);
    }

    const answered = list.length;
    const correctPct = answered ? Math.round((correct / answered) * 100) : 0;
    const wrongPct = answered ? Math.round((wrong / answered) * 100) : 0;
    const unansweredPct = total ? Math.round((unanswered / total) * 100) : 0;
    const avgTimeMs = times.length ? Math.round(times.reduce((a, b) => a + b, 0) / times.length) : 0;

    return {
      index: pq.index,
      qId: pq.qId,
      text: pq.text,
      topic: pq.topic,
      difficulty: pq.difficulty,
      correctCount: correct,
      wrongCount: wrong,
      unansweredCount: unanswered,
      correctPct,
      wrongPct,
      unansweredPct,
      avgTimeMs,
      optionCounts,
      isDifficult: correctPct < 40,
    };
  });

  const responseTimes = results.flatMap((r) => [r.avgResponseTimeMs]);

  res.json({
    quiz: { _id: quiz._id, title: quiz.title, topic: quiz.topic, difficulty: quiz.difficulty },
    totals: {
      participants: total,
      avgScore,
      highestScore: total ? Math.max(...scores) : 0,
      lowestScore: total ? Math.min(...scores) : 0,
      avgAccuracy,
    },
    questionStats,
    rankings: results.map((r, i) => ({
      rank: i + 1,
      student: (r.student as unknown as { name?: string; email?: string }).name ?? 'Student',
      email: (r.student as unknown as { email?: string }).email ?? '',
      score: r.score,
      accuracy: r.accuracy,
      correct: r.correct,
      wrong: r.wrong,
      unanswered: r.unanswered,
      avgResponseTimeMs: r.avgResponseTimeMs,
    })),
    responseTimes,
  });
}