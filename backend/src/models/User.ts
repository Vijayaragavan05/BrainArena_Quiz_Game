import { Schema, model } from 'mongoose';
import { USER_ROLES, USER_STATUSES, type UserRole, type UserStatus } from '../utils/constants.js';

export interface IUser {
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  status: UserStatus;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: USER_ROLES, required: true, index: true },
    status: { type: String, enum: USER_STATUSES, required: true, default: 'approved', index: true },
  },
  { timestamps: true },
);

export const User = model<IUser>('User', userSchema);
