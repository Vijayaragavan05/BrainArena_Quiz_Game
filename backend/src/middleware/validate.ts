import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { AppError } from './error.js';

export function validate(schema: z.ZodTypeAny) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const messages = result.error.issues.map((i) => i.message).join('; ');
      throw new AppError(400, messages);
    }
    req.body = result.data;
    next();
  };
}
