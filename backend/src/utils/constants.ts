export const USER_ROLES = ['teacher', 'student', 'admin'] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const USER_STATUSES = ['pending', 'approved', 'rejected'] as const;
export type UserStatus = (typeof USER_STATUSES)[number];

export const MAX_PARTICIPANTS_PER_QUIZ = 50;

export const TEAM_BATTLE_TEAMS = [
  { id: 'A', name: 'Team A', color: '#ef4444' },
  { id: 'B', name: 'Team B', color: '#3b82f6' },
  { id: 'C', name: 'Team C', color: '#10b981' },
  { id: 'D', name: 'Team D', color: '#f59e0b' },
] as const;
export type TeamId = (typeof TEAM_BATTLE_TEAMS)[number]['id'];

export const DIFFICULTIES = ['easy', 'medium', 'hard'] as const;
export type Difficulty = (typeof DIFFICULTIES)[number];

export const QUESTION_SOURCES = ['manual', 'import', 'ai', 'material'] as const;
export type QuestionSource = (typeof QUESTION_SOURCES)[number];

export const QUESTION_STATUSES = ['draft', 'ready'] as const;
export type QuestionStatus = (typeof QUESTION_STATUSES)[number];

export const QUIZ_STATUSES = ['draft', 'published', 'archived'] as const;
export type QuizStatus = (typeof QUIZ_STATUSES)[number];

export const SESSION_STATUSES = ['lobby', 'live', 'finished', 'cancelled'] as const;
export type SessionStatus = (typeof SESSION_STATUSES)[number];

export const SPEED_ACCURACY_TYPES = [
  'fast_and_accurate',
  'accurate_but_slow',
  'fast_but_error_prone',
  'slow_needs_improvement',
] as const;
export type SpeedAccuracyType = (typeof SPEED_ACCURACY_TYPES)[number];

export const QUIZ_PIN_LENGTH = 6;

export const DEFAULT_QUESTION_DURATION_SECONDS = 20;

export const SCORING = {
  basePoints: 1000,
  difficultyMultiplier: { easy: 1, medium: 1.25, hard: 1.5 },
} as const;

export const SPEED_ACCURACY_THRESHOLDS = {
  fastResponseMs: 10000,
  accurateAccuracy: 0.7,
} as const;
