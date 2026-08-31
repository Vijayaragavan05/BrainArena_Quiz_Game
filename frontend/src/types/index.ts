export type Role = 'teacher' | 'student' | 'admin';

export interface User {
  _id: string;
  name: string;
  email: string;
  role: Role;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface ApiHealth {
  status: string;
  uptime: number;
  timestamp: string;
  database: string;
}

export interface ApiError {
  error: string;
}

export type Difficulty = 'easy' | 'medium' | 'hard';
export type QuizStatus = 'draft' | 'published' | 'archived';

export interface Question {
  _id: string;
  text: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  topic: string;
  difficulty: Difficulty;
  imageUrl?: string;
  source: 'manual' | 'import' | 'ai' | 'material';
  status: 'draft' | 'ready';
}

export interface QuestionInput {
  text: string;
  options: string[];
  correctIndex: number;
  explanation?: string;
  topic?: string;
  difficulty: Difficulty;
  imageUrl?: string;
}

export interface ImportedQuestion {
  text: string;
  options: string[];
  correctIndex: number;
  explanation?: string;
  topic?: string;
  difficulty: Difficulty;
  imageUrl?: string;
}

export interface Quiz {
  _id: string;
  teacher: string;
  title: string;
  topic: string;
  description: string;
  difficulty: Difficulty;
  duration: number;
  questions: Question[];
  status: QuizStatus;
  createdAt: string;
  updatedAt: string;
}

export interface QuizInput {
  title: string;
  topic: string;
  description: string;
  difficulty: Difficulty;
  duration: number;
}

export interface QuizStats {
  total: number;
  drafts: number;
  published: number;
  archived: number;
  totalQuestions: number;
}
