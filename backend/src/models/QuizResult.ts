import { Schema, model, Types } from 'mongoose';

export interface IQuizResult {
  session: Types.ObjectId;
  student: Types.ObjectId;
  participant: Types.ObjectId;
  quiz: Types.ObjectId;
  totalQuestions: number;
  score: number;
  accuracy: number;
  correct: number;
  wrong: number;
  unanswered: number;
  rank: number;
  avgResponseTimeMs: number;
  whatIfScore: number;
  completedAt: Date;
  createdAt: Date;
}

const quizResultSchema = new Schema<IQuizResult>(
  {
    session: { type: Schema.Types.ObjectId, ref: 'QuizSession', required: true, index: true },
    student: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    participant: { type: Schema.Types.ObjectId, ref: 'Participant', required: true },
    quiz: { type: Schema.Types.ObjectId, ref: 'Quiz', required: true, index: true },
    totalQuestions: { type: Number, required: true, default: 0 },
    score: { type: Number, required: true, default: 0 },
    accuracy: { type: Number, required: true, default: 0 },
    correct: { type: Number, required: true, default: 0 },
    wrong: { type: Number, required: true, default: 0 },
    unanswered: { type: Number, required: true, default: 0 },
    rank: { type: Number, required: true, default: 0 },
    avgResponseTimeMs: { type: Number, required: true, default: 0 },
    whatIfScore: { type: Number, required: true, default: 0 },
    completedAt: { type: Date, required: true, default: Date.now },
  },
  { timestamps: true },
);

quizResultSchema.index({ student: 1, completedAt: -1 });

export const QuizResult = model<IQuizResult>('QuizResult', quizResultSchema);
