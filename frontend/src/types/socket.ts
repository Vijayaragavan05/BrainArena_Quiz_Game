export interface LobbyParticipant {
  studentId: string;
  name: string;
}

export interface LiveQuestion {
  text: string;
  options: string[];
  imageUrl?: string;
}

export interface QuestionStartPayload {
  index: number;
  total: number;
  question: LiveQuestion;
  durationMs: number;
  startedAt: number;
}

export interface QuestionEndPayload {
  index: number;
  correctIndex: number;
  correctAnswerText: string;
  answerCount: number;
  correctCount: number;
  participantCount: number;
  timeUp: boolean;
}

export interface LeaderboardRow {
  rank: number;
  studentId: string;
  name: string;
  score: number;
  correct: number;
  wrong: number;
  unanswered: number;
  accuracy: number;
  avgResponseTimeMs: number;
}

export interface LeaderboardPayload {
  rankings: LeaderboardRow[];
}

export interface AnswerAckPayload {
  isCorrect: boolean;
  score: number;
  totalScore: number;
  alreadyAnswered?: boolean;
}

export interface QuizCompletePayload {
  quizId: string;
  sessionId: string;
  results: Array<{ participant: string; rank: number; score: number }>;
}

export interface HostStartedPayload {
  pin: string;
  sessionId: string;
  quizTitle: string;
  totalQuestions: number;
  durationMs: number;
}