import { Schema, model, Types } from 'mongoose';
import {
  DIFFICULTIES,
  QUIZ_STATUSES,
  DEFAULT_QUESTION_DURATION_SECONDS,
  type Difficulty,
  type QuizStatus,
} from '../utils/constants.js';

export interface IQuiz {
  teacher: Types.ObjectId;
  title: string;
  topic: string;
  description?: string;
  difficulty: Difficulty;
  duration: number;
  questions: Types.ObjectId[];
  status: QuizStatus;
  createdAt: Date;
  updatedAt: Date;
}

const quizSchema = new Schema<IQuiz>(
  {
    teacher: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    topic: { type: String, required: true, trim: true },
    description: { type: String, trim: true, default: '' },
    difficulty: { type: String, enum: DIFFICULTIES, required: true, default: 'medium' },
    duration: {
      type: Number,
      required: true,
      default: DEFAULT_QUESTION_DURATION_SECONDS,
      min: 5,
      max: 300,
    },
    questions: [{ type: Schema.Types.ObjectId, ref: 'Question' }],
    status: { type: String, enum: QUIZ_STATUSES, required: true, default: 'draft' },
  },
  { timestamps: true },
);

quizSchema.index({ teacher: 1, status: 1 });

export const Quiz = model<IQuiz>('Quiz', quizSchema);
