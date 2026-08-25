import { Request, Response, NextFunction } from 'express';

export class AppError extends Error {
  public readonly statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
    Error.captureStackTrace(this, this.constructor);
  }
}

export function notFound(req: Request, res: Response, _next: NextFunction): void {
  res.status(404).json({ error: 'Not Found', path: req.originalUrl });
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ error: err.message });
    return;
  }

  if (err instanceof Error && err.name === 'ValidationError') {
    res.status(400).json({ error: err.message });
    return;
  }

  console.error('[error]', err);
  res.status(500).json({ error: 'Internal Server Error' });
}