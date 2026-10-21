const NAMES = ['N', 'NNO', 'NO', 'ONO', 'O', 'OZO', 'ZO', 'ZZO', 'Z', 'ZZW', 'ZW', 'WZW', 'W', 'WNW', 'NW', 'NNW'];

export function compass(deg: number): string {
  return NAMES[Math.round((((deg % 360) + 360) % 360) / 22.5) % 16];
}

export function angleDiff(a: number, b: number): number {
  const d = Math.abs((((a - b) % 360) + 360) % 360);
  return d > 180 ? 360 - d : d;
}

export function inSector(deg: number, sector: [number, number]): boolean {
  const d = ((deg % 360) + 360) % 360;
  const [start, end] = sector;
  return start <= end ? d >= start && d <= end : d >= start || d <= end;
}

export type DirStatus = 'goed' | 'sideshore' | 'sideoff' | 'aflandig';

/**
 * Indeling op basis van de hoek tussen de wind en de richting waarin de kust naar zee kijkt:
 * 0–80° aanlandig, 80–110° sideshore, 110°–aflandigVanaf side-off (opletten), daarboven aflandig.
 */
export function directionStatus(deg: number, kustrichting: number, aflandigVanaf = 135): DirStatus {
  const d = angleDiff(deg, kustrichting);
  if (d > aflandigVanaf) return 'aflandig';
  if (d > 110) return 'sideoff';
  if (d > 80) return 'sideshore';
  return 'goed';
}

/** Windrichtingen (van–tot, met de klok mee) waarbij het aflandig is. */
export function offshoreRange(kustrichting: number, aflandigVanaf = 135): [number, number] {
  const back = (kustrichting + 180) % 360;
  const half = 180 - aflandigVanaf;
  return [((back - half) % 360 + 360) % 360, (back + half) % 360];
}
