import spotsJson from './config/spots.json';
import { fetchForecast, fetchMarine, type Hour, type Marine, type SpotForecast } from './api/openmeteo';
import { loadRwsTides, findExtremes, type TideStation } from './lib/tides';
import { loadSettings, quiver, saveSettings, type Settings } from './lib/settings';
import { effectiveWind, idealSize, kiteLabel, GUSTY_SHARE, type KiteLabel } from './lib/kite';
import { directionStatus, type DirStatus } from './lib/direction';
import { spotScore } from './lib/score';
import { dayKey } from './lib/time';

export interface Spot {
  id: string; naam: string; kort: string; lat: number; lon: number;
  kustrichting: number; aflandigVanaf?: number; getijStation: string; notitie: string;
}

export const SPOTS = spotsJson as Spot[];

export interface HourView extends Hour {
  eff: number; label: KiteLabel; dirStatus: DirStatus; daylight: boolean; score: number | null;
}

export interface SpotData { spot: Spot; hours: HourView[]; forecast: SpotForecast; marine: Marine | null }

export interface AppState {
  settings: Settings;
  data: SpotData[];
  tides: Record<string, TideStation>;
  tideSource: 'rws' | 'benadering' | 'geen';
  windFetched: number;
  tideFetched: number;
  error: string | null;
  loading: boolean;
}

export const state: AppState = {
  settings: loadSettings(),
  data: [],
  tides: {},
  tideSource: 'geen',
  windFetched: 0,
  tideFetched: 0,
  error: null,
  loading: true
};

export function updateSettings(patch: Partial<Settings>): void {
  state.settings = { ...state.settings, ...patch };
  saveSettings(state.settings);
  recompute();
}

function isDaylight(t: number, f: SpotForecast): boolean {
  const d = f.days.find((x) => x.date === dayKey(t));
  return d ? t >= d.sunrise - 30 * 60_000 && t <= d.sunset + 30 * 60_000 : true;
}

export function viewHour(h: Hour, spot: Spot, f: SpotForecast): HourView {
  const s = state.settings;
  const eff = effectiveWind(h.avg, h.gust, s.gust);
  const dirStatus = directionStatus(h.dir, spot.kustrichting, spot.aflandigVanaf);
  const gusty = idealSize(s.gewicht, effectiveWind(h.avg, h.gust, Math.max(s.gust, GUSTY_SHARE)), s.power);
  const label = kiteLabel(idealSize(s.gewicht, eff, s.power), quiver(s), dirStatus === 'aflandig', gusty);
  const daylight = isDaylight(h.t, f);
  return { ...h, eff, label, dirStatus, daylight, score: spotScore({ avg: h.avg, gust: h.gust, eff, rain: h.rain, label, daylight, sideoff: dirStatus === 'sideoff' }) };
}

function recompute(): void {
  state.data = state.data.map((d) => ({ ...d, hours: d.forecast.hours.map((h) => viewHour(h, d.spot, d.forecast)) }));
}

export async function loadAll(force = false): Promise<void> {
  state.loading = true;
  state.error = null;
  const base = import.meta.env.BASE_URL;
  const [fc, mar, rws] = await Promise.allSettled([
    fetchForecast(SPOTS, force),
    fetchMarine(SPOTS, force),
    loadRwsTides(base)
  ]);
  if (fc.status === 'fulfilled') {
    const marine = mar.status === 'fulfilled' ? mar.value.list : [];
    state.data = SPOTS.map((spot, i) => {
      const forecast = fc.value.list[i];
      return { spot, forecast, marine: marine[i] ?? null, hours: forecast.hours.map((h) => viewHour(h, spot, forecast)) };
    });
    state.windFetched = fc.value.fetched;
  } else {
    state.error = 'De windverwachting kon niet worden geladen. Controleer je verbinding en probeer opnieuw.';
  }
  if (rws.status === 'fulfilled' && rws.value) {
    state.tides = rws.value.stations;
    state.tideSource = 'rws';
    state.tideFetched = rws.value.bijgewerkt;
  } else if (mar.status === 'fulfilled') {
    const tides: Record<string, TideStation> = {};
    SPOTS.forEach((spot, i) => {
      const sea = mar.value.list[i]?.sea || [];
      if (sea.length && !tides[spot.getijStation]) tides[spot.getijStation] = { reeks: sea, extremen: findExtremes(sea), bron: 'benadering' };
    });
    state.tides = tides;
    state.tideSource = Object.keys(tides).length ? 'benadering' : 'geen';
    state.tideFetched = mar.value.fetched;
  }
  state.loading = false;
}

/** Uren vanaf het huidige uur. */
export function upcoming(d: SpotData, n: number, daylightOnly = true): HourView[] {
  const start = Date.now() - 59 * 60_000;
  return d.hours.filter((h) => h.t >= start && (!daylightOnly || h.daylight)).slice(0, n);
}

export function nowHour(d: SpotData): HourView | undefined {
  const start = Date.now() - 59 * 60_000;
  return d.hours.find((h) => h.t >= start);
}

export function orderedData(): SpotData[] {
  const fav = state.settings.favorieten;
  return [...state.data].sort((a, b) => {
    const ia = fav.indexOf(a.spot.id), ib = fav.indexOf(b.spot.id);
    return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
  });
}

export function bestNow(): { d: SpotData; h: HourView } | null {
  let best: { d: SpotData; h: HourView } | null = null;
  for (const d of orderedData()) {
    const h = nowHour(d);
    if (!h || h.score === null) continue;
    if (!best || (h.score > (best.h.score ?? -9))) best = { d, h };
  }
  return best;
}
