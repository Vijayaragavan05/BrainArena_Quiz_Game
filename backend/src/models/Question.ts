import { Schema, model, Types } from 'mongoose';
import {
  DIFFICULTIES,
  QUESTION_SOURCES,
  QUESTION_STATUSES,
  type Difficulty,
  type QuestionSource,
  type QuestionStatus,
} from '../utils/constants.js';

export interface IQuestion {
  owner: Types.ObjectId;
  text: string;
  options: string[];
  correctIndex: number;
  explanation?: string;
  topic?: string;
  difficulty: Difficulty;
  imageUrl?: string;
  source: QuestionSource;
  status: QuestionStatus;
  createdAt: Date;
  updatedAt: Date;
}

const questionSchema = new Schema<IQuestion>(
  {
    owner: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    text: { type: String, required: true, trim: true },
    options: {
      type: [String],
      required: true,
      validate: {
        validator: (v: string[]) => Array.isArray(v) && v.length >= 2 && v.length <= 6,
        message: 'A question must have between 2 and 6 options',
      },
    },
    correctIndex: {
      type: Number,
      required: true,
    },
    explanation: { type: String, trim: true, default: '' },
    topic: { type: String, trim: true, default: '' },
    difficulty: { type: String, enum: DIFFICULTIES, required: true, default: 'medium' },
    imageUrl: { type: String, trim: true, default: '' },
    source: { type: String, enum: QUESTION_SOURCES, required: true, default: 'manual' },
    status: { type: String, enum: QUESTION_STATUSES, required: true, default: 'ready' },
  },
  { timestamps: true },
);

questionSchema.index({ owner: 1, topic: 1 });

export const Question = model<IQuestion>('Question', questionSchema);
