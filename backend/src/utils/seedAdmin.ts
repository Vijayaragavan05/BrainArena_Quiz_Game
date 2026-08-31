import bcrypt from 'bcryptjs';
import { User } from '../models/User.js';

export async function seedAdmin(): Promise<void> {
  const email = process.env.ADMIN_EMAIL || 'admin@brainarena.local';
  const password = process.env.ADMIN_PASSWORD || 'Admin12345';
  const existing = await User.findOne({ email });
  if (existing) return;
  const passwordHash = await bcrypt.hash(password, 10);
  await User.create({ name: 'Admin', email, passwordHash, role: 'admin', status: 'approved' });
  console.log(`[seed] Admin created: ${email} / ${password}`);
}
