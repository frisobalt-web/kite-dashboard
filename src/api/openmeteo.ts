import type { TidePoint } from '../lib/tides';

export interface Hour { t: number; avg: number; gust: number; dir: number; rain: number; temp: number }
export interface Day { date: string; sunrise: number; sunset: number }
export interface SpotForecast { hours: Hour[]; days: Day[] }
export interface Marine { sst: number | null; wave: number | null; sea: TidePoint[] }

const FORECAST = 'https://api.open-meteo.com/v1/forecast';
const MARINE = 'https://marine-api.open-meteo.com/v1/marine';
const CACHE_MS = 15 * 60_000;

interface Coord { lat: number; lon: number }

async function cached<T>(key: string, url: string, force: boolean): Promise<{ data: T; fetched: number }> {
  if (!force) {
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const c = JSON.parse(raw);
        if (c.url === url && Date.now() - c.fetched < CACHE_MS) return { data: c.data, fetched: c.fetched };
      }
    } catch { /* geen cache */ }
  }
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = (await res.json()) as T;
    const fetched = Date.now();
    try { localStorage.setItem(key, JSON.stringify({ url, fetched, data })); } catch { /* vol */ }
    return { data, fetched };
  } catch (err) {
    try {
      const raw = localStorage.getItem(key);
      if (raw) { const c = JSON.parse(raw); return { data: c.data, fetched: c.fetched }; }
    } catch { /* niets */ }
    throw err;
  }
}

type Raw = Record<string, any>;
const asList = (x: Raw | Raw[]): Raw[] => (Array.isArray(x) ? x : [x]);

export async function fetchForecast(spots: Coord[], force = false) {
  const p = new URLSearchParams({
    latitude: spots.map((s) => s.lat).join(','),
    longitude: spots.map((s) => s.lon).join(','),
    hourly: 'wind_speed_10m,wind_gusts_10m,wind_direction_10m,precipitation,temperature_2m',
    daily: 'sunrise,sunset',
    models: 'knmi_seamless',
    wind_speed_unit: 'kn',
    timezone: 'Europe/Amsterdam',
    timeformat: 'unixtime',
    forecast_days: '7'
  });
  const { data, fetched } = await cached<Raw | Raw[]>('om:forecast', `${FORECAST}?${p}`, force);
  const list: SpotForecast[] = asList(data).map((d) => {
    const h = d.hourly;
    const hours: Hour[] = h.time.map((t: number, i: number) => ({
      t: t * 1000,
      avg: h.wind_speed_10m[i] ?? NaN,
      gust: h.wind_gusts_10m[i] ?? NaN,
      dir: h.wind_direction_10m[i] ?? NaN,
      rain: h.precipitation[i] ?? 0,
      temp: h.temperature_2m[i] ?? NaN
    })).filter((x: Hour) => Number.isFinite(x.avg));
    const dd = d.daily;
    const days: Day[] = dd.time.map((t: number, i: number) => ({
      date: new Date(t * 1000 + 12 * 3600_000).toISOString().slice(0, 10),
      sunrise: dd.sunrise[i] * 1000,
      sunset: dd.sunset[i] * 1000
    }));
    return { hours, days };
  });
  return { list, fetched };
}

export async function fetchMarine(spots: Coord[], force = false) {
  const p = new URLSearchParams({
    latitude: spots.map((s) => s.lat).join(','),
    longitude: spots.map((s) => s.lon).join(','),
    hourly: 'sea_level_height_msl,sea_surface_temperature,wave_height',
    timezone: 'Europe/Amsterdam',
    timeformat: 'unixtime',
    forecast_days: '7',
    cell_selection: 'sea'
  });
  const { data, fetched } = await cached<Raw | Raw[]>('om:marine', `${MARINE}?${p}`, force);
  const now = Date.now();
  const list: Marine[] = asList(data).map((d) => {
    const h = d.hourly;
    const times: number[] = h.time.map((t: number) => t * 1000);
    let idx = times.findIndex((t) => t >= now - 30 * 60_000);
    if (idx < 0) idx = 0;
    const sea: TidePoint[] = times
      .map((t, i) => ({ t, h: h.sea_level_height_msl?.[i] }))
      .filter((x): x is TidePoint => typeof x.h === 'number');
    return { sst: h.sea_surface_temperature?.[idx] ?? null, wave: h.wave_height?.[idx] ?? null, sea };
  });
  return { list, fetched };
}
