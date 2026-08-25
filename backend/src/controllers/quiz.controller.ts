import { Request, Response } from 'express';
import { z } from 'zod';
import type { QueryFilter } from 'mongoose';
import { Quiz, type IQuiz } from '../models/Quiz.js';
import { Question } from '../models/Question.js';
import { validate } from '../middleware/validate.js';
import { AppError } from '../middleware/error.js';

const createQuizSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  topic: z.string().min(1, 'Topic is required').max(100),
  description: z.string().max(2000).optional().default(''),
  difficulty: z.enum(['easy', 'medium', 'hard']).default('medium'),
  duration: z.coerce.number().int().min(5).max(300).default(20),
  questions: z.array(z.string()).optional(),
});

const updateQuizSchema = createQuizSchema.partial();

const createQuestionSchema = z.object({
  text: z.string().min(1, 'Question text is required'),
  options: z.array(z.string().min(1)).min(2, 'At least 2 options are required').max(6),
  correctIndex: z.number().int().min(0),
  explanation: z.string().max(2000).optional().default(''),
  topic: z.string().max(100).optional().default(''),
  difficulty: z.enum(['easy', 'medium', 'hard']).default('medium'),
  imageUrl: z.string().url('Invalid image URL').optional().or(z.literal('')).default(''),
});

const updateQuestionSchema = createQuestionSchema.partial();

const idParam = z.object({ id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid id') });
const questionIdParam = idParam.extend({
  qid: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid question id'),
});

export const validateCreateQuiz = validate(createQuizSchema);
export const validateUpdateQuiz = validate(updateQuizSchema);
export const validateCreateQuestion = validate(createQuestionSchema);
export const validateUpdateQuestion = validate(updateQuestionSchema);

function assertOwned(quiz: { teacher: { toString: () => string } }, teacherId: string): void {
  if (quiz.teacher.toString() !== teacherId) {
    throw new AppError(404, 'Quiz not found');
  }
}

async function loadOwnedQuiz(id: string, teacherId: string) {
  const quiz = await Quiz.findById(id).populate('questions');
  if (!quiz || quiz.teacher.toString() !== teacherId) {
    throw new AppError(404, 'Quiz not found');
  }
  return quiz;
}

export async function listQuizzes(req: Request, res: Response): Promise<void> {
  const teacherId = String(req.user!._id);
  const { status } = req.query as { status?: string };

  const query: QueryFilter<IQuiz> = { teacher: teacherId };
  if (status && ['draft', 'published', 'archived'].includes(status)) {
    query.status = status as IQuiz['status'];
  }

  const quizzes = await Quiz.find(query)
    .sort({ updatedAt: -1 })
    .populate('questions');
  res.json({ quizzes });
}

export async function getQuizStats(req: Request, res: Response): Promise<void> {
  const teacherId = String(req.user!._id);
  const quizzes = await Quiz.find({ teacher: teacherId }).select('status questions');

  const stats = {
    total: quizzes.length,
    drafts: quizzes.filter((q) => q.status === 'draft').length,
    published: quizzes.filter((q) => q.status === 'published').length,
    archived: quizzes.filter((q) => q.status === 'archived').length,
    totalQuestions: quizzes.reduce((sum, q) => sum + q.questions.length, 0),
  };
  res.json(stats);
}

export async function getQuiz(req: Request, res: Response): Promise<void> {
  const { id } = idParam.parse(req.params);
  const quiz = await loadOwnedQuiz(id, String(req.user!._id));
  res.json({ quiz });
}

export async function createQuiz(req: Request, res: Response): Promise<void> {
  const teacherId = String(req.user!._id);
  const data = req.body as z.infer<typeof createQuizSchema>;
  const quiz = await Quiz.create({ ...data, teacher: teacherId, status: 'draft' });
  res.status(201).json({ quiz });
}

export async function updateQuiz(req: Request, res: Response): Promise<void> {
  const { id } = idParam.parse(req.params);
  const quiz = await loadOwnedQuiz(id, String(req.user!._id));
  const data = req.body as z.infer<typeof updateQuizSchema>;
  quiz.set(data);
  await quiz.save();
  res.json({ quiz });
}

export async function deleteQuiz(req: Request, res: Response): Promise<void> {
  const { id } = idParam.parse(req.params);
  const quiz = await loadOwnedQuiz(id, String(req.user!._id));
  await quiz.deleteOne();
  res.json({ message: 'Quiz deleted' });
}

export async function duplicateQuiz(req: Request, res: Response): Promise<void> {
  const { id } = idParam.parse(req.params);
  const quiz = await loadOwnedQuiz(id, String(req.user!._id));

  const sourceQuestions = await Question.find({ _id: { $in: quiz.questions } });
  const questionCopies = await Promise.all(
    sourceQuestions.map((q) =>
      Question.create({
        owner: quiz.teacher,
        text: q.text,
        options: q.options,
        correctIndex: q.correctIndex,
        explanation: q.explanation,
        topic: q.topic,
        difficulty: q.difficulty,
        imageUrl: (q as unknown as { imageUrl?: string }).imageUrl ?? '',
        source: q.source,
        status: q.status,
      }),
    ),
  );

  const copy = await Quiz.create({
    teacher: quiz.teacher,
    title: `${quiz.title} (copy)`,
    topic: quiz.topic,
    description: quiz.description,
    difficulty: quiz.difficulty,
    duration: quiz.duration,
    questions: questionCopies.map((q) => q._id),
    status: 'draft',
  });

  res.status(201).json({ quiz: copy });
}

export async function archiveQuiz(req: Request, res: Response): Promise<void> {
  const { id } = idParam.parse(req.params);
  const quiz = await loadOwnedQuiz(id, String(req.user!._id));
  quiz.status = quiz.status === 'archived' ? 'draft' : 'archived';
  await quiz.save();
  res.json({ quiz });
}

export async function addQuestion(req: Request, res: Response): Promise<void> {
  const { id } = idParam.parse(req.params);
  const teacherId = String(req.user!._id);
  const quiz = await loadOwnedQuiz(id, teacherId);
  const data = req.body as z.infer<typeof createQuestionSchema>;

  const question = await Question.create({ ...data, owner: teacherId, source: 'manual', status: 'ready' });
  quiz.questions.push(question._id);
  await quiz.save();
  res.status(201).json({ question });
}

export async function updateQuestion(req: Request, res: Response): Promise<void> {
  const { id, qid } = questionIdParam.parse(req.params);
  const teacherId = String(req.user!._id);
  const quiz = await loadOwnedQuiz(id, teacherId);
  if (!quiz.questions.some((q) => q._id.toString() === qid)) {
    throw new AppError(404, 'Question not in this quiz');
  }

  const question = await Question.findOne({ _id: qid, owner: teacherId });
  if (!question) {
    throw new AppError(404, 'Question not found');
  }
  question.set(req.body as z.infer<typeof updateQuestionSchema>);
  await question.save();
  res.json({ question });
}

export async function removeQuestion(req: Request, res: Response): Promise<void> {
  const { id, qid } = questionIdParam.parse(req.params);
  const quiz = await loadOwnedQuiz(id, String(req.user!._id));
  if (!quiz.questions.some((q) => q._id.toString() === qid)) {
    throw new AppError(404, 'Question not in this quiz');
  }
  quiz.questions = quiz.questions.filter((q) => q._id.toString() !== qid);
  await quiz.save();
  await Question.deleteOne({ _id: qid, owner: String(req.user!._id) });
  res.json({ message: 'Question removed' });
}
