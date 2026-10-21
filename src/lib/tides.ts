export interface TidePoint { t: number; h: number } // ms, meter
export interface TideExtreme { t: number; h: number; type: 'HW' | 'LW' }
export interface TideStation { reeks: TidePoint[]; extremen: TideExtreme[]; bron: 'rws' | 'benadering' }

/** Lokale hoog- en laagwaters; meerdere per dag mogelijk (dubbel laagwater Hoek van Holland). */
export function findExtremes(points: TidePoint[], minGapMs = 2 * 3600_000): TideExtreme[] {
  const out: TideExtreme[] = [];
  for (let i = 1; i < points.length - 1; i++) {
    const p = points[i - 1].h, c = points[i].h, n = points[i + 1].h;
    let type: 'HW' | 'LW' | null = null;
    if (c > p && c >= n) type = 'HW';
    else if (c < p && c <= n) type = 'LW';
    if (!type) continue;
    const last = out[out.length - 1];
    if (last && last.type === type && points[i].t - last.t < minGapMs) {
      if ((type === 'HW' && c > last.h) || (type === 'LW' && c < last.h)) out[out.length - 1] = { t: points[i].t, h: c, type };
      continue;
    }
    out.push({ t: points[i].t, h: c, type });
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
