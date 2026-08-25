import { SCORING, SPEED_ACCURACY_THRESHOLDS } from '../utils/constants.js';
import type { Difficulty, SpeedAccuracyType } from '../utils/constants.js';

/**
 * Server-authoritative scoring.
 * Correct answers earn up to SCORING.basePoints scaled by how quickly the
 * student answered (Kahoot-style). Difficulty scales the final award.
 */
export function calculateQuestionScore(params: {
  isCorrect: boolean;
  responseTimeMs: number | null;
  durationMs: number;
  difficulty: Difficulty;
}): number {
  if (!params.isCorrect || params.responseTimeMs === null) return 0;

  const speedFraction = Math.max(0, 1 - params.responseTimeMs / params.durationMs);
  const raw = Math.round(SCORING.basePoints * speedFraction);
  return Math.round(raw * SCORING.difficultyMultiplier[params.difficulty]);
}

export function classifySpeedVsAccuracy(params: {
  accuracy: number;
  avgResponseTimeMs: number;
}): SpeedAccuracyType {
  const fast = params.avgResponseTimeMs < SPEED_ACCURACY_THRESHOLDS.fastResponseMs;
  const accurate = params.accuracy >= SPEED_ACCURACY_THRESHOLDS.accurateAccuracy;

  if (fast && accurate) return 'fast_and_accurate';
  if (!fast && accurate) return 'accurate_but_slow';
  if (fast && !accurate) return 'fast_but_error_prone';
  return 'slow_needs_improvement';
}

export function generatePin(): string {
  const digits = Array.from({ length: 6 }, () => Math.floor(Math.random() * 10));
  return digits.join('');
}
