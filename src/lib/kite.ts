export const GUST_SHARE = 1 / 3;
/** Aandeel van de vlagen bij de check of er écht te weinig wind is. */
export const GUSTY_SHARE = 2 / 3;

export function effectiveWind(avg: number, gust: number, share = GUST_SHARE): number {
  return avg + Math.max(0, gust - avg) * share;
}

export function idealSize(weightKg: number, effWindKn: number, power: number): number {
  if (effWindKn <= 0) return Infinity;
  return (weightKg / effWindKn) * (2.2 + 0.1 * power);
}

export type LabelKind = 'groen' | 'krap' | 'oranje' | 'weinig' | 'veel' | 'aflandig';

export interface KiteLabel {
  kind: LabelKind;
  main: string;
  sub: string;
  ideal: number | null;
  pick: number | null;
}

export function nearestInQuiver(ideal: number, quiver: number[]): number | null {
  let best: number | null = null;
  for (const q of [...quiver].sort((a, b) => a - b)) {
    if (best === null || Math.abs(q - ideal) < Math.abs(best - ideal)) best = q;
  }
  return best;
}

export function kiteLabel(ideal: number, quiver: number[], offshore = false, idealGusty = ideal): KiteLabel {
  if (offshore) return { kind: 'aflandig', main: 'Aflandig', sub: '', ideal: null, pick: null };
  if (quiver.length) {
    // Te weinig voor je grootste kite op het gemiddelde, maar met de vlagen wel: kitebaar, wel krap.
    const biggest = Math.max(...quiver);
    if (ideal > biggest + 1.2 && idealGusty <= biggest + 1.2) {
      return { kind: 'krap', main: 'Krap, vlagerig', sub: `pak je ${biggest}m`, ideal: Math.round(ideal), pick: biggest };
    }
  }
  if (ideal > 17) return { kind: 'weinig', main: 'Te weinig wind', sub: '', ideal: null, pick: null };
  if (ideal < 5) return { kind: 'veel', main: 'Te veel wind', sub: '', ideal: null, pick: null };
  const rounded = Math.round(ideal);
  const pick = nearestInQuiver(ideal, quiver);
  if (pick !== null && Math.abs(pick - ideal) <= 1.2) {
    return { kind: 'groen', main: `Ideaal ${rounded}m`, sub: `pak je ${pick}m`, ideal: rounded, pick };
  }
  return { kind: 'oranje', main: `Ideaal ${rounded}m`, sub: '', ideal: rounded, pick: null };
}

/** Geschat windbereik voor een kite van `size` m² (gemiddelde wind in kn). */
export function estimatedRange(size: number, weightKg: number, power: number) {
  const iw = (weightKg * (2.2 + 0.1 * power)) / size;
  return {
    sweet: iw,
    lo: Math.round(iw * 0.78),
    hi: Math.round(iw * 1.45),
    sweetLo: Math.round(iw * 0.9),
    sweetHi: Math.round(iw * 1.15)
  };
}
