import { Schema, model, Types } from 'mongoose';
import { DIFFICULTIES, type Difficulty } from '../utils/constants.js';

export interface IStudentAnswer {
  session: Types.ObjectId;
  participant: Types.ObjectId;
  student: Types.ObjectId;
  quiz: Types.ObjectId;
  question: Types.ObjectId;
  questionIndex: number;
  questionSnapshot: {
    text: string;
    options: string[];
  };
  selectedIndex: number | null;
  correctIndex: number;
  isCorrect: boolean;
  score: number;
  responseTimeMs: number | null;
  initialIndex: number | null;
  answerChanges: number;
  answeredAt?: Date;
  topic: string;
  difficulty: Difficulty;
  createdAt: Date;
}

const studentAnswerSchema = new Schema<IStudentAnswer>(
  {
    session: { type: Schema.Types.ObjectId, ref: 'QuizSession', required: true, index: true },
    participant: { type: Schema.Types.ObjectId, ref: 'Participant', required: true },
    student: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    quiz: { type: Schema.Types.ObjectId, ref: 'Quiz', required: true, index: true },
    question: { type: Schema.Types.ObjectId, ref: 'Question', required: true },
    questionIndex: { type: Number, required: true },
    questionSnapshot: {
      text: { type: String, required: true },
      options: { type: [String], required: true },
    },
    selectedIndex: { type: Number, default: null },
    correctIndex: { type: Number, required: true },
    isCorrect: { type: Boolean, required: true, default: false },
    score: { type: Number, required: true, default: 0 },
    responseTimeMs: { type: Number, default: null },
    initialIndex: { type: Number, default: null },
    answerChanges: { type: Number, required: true, default: 0 },
    answeredAt: { type: Date },
    topic: { type: String, default: '' },
    difficulty: { type: String, enum: DIFFICULTIES, required: true },
  },
  { timestamps: true },
);

studentAnswerSchema.index({ session: 1, participant: 1, questionIndex: 1 }, { unique: true });
studentAnswerSchema.index({ student: 1, quiz: 1 });

export const StudentAnswer = model<IStudentAnswer>('StudentAnswer', studentAnswerSchema);
