import type { KiteLabel } from './kite';

export interface ScoreInput {
  avg: number;
  gust: number;
  eff: number;
  rain: number;
  label: KiteLabel;
  daylight: boolean;
}

/** Hoger is beter; null = telt niet mee (donker of aflandig). */
export function spotScore(s: ScoreInput): number | null {
  if (!s.daylight || s.label.kind === 'aflandig') return null;
  let score = 0;
  if (s.label.kind === 'groen' || s.label.kind === 'krap') score += 3;
  else if (s.label.kind === 'oranje') score += 1;
  else return 0;
  if ((s.eff >= 16 && s.eff <= 24) || (s.eff >= 14 && s.gust >= 20 && s.eff < 16)) score += 2;
  if (s.rain >= 1) score -= 1;
  if (s.gust - s.avg > 12) score -= 1;
  return score;
}
