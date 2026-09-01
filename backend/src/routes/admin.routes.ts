import { Router, Request, Response } from 'express';
import { User } from '../models/User.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { AppError } from '../middleware/error.js';

const router = Router();
router.use(requireAuth, requireRole('admin'));

// GET /api/admin/users?status=pending&role=teacher
router.get('/users', async (req: Request, res: Response) => {
  const { status, role, q } = req.query as Record<string, string | undefined>;
  const filter: Record<string, unknown> = {};
  if (status) filter.status = status;
  if (role) filter.role = role;
  if (q) filter.$or = [{ name: { $regex: q, $options: 'i' } }, { email: { $regex: q, $options: 'i' } }];
  const users = await User.find(filter).select('-passwordHash').sort({ createdAt: -1 }).lean();
  res.json({ users });
});

router.get('/stats', async (_req: Request, res: Response) => {
  const [total, pending, approved, rejected, teachers, students, admins] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ status: 'pending' }),
    User.countDocuments({ status: 'approved' }),
    User.countDocuments({ status: 'rejected' }),
    User.countDocuments({ role: 'teacher' }),
    User.countDocuments({ role: 'student' }),
    User.countDocuments({ role: 'admin' }),
  ]);
  res.json({ total, pending, approved, rejected, teachers, students, admins });
});

router.post('/users/:id/approve', async (req: Request, res: Response) => {
  const user = await User.findById(req.params.id);
  if (!user) throw new AppError(404, 'User not found');
  (user as any).status = 'approved';
  await user.save();
  const { sendMail, approvedMail } = await import('../utils/mailer.js');
  const { subject, html } = approvedMail(user.name);
  void sendMail(user.email, subject, html);
  res.json({ user: { _id: String(user._id), name: user.name, email: user.email, role: user.role, status: (user as any).status } });
});

router.post('/users/:id/reject', async (req: Request, res: Response) => {
  const user = await User.findById(req.params.id);
  if (!user) throw new AppError(404, 'User not found');
  (user as any).status = 'rejected';
  await user.save();
  const { sendMail, rejectedMail } = await import('../utils/mailer.js');
  const { subject, html } = rejectedMail(user.name);
  void sendMail(user.email, subject, html);
  res.json({ user: { _id: String(user._id), name: user.name, email: user.email, role: user.role, status: (user as any).status } });
});

router.delete('/users/:id', async (req: Request, res: Response) => {
  const user = await User.findById(req.params.id);
  if (!user) throw new AppError(404, 'User not found');
  if (String(user._id) === String((req as any).user._id)) throw new AppError(400, 'Cannot delete yourself');
  await User.findByIdAndDelete(req.params.id);
  res.json({ success: true });
});

export default router;
