import type { Types } from 'mongoose';
import type { IQuiz } from '../models/Quiz.js';
import type { IQuestion } from '../models/Question.js';

export interface PopulatedQuiz extends Omit<IQuiz, 'questions'> {
  questions: Array<IQuestion & { _id: Types.ObjectId }>;
}