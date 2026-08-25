import { Schema, model, Types } from 'mongoose';
import {
  DIFFICULTIES,
  SPEED_ACCURACY_TYPES,
  type Difficulty,
  type SpeedAccuracyType,
} from '../utils/constants.js';

export interface ITopicPerformance {
  topic: string;
  correct: number;
  total: number;
  accuracy: number;
}

export interface IDifficultyPerformance {
  difficulty: Difficulty;
  correct: number;
  total: number;
  accuracy: number;
}

export interface IPerQuestion {
  question: Types.ObjectId;
  questionIndex: number;
  isCorrect: boolean;
  responseTimeMs: number | null;
  topic: string;
  difficulty: Difficulty;
}

export interface IPerformanceAnalysis {
  student: Types.ObjectId;
  quiz: Types.ObjectId;
  session: Types.ObjectId;
  topicPerformance: ITopicPerformance[];
  difficultyPerformance: IDifficultyPerformance[];
  speedVsAccuracy: SpeedAccuracyType;
  difficultQuestions: Types.ObjectId[];
  perQuestion: IPerQuestion[];
  createdAt: Date;
  updatedAt: Date;
}

const topicPerformanceSchema = new Schema<ITopicPerformance>(
  {
    topic: { type: String, required: true },
    correct: { type: Number, required: true, default: 0 },
    total: { type: Number, required: true, default: 0 },
    accuracy: { type: Number, required: true, default: 0 },
  },
  { _id: false },
);

const difficultyPerformanceSchema = new Schema<IDifficultyPerformance>(
  {
    difficulty: { type: String, enum: DIFFICULTIES, required: true },
    correct: { type: Number, required: true, default: 0 },
    total: { type: Number, required: true, default: 0 },
    accuracy: { type: Number, required: true, default: 0 },
  },
  { _id: false },
);

const perQuestionSchema = new Schema<IPerQuestion>(
  {
    question: { type: Schema.Types.ObjectId, ref: 'Question', required: true },
    questionIndex: { type: Number, required: true },
    isCorrect: { type: Boolean, required: true },
    responseTimeMs: { type: Number, default: null },
    topic: { type: String, default: '' },
    difficulty: { type: String, enum: DIFFICULTIES, required: true },
  },
  { _id: false },
);

const performanceAnalysisSchema = new Schema<IPerformanceAnalysis>(
  {
    student: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    quiz: { type: Schema.Types.ObjectId, ref: 'Quiz', required: true, index: true },
    session: { type: Schema.Types.ObjectId, ref: 'QuizSession', required: true },
    topicPerformance: { type: [topicPerformanceSchema], default: [] },
    difficultyPerformance: { type: [difficultyPerformanceSchema], default: [] },
    speedVsAccuracy: { type: String, enum: SPEED_ACCURACY_TYPES, required: true },
    difficultQuestions: [{ type: Schema.Types.ObjectId, ref: 'Question' }],
    perQuestion: { type: [perQuestionSchema], default: [] },
  },
  { timestamps: true },
);

performanceAnalysisSchema.index({ student: 1, quiz: 1 }, { unique: true });

export const PerformanceAnalysis = model<IPerformanceAnalysis>(
  'PerformanceAnalysis',
  performanceAnalysisSchema,
);
