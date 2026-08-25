import { Request, Response } from 'express';
import { z } from 'zod';
import { createSession, findJoinableSession } from '../services/session.service.js';
import { validate } from '../middleware/validate.js';

const createSessionSchema = z.object({
  quizId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid quiz id'),
});

export const validateCreateSession = validate(createSessionSchema);

export async function startSession(req: Request, res: Response): Promise<void> {
  const { quizId } = req.body as z.infer<typeof createSessionSchema>;
  const session = await createSession(String(req.user!._id), quizId);
  res.status(201).json({
    session: {
      sessionId: session._id.toString(),
      pin: session.pin,
      status: session.status,
    },
  });
}

export async function lookupSession(req: Request, res: Response): Promise<void> {
  const pin = String(req.params.pin);
  const info = await findJoinableSession(pin);
  res.json({ session: info });
}