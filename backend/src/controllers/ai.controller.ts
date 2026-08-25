import { Request, Response, NextFunction } from 'express';
import { PDFParse } from 'pdf-parse';
import {
  getAIConfig,
  generateQuestions,
  regenerateQuestion,
  GenerateParams,
  AIGeneratedQuestion,
} from '../services/ai.service.js';
import { DIFFICULTIES, Difficulty } from '../utils/constants.js';

export const MAX_MATERIAL_BYTES = 15 * 1024 * 1024;

export function aiConfig(_req: Request, res: Response) {
  res.json(getAIConfig());
}

export async function generateFromTopic(req: Request, res: Response, next: NextFunction) {
  try {
    const { topic, count, difficulty } = req.body as {
      topic?: string;
      count?: number;
      difficulty?: Difficulty;
    };

    if (!topic || !topic.trim()) {
      return res.status(400).json({ error: 'Topic is required' });
    }
    const diff = difficulty && DIFFICULTIES.includes(difficulty) ? difficulty : 'medium';
    const n = Math.min(Math.max(1, Math.floor(Number(count) || 5)), 20);

    const params: GenerateParams = { topic: topic.trim(), count: n, difficulty: diff };
    const questions = await generateQuestions(params);

    res.json({ questions, generated: questions.length });
  } catch (err) {
    next(err);
  }
}

export async function generateFromMaterial(req: Request, res: Response, next: NextFunction) {
  try {
    const { material, count, difficulty, topic } = req.body as {
      material?: string;
      count?: number;
      difficulty?: Difficulty;
      topic?: string;
    };

    if (!material || !material.trim()) {
      return res.status(400).json({ error: 'Learning material text is required' });
    }
    const diff = difficulty && DIFFICULTIES.includes(difficulty) ? difficulty : 'medium';
    const n = Math.min(Math.max(1, Math.floor(Number(count) || 5)), 20);
    const topicName = topic?.trim() || 'Generated';

    const questions = await generateQuestions({
      topic: topicName,
      count: n,
      difficulty: diff,
      context: material,
    });

    res.json({ questions, generated: questions.length });
  } catch (err) {
    next(err);
  }
}

export async function regenerateQuestionEndpoint(req: Request, res: Response, next: NextFunction) {
  try {
    const { question, count } = req.body as { question?: Partial<AIGeneratedQuestion>; count?: number };

    if (!question || typeof question.text !== 'string' || !question.text.trim()) {
      return res.status(400).json({ error: 'A valid question to regenerate is required' });
    }
    if (!Array.isArray(question.options) || question.options.length < 2) {
      return res.status(400).json({ error: 'Question must include at least 2 options' });
    }

    const base: AIGeneratedQuestion = {
      text: question.text.trim(),
      options: question.options.map((o) => String(o)),
      correctIndex:
        typeof question.correctIndex === 'number' && question.correctIndex >= 0
          ? question.correctIndex
          : 0,
      explanation: typeof question.explanation === 'string' ? question.explanation : '',
      topic: typeof question.topic === 'string' && question.topic.trim() ? question.topic.trim() : 'General',
      difficulty: question.difficulty && DIFFICULTIES.includes(question.difficulty as Difficulty) ? (question.difficulty as Difficulty) : 'medium',
    };

    const n = Math.min(Math.max(1, Math.floor(Number(count) || 3)), 20);
    const variants = await regenerateQuestion({ question: base, count: n });

    res.json({ questions: variants, generated: variants.length });
  } catch (err) {
    next(err);
  }
}

export async function extractMaterialText(req: Request, res: Response, next: NextFunction) {
  try {
    const file = req.file;
    if (!file) return res.status(400).json({ error: 'No file uploaded' });

    const lower = file.originalname.toLowerCase();
    let text = '';
    if (lower.endsWith('.pdf')) {
      const parser = new PDFParse({ data: file.buffer as unknown as Uint8Array });
      const parsed = await parser.getText();
      text = parsed.text ?? '';
    } else if (lower.endsWith('.txt') || lower.endsWith('.md') || lower.endsWith('.csv')) {
      text = file.buffer.toString('utf-8');
    } else {
      return res.status(400).json({ error: 'Unsupported file type. Use .pdf, .txt, .md or .csv' });
    }

    const cleaned = text.replace(/\s+/g, ' ').trim();
    if (!cleaned) {
      return res.status(400).json({ error: 'No readable text found in the file' });
    }

    res.json({ text: cleaned.slice(0, 15000), chars: cleaned.length });
  } catch (err) {
    next(err);
  }
}