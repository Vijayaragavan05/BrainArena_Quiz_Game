import bcrypt from 'bcryptjs';
import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { User } from '../models/User.js';
import { signToken } from '../utils/jwt.js';
import { validate } from '../middleware/validate.js';
import { requireAuth } from '../middleware/auth.js';
import { AppError } from '../middleware/error.js';

const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().email('A valid email is required'),
  password: z.string().min(8, 'Password must be at least 8 characters').max(100),
  role: z.enum(['teacher', 'student'], { message: 'Role must be teacher or student' }),
});

const loginSchema = z.object({
  email: z.string().email('A valid email is required'),
  password: z.string().min(1, 'Password is required'),
});

const SALT_ROUNDS = 10;

function toAuthResponse(user: { _id: unknown; name: string; email: string; role: string; status: string }) {
  return {
    token: signToken(String(user._id), user.role),
    user: {
      _id: String(user._id),
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
    },
  };
}

const router = Router();

router.post(
  '/register',
  validate(registerSchema),
  async (req: Request, res: Response) => {
    const { name, email, password, role } = req.body as z.infer<typeof registerSchema>;

    const existing = await User.findOne({ email });
    if (existing) {
      throw new AppError(409, 'An account with this email already exists');
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    // Teachers require admin approval; students are auto-approved
    const status = role === 'teacher' ? 'pending' : 'approved';
    const user = await User.create({ name, email, passwordHash, role, status });

    if (status === 'pending') {
      res.status(201).json({
        message: 'Registration successful — awaiting admin approval. You will be able to log in once approved.',
        user: { _id: String(user._id), name: user.name, email: user.email, role: user.role, status: user.status },
      });
      return;
    }

    res.status(201).json(toAuthResponse(user as any));
  },
);

router.post('/login', validate(loginSchema), async (req: Request, res: Response) => {
  const { email, password } = req.body as z.infer<typeof loginSchema>;

  const user = await User.findOne({ email });
  if (!user) {
    throw new AppError(401, 'Invalid email or password');
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    throw new AppError(401, 'Invalid email or password');
  }

  if ((user as any).status === 'pending') {
    throw new AppError(403, 'Your account is pending admin approval');
  }
  if ((user as any).status === 'rejected') {
    throw new AppError(403, 'Your account has been rejected by admin');
  }

  res.json(toAuthResponse(user as any));
});

router.get('/me', requireAuth, (req: Request, res: Response) => {
  res.json({ user: req.user });
});

export default router;
