import { Schema, model, Types } from 'mongoose';

export interface IQuestionBank {
  teacher: Types.ObjectId;
  questions: Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const questionBankSchema = new Schema<IQuestionBank>(
  {
    teacher: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
    questions: [{ type: Schema.Types.ObjectId, ref: 'Question' }],
  },
  { timestamps: true },
);

export const QuestionBank = model<IQuestionBank>('QuestionBank', questionBankSchema);
