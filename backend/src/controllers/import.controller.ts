import { Request, Response, NextFunction } from 'express';
import { Quiz } from '../models/Quiz.js';
import { Question } from '../models/Question.js';
import { QuestionBank } from '../models/QuestionBank.js';
import { buildImportReport, ImportedQuestion } from '../services/import.service.js';

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

export async function validateImport(req: Request, res: Response, next: NextFunction) {
  try {
    const file = req.file;
    if (!file) return res.status(400).json({ error: 'No file uploaded' });
    const report = await buildImportReport(file.buffer, file.originalname);
    res.json({
      report,
      summary: {
        total: report.totalRows,
        valid: report.valid.length,
        errors: report.errors.length,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function applyImport(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as Request & { user: { _id: string } }).user._id;
    const body = (req.body ?? {}) as {
      targetQuizId?: string;
      questions?: ImportedQuestion[];
    };

    const questions = Array.isArray(body.questions) ? body.questions : [];
    if (questions.length === 0) {
      return res.status(400).json({ error: 'No questions to import' });
    }

    const created = await Question.insertMany(
      questions.map((q) => ({
        owner: userId,
        text: q.text,
        options: q.options,
        correctIndex: q.correctIndex,
        explanation: q.explanation ?? '',
        topic: q.topic ?? 'General',
        difficulty: q.difficulty,
        imageUrl: (q as ImportedQuestion).imageUrl ?? '',
        source: 'import',
        status: 'ready',
      })),
    );

    const createdIds = created.map((c) => c._id);

    if (body.targetQuizId) {
      const quiz = await Quiz.findOneAndUpdate(
        { _id: body.targetQuizId, teacher: userId },
        { $push: { questions: { $each: createdIds } } },
        { new: true },
      );
      if (!quiz) {
        await Question.deleteMany({ _id: { $in: createdIds } });
        return res.status(404).json({ error: 'Quiz not found' });
      }
    } else {
      await QuestionBank.findOneAndUpdate(
        { teacher: userId },
        { $push: { questions: { $each: createdIds } }, $setOnInsert: { teacher: userId } },
        { upsert: true },
      );
    }

    res.json({
      imported: createdIds.length,
      questionIds: createdIds.map((id) => id.toString()),
      targetQuizId: body.targetQuizId ?? null,
    });
  } catch (err) {
    next(err);
  }
}