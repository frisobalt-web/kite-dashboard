import { describe, it, expect } from 'vitest';
import { idealSize, kiteLabel, effectiveWind, estimatedRange } from '../src/lib/kite';
import { windRgb } from '../src/lib/colors';
import { inSector, directionStatus, compass } from '../src/lib/direction';
import { findExtremes } from '../src/lib/tides';
import { spotScore } from '../src/lib/score';
import { bestSetup, quiverGaps, kiteOptions, recommendedBar } from '../src/lib/gear';
import type { GearItem } from '../src/lib/settings';

describe('kitemaat', () => {
  it('volgt de voorbeelden uit de specificatie', () => {
    expect(Math.round(idealSize(75, 15, 1))).toBe(12);
    expect(Math.round(idealSize(75, 22, 1))).toBe(8);
  });
  it('telt een derde van de vlagen mee', () => {
    expect(effectiveWind(18, 24)).toBeCloseTo(20);
    expect(effectiveWind(18, 15)).toBe(18);
  });
  it('kiest bij gelijke afstand de kleinere kite', () => {
    const l = kiteLabel(10, [9, 11]);
    expect(l.kind).toBe('groen');
    expect(l.sub).toBe('pak je 9m');
  });
  it('geeft oranje zonder pak-tekst als niets past', () => {
    const l = kiteLabel(7, [9, 11]);
    expect(l).toMatchObject({ kind: 'oranje', main: 'Ideaal 7m', sub: '' });
  });
  it('grenzen voor te weinig en te veel wind', () => {
    expect(kiteLabel(18, [9]).kind).toBe('weinig');
    expect(kiteLabel(4.5, [9]).kind).toBe('veel');
    expect(kiteLabel(9, [9], true).kind).toBe('aflandig');
  });
});

describe('kleurschaal', () => {
  it('ankerpunt 16 kn', () => expect(windRgb(16)).toEqual([151, 196, 89]));
  it('18 kn ligt halverwege 16 en 20', () => expect(windRgb(18)).toEqual([195, 202, 64]));
  it('begrenst boven 40', () => expect(windRgb(55)).toEqual([127, 119, 221]));
});

describe('windrichting', () => {
  it('sector over noord heen', () => {
    expect(inSector(350, [200, 20])).toBe(true);
    expect(inSector(100, [200, 20])).toBe(false);
  });
  it('aflandig en sideshore', () => {
    expect(directionStatus(120, [200, 20], 295)).toBe('aflandig');
    expect(directionStatus(225, [200, 20], 295)).toBe('goed');
    expect(directionStatus(195, [200, 20], 295)).toBe('sideshore');
    expect(directionStatus(185, [200, 20], 295)).toBe('aflandig');
  });
  it('kompasnaam', () => {
    expect(compass(225)).toBe('ZW');
    expect(compass(359)).toBe('N');
  });
});

describe('getij', () => {
  const t0 = Date.UTC(2026, 9, 21, 0, 0);
  const step = 10 * 60_000;
  it('vindt hoog- en laagwater in een sinus', () => {
    const pts = Array.from({ length: 6 * 25 }, (_, i) => ({ t: t0 + i * step, h: Math.sin((i * step) / (12.42 * 3600_000) * 2 * Math.PI) }));
    const ex = findExtremes(pts);
    expect(ex.filter((e) => e.type === 'HW').length).toBe(2);
    expect(ex.filter((e) => e.type === 'LW').length).toBe(2);
  });
  it('verwerkt een dubbel laagwater (Hoek van Holland) als twee laagwaters', () => {
    const shape = [100, 60, 10, -40, -60, -50, -45, -55, -62, -30, 20, 80, 110, 90];
    const pts = shape.map((cm, i) => ({ t: t0 + i * 40 * 60_000, h: cm / 100 }));
    const ex = findExtremes(pts);
    expect(ex.filter((e) => e.type === 'LW').length).toBe(2);
  });
});

describe('getij-rimpels', () => {
  const t0 = Date.UTC(2026, 9, 21, 0, 0);
  it('negeert een bult van 1 cm rond laagwater', () => {
    const shape = [52, 30, 0, -30, -50, -54, -53, -54, -40, 0, 50, 90];
    const pts = shape.map((cm, i) => ({ t: t0 + i * 3600_000, h: cm / 100 }));
    const ex = findExtremes(pts);
    expect(ex.map((e) => e.type)).toEqual(['LW']);
  });
});

describe('beste spot', () => {
  const base = { kind: 'groen' as const, main: '', sub: '', ideal: 9, pick: 9 };
  it('telt niet bij donker of aflandig', () => {
    expect(spotScore({ avg: 20, gust: 24, rain: 0, label: base, daylight: false })).toBeNull();
    expect(spotScore({ avg: 20, gust: 24, rain: 0, label: { ...base, kind: 'aflandig' }, daylight: true })).toBeNull();
  });
  it('minpunten voor regen en vlagerigheid', () => {
    expect(spotScore({ avg: 20, gust: 24, rain: 0, label: base, daylight: true })).toBe(5);
    expect(spotScore({ avg: 20, gust: 32, rain: 1.5, label: base, daylight: true })).toBe(3);
  });
});

describe('gear', () => {
  const gear: GearItem[] = [
    { id: '1', soort: 'kite', merk: 'Ozone', model: 'Edge V9', maat: '9' },
    { id: '2', soort: 'kite', merk: 'Ozone', model: 'Edge V10', maat: '11' },
    { id: '3', soort: 'bar', merk: 'Ozone', model: 'Contact', maat: '50' },
    { id: '4', soort: 'bar', merk: 'F-One', model: 'Bar', maat: '' }
  ];
  it('kent het Ozone bar-advies', () => {
    expect(recommendedBar(gear[0])).toMatchObject({ barCm: 50, lijnenM: 23 });
  });
  it('kiest de 9m met passende Ozone-bar bij 20 kn', () => {
    const s = bestSetup(gear, 20, 75, 1);
    expect(s[0].naam).toContain('9m');
    expect(s[1]).toMatchObject({ rol: 'Bar', tag: 'Past' });
  });
  it('geeft geen kite bij storm', () => {
    expect(bestSetup(gear, 40, 75, 1)[0].tag).toBe('Niet gaan');
  });
  it('vindt het gat boven de 9m', () => {
    const gaps = quiverGaps(kiteOptions(gear, 75, 1));
    expect(gaps.some((g) => g.startsWith('Boven'))).toBe(true);
  });
  it('geschat bereik 9m', () => {
    const e = estimatedRange(9, 75, 1);
    expect([e.lo, e.hi]).toEqual([15, 28]);
  });
});
