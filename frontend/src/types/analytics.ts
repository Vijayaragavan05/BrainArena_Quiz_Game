export interface StudentResultSummary {
  _id: string;
  session: string;
  student: string;
  participant: string;
  quiz: { _id: string; title: string; topic: string; difficulty: string };
  totalQuestions: number;
  score: number;
  accuracy: number;
  correct: number;
  wrong: number;
  unanswered: number;
  rank: number;
  avgResponseTimeMs: number;
  whatIfScore: number;
  completedAt: string;
}

export interface PerQuestionDetail {
  questionIndex: number;
  text: string;
  options: string[];
  selectedIndex: number | null;
  correctIndex: number;
  isCorrect: boolean;
  score: number;
  responseTimeMs: number | null;
  answerChanges: number;
  topic: string;
  difficulty: string;
  explanation: string;
}

export interface StudentReportDetail {
  result: StudentResultSummary;
  performance: {
    topicPerformance: Array<{ topic: string; correct: number; total: number; accuracy: number }>;
    difficultyPerformance: Array<{ difficulty: string; correct: number; total: number; accuracy: number }>;
    speedVsAccuracy: string;
    difficultQuestions: string[];
  };
  insights: {
    recommendations: Array<{ topic: string; type: string; message: string }>;
  };
  questions: PerQuestionDetail[];
}

export interface TeacherQuizResults {
  results: Array<{
    _id: string;
    student: { _id: string; name: string; email: string };
    score: number;
    accuracy: number;
    correct: number;
    wrong: number;
    unanswered: number;
    rank: number;
    avgResponseTimeMs: number;
  }>;
}

export interface TeacherQuizOverview {
  quiz: { _id: string; title: string; topic: string; difficulty: string };
  totals: {
    participants: number;
    avgScore: number;
    highestScore: number;
    lowestScore: number;
    avgAccuracy: number;
  };
  questionStats: Array<{
    index: number;
    qId: string;
    text: string;
    topic: string;
    difficulty: string;
    correctCount: number;
    wrongCount: number;
    unansweredCount: number;
    correctPct: number;
    wrongPct: number;
    unansweredPct: number;
    avgTimeMs: number;
    optionCounts: number[];
    isDifficult: boolean;
  }>;
  rankings: Array<{
    rank: number;
    student: string;
    email: string;
    score: number;
    accuracy: number;
    correct: number;
    wrong: number;
    unanswered: number;
    avgResponseTimeMs: number;
  }>;
  responseTimes: number[];
}