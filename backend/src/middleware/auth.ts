import { Request, Response, NextFunction } from 'express';
import { User } from '../models/User.js';
import { AppError } from './error.js';
import { verifyToken } from '../utils/jwt.js';
import type { UserRole } from '../utils/constants.js';

export async function requireAuth(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    throw new AppError(401, 'Missing authentication token');
  }

  const token = header.slice(7);
  let payload;
  try {
    payload = verifyToken(token);
  } catch {
    throw new AppError(401, 'Invalid or expired token');
  }

  const user = await User.findById(payload.sub).lean();
  if (!user) {
    throw new AppError(401, 'User no longer exists');
  }

  if ((user as any).status === 'pending') {
    throw new AppError(403, 'Account pending admin approval');
  }
  if ((user as any).status === 'rejected') {
    throw new AppError(403, 'Account rejected');
  }

  req.user = {
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    status: (user as any).status,
  } as any;
  next();
}

export function requireRole(...roles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new AppError(401, 'Authentication required');
    }
    if (!roles.includes(req.user.role)) {
      throw new AppError(403, 'Insufficient permissions');
    }
    next();
  };
}
