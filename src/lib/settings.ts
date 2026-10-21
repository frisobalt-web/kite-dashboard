export interface GearItem {
  id: string;
  soort: 'kite' | 'bar' | 'board';
  merk: string;
  model: string;
  maat: string;
}

export interface Settings {
  gewicht: number;
  power: number;
  gust: number;
  favorieten: string[];
  gear: GearItem[];
}

const KEY = 'kite-dashboard:v1';

export const DEFAULTS: Settings = {
  gewicht: 75,
  power: 1,
  gust: 1 / 3,
  favorieten: ['kijkduin', 'hoek', 'maasvlakte', 'scheveningen'],
  gear: [
    { id: 'k1', soort: 'kite', merk: 'Ozone', model: 'Edge V9', maat: '9' },
    { id: 'k2', soort: 'kite', merk: 'Ozone', model: 'Edge V10', maat: '11' },
    { id: 'b1', soort: 'bar', merk: 'Ozone', model: 'Contact', maat: '50' },
    { id: 'b2', soort: 'bar', merk: 'F-One', model: 'Bar (loop-only pigtails)', maat: '' }
  ]
};

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return structuredClone(DEFAULTS);
    return { ...structuredClone(DEFAULTS), ...JSON.parse(raw) };
  } catch {
    return structuredClone(DEFAULTS);
  }
}

export function saveSettings(s: Settings): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* privé-modus of vol: instellingen blijven alleen voor deze sessie */
  }
}

export function quiver(s: Settings): number[] {
  return s.gear
    .filter((g) => g.soort === 'kite')
    .map((g) => parseFloat(g.maat))
    .filter((n) => n > 0);
}
