import { Schema, model, Types } from 'mongoose';
import { SESSION_STATUSES, type SessionStatus } from '../utils/constants.js';

export interface IQuizSession {
  quiz: Types.ObjectId;
  teacher: Types.ObjectId;
  pin: string;
  status: SessionStatus;
  currentQuestionIndex: number;
  questionStartedAt?: Date;
  startedAt?: Date;
  endedAt?: Date;
  activeUntil?: Date;
  isTeamBattle: boolean;
  teams: Array<{ id: string; name: string; color: string }>;
  createdAt: Date;
  updatedAt: Date;
}

const quizSessionSchema = new Schema<IQuizSession>(
  {
    quiz: { type: Schema.Types.ObjectId, ref: 'Quiz', required: true, index: true },
    teacher: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    pin: { type: String, required: true, unique: true, uppercase: true, index: true },
    status: { type: String, enum: SESSION_STATUSES, required: true, default: 'lobby' },
    currentQuestionIndex: { type: Number, required: true, default: 0 },
    questionStartedAt: { type: Date },
    startedAt: { type: Date },
    endedAt: { type: Date },
    activeUntil: { type: Date },
    isTeamBattle: { type: Boolean, required: true, default: false },
    teams: {
      type: [
        {
          id: { type: String, required: true },
          name: { type: String, required: true },
          color: { type: String, required: true },
        },
      ],
      default: [],
    },
  },
  { timestamps: true },
);

export const QuizSession = model<IQuizSession>('QuizSession', quizSessionSchema);
