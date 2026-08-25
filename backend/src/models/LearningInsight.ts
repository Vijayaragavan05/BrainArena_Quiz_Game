import { Schema, model, Types } from 'mongoose';

export interface IRecommendation {
  topic: string;
  type: 'strength' | 'weakness' | 'practice';
  message: string;
}

export interface ILearningInsight {
  student: Types.ObjectId;
  quiz: Types.ObjectId;
  session: Types.ObjectId;
  recommendations: IRecommendation[];
  createdAt: Date;
  updatedAt: Date;
}

const recommendationSchema = new Schema<IRecommendation>(
  {
    topic: { type: String, required: true },
    type: { type: String, enum: ['strength', 'weakness', 'practice'], required: true },
    message: { type: String, required: true },
  },
  { _id: false },
);

const learningInsightSchema = new Schema<ILearningInsight>(
  {
    student: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    quiz: { type: Schema.Types.ObjectId, ref: 'Quiz', required: true, index: true },
    session: { type: Schema.Types.ObjectId, ref: 'QuizSession', required: true },
    recommendations: { type: [recommendationSchema], default: [] },
  },
  { timestamps: true },
);

learningInsightSchema.index({ student: 1, quiz: 1 }, { unique: true });

export const LearningInsight = model<ILearningInsight>('LearningInsight', learningInsightSchema);
