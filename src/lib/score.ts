import type { KiteLabel } from './kite';

export interface ScoreInput {
  avg: number;
  gust: number;
  rain: number;
  label: KiteLabel;
  daylight: boolean;
}

/** Hoger is beter; null = telt niet mee (donker of aflandig). */
export function spotScore(s: ScoreInput): number | null {
  if (!s.daylight || s.label.kind === 'aflandig') return null;
  let score = 0;
  if (s.label.kind === 'groen') score += 3;
  else if (s.label.kind === 'oranje') score += 1;
  else return 0;
  if (s.avg >= 16 && s.avg <= 24) score += 2;
  if (s.rain >= 1) score -= 1;
  if (s.gust - s.avg > 10) score -= 1;
  return score;
}
