import { Request, Response, NextFunction } from 'express';
import { Types } from 'mongoose';
import { Question } from '../models/Question.js';
import { QuestionBank } from '../models/QuestionBank.js';
import { Quiz } from '../models/Quiz.js';
import { DIFFICULTIES, Difficulty } from '../utils/constants.js';

type AuthedRequest = Request & { user: { _id: string } };

async function ensureBank(teacherId: string) {
  return QuestionBank.findOneAndUpdate(
    { teacher: teacherId },
    { $setOnInsert: { teacher: teacherId } },
    { upsert: true, new: true },
  );
}

export async function listBank(req: Request, res: Response, next: NextFunction) {
  try {
    const teacherId = (req as AuthedRequest).user._id;
    const bank = await ensureBank(teacherId);

    const topic = (req.query.topic as string)?.trim();
    const q = (req.query.q as string)?.trim();
    const difficulty = (req.query.difficulty as string)?.trim();

    const filter: Record<string, unknown> = {
      _id: { $in: bank.questions },
      owner: teacherId,
      status: 'ready',
    };
    if (topic) filter.topic = topic;
    if (difficulty && DIFFICULTIES.includes(difficulty as Difficulty)) filter.difficulty = difficulty;
    if (q) filter.text = { $regex: q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' };

    const questions = await Question.find(filter).sort({ createdAt: -1 });

    const total = await Question.countDocuments({ _id: { $in: bank.questions }, owner: teacherId });
    const usedIn = new Map<string, number>();
    const quizzes = await Quiz.find({ teacher: teacherId, status: { $ne: 'archived' } }).select('questions');
    quizzes.forEach((quiz) => {
      quiz.questions.forEach((id) => {
        usedIn.set(id.toString(), (usedIn.get(id.toString()) ?? 0) + 1);
      });
    });

    res.json({
      questions: questions.map((qn) => ({
        ...qn.toObject(),
        usedInQuizzes: usedIn.get(qn._id.toString()) ?? 0,
      })),
      stats: { total },
    });
  } catch (err) {
    next(err);
  }
}

export async function getBankTopics(req: Request, res: Response, next: NextFunction) {
  try {
    const teacherId = (req as AuthedRequest).user._id;
    const bank = await ensureBank(teacherId);
    const topics = await Question.distinct('topic', { _id: { $in: bank.questions }, owner: teacherId });
    res.json({ topics: topics.filter(Boolean).sort() });
  } catch (err) {
    next(err);
  }
}

export async function addToBank(req: Request, res: Response, next: NextFunction) {
  try {
    const teacherId = (req as AuthedRequest).user._id;
    const { text, options, correctIndex, explanation, topic, difficulty, imageUrl } = req.body as {
      text: string;
      options: string[];
      correctIndex: number;
      explanation?: string;
      topic?: string;
      difficulty: Difficulty;
      imageUrl?: string;
    };

    if (!text || !Array.isArray(options) || options.length < 2) {
      return res.status(400).json({ error: 'Question text and at least 2 options are required' });
    }
    if (!Number.isInteger(correctIndex) || correctIndex < 0 || correctIndex >= options.length) {
      return res.status(400).json({ error: 'Correct answer index is out of range' });
    }

    const question = await Question.create({
      owner: teacherId,
      text,
      options,
      correctIndex,
      explanation: explanation ?? '',
      topic: topic ?? 'General',
      difficulty: difficulty ?? 'medium',
      imageUrl: imageUrl ?? '',
      source: 'manual',
      status: 'ready',
    });

    const bank = await ensureBank(teacherId);
    bank.questions.push(question._id);
    await bank.save();

    res.status(201).json({ question });
  } catch (err) {
    next(err);
  }
}

export async function removeFromBank(req: Request, res: Response, next: NextFunction) {
  try {
    const teacherId = (req as AuthedRequest).user._id;
    const { id } = req.params;

    const bank = await ensureBank(teacherId);
    if (!bank.questions.some((qn) => qn.toString() === id)) {
      return res.status(404).json({ error: 'Question not in bank' });
    }

    bank.questions = bank.questions.filter((qn) => qn.toString() !== id);
    await bank.save();

    const quizRefs = await Quiz.find({ teacher: teacherId, questions: new Types.ObjectId(String(id)) }).select('_id');
    const usedInQuizzes = quizRefs.length;
    if (usedInQuizzes === 0) {
      await Question.deleteOne({ _id: id, owner: teacherId });
    }

    res.json({ removed: true });
  } catch (err) {
    next(err);
  }
}

export async function addBankQuestionToQuiz(req: Request, res: Response, next: NextFunction) {
  try {
    const teacherId = (req as AuthedRequest).user._id;
    const { id, quizId } = req.params;

    const quiz = await Quiz.findOne({ _id: quizId, teacher: teacherId });
    if (!quiz) return res.status(404).json({ error: 'Quiz not found' });

    const bank = await ensureBank(teacherId);
    if (!bank.questions.some((qn) => qn.toString() === id)) {
      return res.status(404).json({ error: 'Question not in bank' });
    }
    const question = await Question.findOne({ _id: id, owner: teacherId });
    if (!question) return res.status(404).json({ error: 'Question not found' });

    if (!quiz.questions.some((qn) => qn.toString() === id)) {
      quiz.questions.push(question._id);
      await quiz.save();
    }

    res.json({ added: true, question });
  } catch (err) {
    next(err);
  }
}

export async function addBankToQuiz(req: Request, res: Response, next: NextFunction) {
  try {
    const teacherId = (req as AuthedRequest).user._id;
    const { quizId } = req.params;
    const { questionIds } = req.body as { questionIds?: string[] };

    const ids = Array.isArray(questionIds) ? questionIds : [];
    if (ids.length === 0) return res.status(400).json({ error: 'No questions selected' });

    const quiz = await Quiz.findOne({ _id: quizId, teacher: teacherId });
    if (!quiz) return res.status(404).json({ error: 'Quiz not found' });

    const bank = await ensureBank(teacherId);
    const allowed = new Set(bank.questions.map((qn) => qn.toString()));
    const toAdd = ids.filter((id) => allowed.has(id) && !quiz.questions.some((qn) => qn.toString() === id));

    if (toAdd.length > 0) {
      quiz.questions.push(...toAdd.map((id) => id as unknown as never));
      await quiz.save();
    }

    res.json({ added: toAdd.length });
  } catch (err) {
    next(err);
  }
}