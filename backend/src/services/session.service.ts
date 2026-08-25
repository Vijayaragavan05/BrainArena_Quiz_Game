import { QuizSession } from '../models/QuizSession.js';
import { Quiz } from '../models/Quiz.js';
import { User } from '../models/User.js';
import { generatePin } from './scoring.service.js';
import { AppError } from '../middleware/error.js';

export async function createSession(teacherId: string, quizId: string) {
  const quiz = await Quiz.findOne({ _id: quizId, teacher: teacherId }).populate('questions');
  if (!quiz) {
    throw new AppError(404, 'Quiz not found');
  }
  if (quiz.questions.length === 0) {
    throw new AppError(400, 'This quiz has no questions yet');
  }

  let pin = generatePin();
  while (await QuizSession.exists({ pin })) {
    pin = generatePin();
  }

  const session = await QuizSession.create({
    quiz: quiz._id,
    teacher: teacherId,
    pin,
    status: 'lobby',
    currentQuestionIndex: 0,
  });

  return session;
}

export async function findJoinableSession(pin: string) {
  const session = await QuizSession.findOne({ pin: pin.trim().toUpperCase() });
  if (!session) {
    throw new AppError(404, 'No quiz is running with this PIN');
  }
  if (session.status !== 'lobby') {
    throw new AppError(400, 'This quiz has already started');
  }
  const quiz = await Quiz.findById(session.quiz).select('title topic');
  const teacher = await User.findById(session.teacher).select('name');
  return {
    sessionId: session._id.toString(),
    pin: session.pin,
    status: session.status,
    quizTitle: quiz?.title ?? 'Quiz',
    quizTopic: quiz?.topic ?? '',
    teacherName: teacher?.name ?? 'Teacher',
  };
}