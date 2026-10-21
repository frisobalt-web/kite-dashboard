export interface TidePoint { t: number; h: number } // ms, meter
export interface TideExtreme { t: number; h: number; type: 'HW' | 'LW' }
export interface TideStation { reeks: TidePoint[]; extremen: TideExtreme[]; bron: 'rws' | 'benadering' }

/**
 * Hoog- en laagwaters via een zigzag: een keerpunt telt pas als het water daarna
 * minstens `minRise` meter de andere kant op gaat. Zo tellen rimpels van een paar cm
 * niet mee, maar een echt dubbel laagwater (Hoek van Holland) wel.
 */
export function findExtremes(points: TidePoint[], minRise = 0.05): TideExtreme[] {
  const out: TideExtreme[] = [];
  if (points.length < 3) return out;
  let dir = 0; // 1 = zoekt HW, -1 = zoekt LW, 0 = nog onbekend
  let hi = 0, hiEnd = 0, lo = 0, loEnd = 0;
  const mid = (a: number, b: number) => points[a].t + (points[b].t - points[a].t) / 2;
  for (let i = 1; i < points.length; i++) {
    const h = points[i].h;
    if (dir >= 0) {
      if (h > points[hi].h) { hi = i; hiEnd = i; }
      else if (h === points[hi].h) hiEnd = i;
      else if (points[hi].h - h >= minRise) {
        if (hi !== 0) out.push({ t: mid(hi, hiEnd), h: points[hi].h, type: 'HW' });
        dir = -1; lo = i; loEnd = i;
        continue;
      }
    }
    if (dir <= 0) {
      if (h < points[lo].h) { lo = i; loEnd = i; }
      else if (h === points[lo].h) loEnd = i;
      else if (h - points[lo].h >= minRise) {
        if (lo !== 0) out.push({ t: mid(lo, loEnd), h: points[lo].h, type: 'LW' });
        dir = 1; hi = i; hiEnd = i;
      }
    }
  }
  return out;
}

export function levelAt(points: TidePoint[], t: number): number | null {
  if (!points.length || t < points[0].t || t > points[points.length - 1].t) return null;
  for (let i = 1; i < points.length; i++) {
    if (points[i].t >= t) {
      const a = points[i - 1], b = points[i];
      const f = b.t === a.t ? 0 : (t - a.t) / (b.t - a.t);
      return a.h + (b.h - a.h) * f;
    }
  }
  return null;
}

export function tideState(st: TideStation, now: number): { rising: boolean; next: TideExtreme | null } {
  const next = st.extremen.find((e) => e.t > now) || null;
  return { rising: next ? next.type === 'HW' : false, next };
}

interface TideFile {
  bijgewerkt: string;
  stations: Record<string, { reeks: [string, number][] }>;
}

export async function loadRwsTides(base: string): Promise<{ stations: Record<string, TideStation>; bijgewerkt: number } | null> {
  try {
    const res = await fetch(`${base}data/tides.json`, { cache: 'no-cache' });
    if (!res.ok) return null;
    const json = (await res.json()) as TideFile;
    const stations: Record<string, TideStation> = {};
    for (const [id, s] of Object.entries(json.stations || {})) {
      const reeks = s.reeks.map(([t, cm]) => ({ t: Date.parse(t), h: cm / 100 }));
      if (reeks.length < 10) continue;
      stations[id] = { reeks, extremen: findExtremes(reeks), bron: 'rws' };
    }
    if (!Object.keys(stations).length) return null;
    const newest = Math.max(...Object.values(stations).map((s) => s.reeks[s.reeks.length - 1].t));
    if (newest < Date.now()) return null; // verlopen
    return { stations, bijgewerkt: Date.parse(json.bijgewerkt) };
  } catch {
    return null;
  }
}
