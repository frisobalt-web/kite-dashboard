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

export type DirStatus = 'goed' | 'sideshore' | 'aflandig';

export function directionStatus(deg: number, sector: [number, number], kustrichting: number): DirStatus {
  if (angleDiff(deg, kustrichting) > 100) return 'aflandig';
  if (inSector(deg, sector)) return 'goed';
  const near = angleDiff(deg, sector[0]) <= 30 || angleDiff(deg, sector[1]) <= 30;
  return near ? 'sideshore' : 'aflandig';
}
