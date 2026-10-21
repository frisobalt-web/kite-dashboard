import db from '../data/gear-db.json';
import { estimatedRange } from './kite';
import type { GearItem } from './settings';

export interface KiteOption {
  item: GearItem;
  size: number;
  lo: number;
  hi: number;
  sweetLo: number;
  sweetHi: number;
  sweet: number;
  bron: 'geschat';
}

export function kiteOptions(gear: GearItem[], weight: number, power: number): KiteOption[] {
  return gear
    .filter((g) => g.soort === 'kite' && parseFloat(g.maat) > 0)
    .map((g) => {
      const size = parseFloat(g.maat);
      return { item: g, size, ...estimatedRange(size, weight, power), bron: 'geschat' as const };
    })
    .sort((a, b) => b.size - a.size);
}

export function recommendedBar(kite: GearItem): { barCm: number; lijnenM: number; bron: string } | null {
  const size = parseFloat(kite.maat);
  for (const k of db.kites) {
    if (k.merk.toLowerCase() !== kite.merk.trim().toLowerCase()) continue;
    if (!kite.model.toLowerCase().includes(k.model.toLowerCase())) continue;
    const row = k.bar.find((b) => b.maten.includes(size));
    if (row) return { barCm: row.barCm, lijnenM: row.lijnenM, bron: k.bronnen[0] };
  }
  return null;
}

export interface SetupPart {
  rol: 'Kite' | 'Bar' | 'Board';
  naam: string;
  waarom: string;
  tag: string;
  toon: 'goed' | 'let' | 'info' | 'nee';
}

export function bestSetup(gear: GearItem[], eff: number, weight: number, power: number): SetupPart[] {
  const out: SetupPart[] = [];
  const kites = kiteOptions(gear, weight, power);
  let pick: KiteOption | null = null;
  for (const k of kites) {
    if (eff >= k.lo && eff <= k.hi && (!pick || Math.abs(k.sweet - eff) < Math.abs(pick.sweet - eff))) pick = k;
  }
  if (!pick) {
    out.push({
      rol: 'Kite',
      naam: kites.length ? 'Geen kite past' : 'Nog geen kites ingevuld',
      waarom: kites.length
        ? `Effectieve wind ${Math.round(eff)} kn valt buiten het (geschatte) bereik van je kites.`
        : 'Vul je kites in op deze pagina.',
      tag: 'Niet gaan',
      toon: 'nee'
    });
    return out;
  }
  const hard = eff > pick.sweetHi;
  const soft = eff < pick.sweetLo;
  out.push({
    rol: 'Kite',
    naam: `${pick.item.merk} ${pick.item.model} ${pick.size}m`,
    waarom: `Effectieve wind ${Math.round(eff)} kn, geschat bereik ${pick.lo}–${pick.hi} kn. ${
      hard ? 'Bovenkant: trim strak aan met de depower.' : soft ? 'Onderkant: blijf actief vliegen.' : 'Midden in de sweet spot.'
    }`,
    tag: hard ? 'Stevig' : soft ? 'Krap' : 'Sweet spot',
    toon: hard || soft ? 'let' : 'goed'
  });

  const bars = gear.filter((g) => g.soort === 'bar');
  const advice = recommendedBar(pick.item);
  const sameBrand = bars.filter((b) => b.merk.trim().toLowerCase() === pick!.item.merk.trim().toLowerCase());
  const exact = advice ? sameBrand.find((b) => parseFloat(b.maat) === advice.barCm) : undefined;
  const bar = exact || sameBrand[0] || bars[0];
  if (bar) {
    const label = `${bar.merk} ${bar.model}${bar.maat ? ` ${bar.maat} cm` : ''}`;
    if (exact && advice) {
      out.push({ rol: 'Bar', naam: label, waarom: `Fabrieksadvies: ${advice.barCm} cm bar met ${advice.lijnenM} m lijnen.`, tag: 'Past', toon: 'goed' });
    } else if (sameBrand.includes(bar)) {
      out.push({
        rol: 'Bar',
        naam: label,
        waarom: advice ? `Zelfde merk; fabrieksadvies is ${advice.barCm} cm met ${advice.lijnenM} m lijnen.` : 'Zelfde merk als je kite.',
        tag: advice ? 'Bijna' : 'Past waarschijnlijk',
        toon: 'info'
      });
    } else {
      out.push({ rol: 'Bar', naam: label, waarom: 'Ander merk dan je kite: check aansluiting en lijnlengte.', tag: 'Checken', toon: 'let' });
    }
  }

  const boards = gear.filter((g) => g.soort === 'board');
  if (boards.length) {
    const area = (g: GearItem) => {
      const m = g.maat.match(/(\d+(?:[.,]\d+)?)\s*[x×]\s*(\d+(?:[.,]\d+)?)/);
      return m ? parseFloat(m[1].replace(',', '.')) * parseFloat(m[2].replace(',', '.')) : 0;
    };
    const board = eff < 15 ? [...boards].sort((a, b) => area(b) - area(a))[0] : boards[0];
    out.push({
      rol: 'Board',
      naam: `${board.merk} ${board.model}${board.maat ? ` ${board.maat}` : ''}`,
      waarom: eff < 15 ? 'Lichte wind: je grootste board geeft de meeste lift.' : 'Genoeg wind voor dit board.',
      tag: 'Past',
      toon: 'goed'
    });
  }
  return out;
}

export function quiverGaps(kites: KiteOption[]): string[] {
  if (!kites.length) return [];
  const sorted = [...kites].sort((a, b) => a.lo - b.lo);
  const gaps: string[] = [];
  if (sorted[0].lo > 10) gaps.push(`Onder ${sorted[0].lo} kn heb je geen kite`);
  for (let i = 1; i < sorted.length; i++) {
    const prevHi = Math.max(...sorted.slice(0, i).map((k) => k.hi));
    if (sorted[i].lo > prevHi) gaps.push(`Gat tussen ${prevHi} en ${sorted[i].lo} kn`);
  }
  const maxHi = Math.max(...sorted.map((k) => k.hi));
  if (maxHi < 34) gaps.push(`Boven ${maxHi} kn heb je geen kite`);
  return gaps;
}
