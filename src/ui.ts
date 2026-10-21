import { windColor, windTextColor } from './lib/colors';
import { compass } from './lib/direction';
import type { KiteLabel } from './lib/kite';
import type { HourView } from './state';
import { hm } from './lib/time';

export const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

export const r = (n: number) => (Number.isFinite(n) ? Math.round(n) : 0);

export function arrow(dir: number, size = 14): string {
  return `<svg class="arrow" width="${size}" height="${size}" viewBox="0 0 24 24" aria-hidden="true" style="transform:rotate(${r(dir + 180)}deg)"><path d="M12 20V4M12 4l-5 5M12 4l5 5" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
}

export const dirText = (dir: number) => `${compass(dir)} ${r(dir)}°`;

export function cellStyle(kn: number): string {
  return `background:${windColor(kn)};color:${windTextColor(kn)}`;
}

export function labelChip(l: KiteLabel, big = false): string {
  return `<span class="chip chip-${l.kind}${big ? ' chip-big' : ''}"><b>${esc(l.main)}</b>${l.sub ? `<small>${esc(l.sub)}</small>` : ''}</span>`;
}

export function rainIcon(mm: number): string {
  if (mm >= 1) return '<svg width="14" height="14" viewBox="0 0 24 24" role="img" aria-label="regen"><path d="M12 3c-3 4.5-6 7.7-6 11a6 6 0 0 0 12 0c0-3.3-3-6.5-6-11z" fill="#378ADD" stroke="#185FA5" stroke-width="1.6"/></svg>';
  if (mm >= 0.1) return '<svg width="11" height="11" viewBox="0 0 24 24" role="img" aria-label="lichte regen"><path d="M12 3c-3 4.5-6 7.7-6 11a6 6 0 0 0 12 0c0-3.3-3-6.5-6-11z" fill="none" stroke="#378ADD" stroke-width="2.6"/></svg>';
  return '';
}

export function hourStrip(hours: HourView[], nowT: number | null, opts: { gusts?: boolean } = {}): string {
  const g = opts.gusts !== false;
  return `<div class="strip" style="--n:${hours.length}">${hours
    .map(
      (h, i) => `<div class="cell${h.t === nowT ? ' now' : ''}${i && h.t - hours[i - 1].t > 3 * 3600_000 ? ' newday' : ''}${h.dirStatus === 'aflandig' ? ' off' : ''}" style="${cellStyle(h.avg)}" title="${hm(h.t)} · ${r(h.avg)} kn, vlagen ${r(h.gust)} · ${dirText(h.dir)}">
        <b>${r(h.avg)}</b>${g ? `<small>${r(h.gust)}</small>` : ''}</div>`
    )
    .join('')}</div>`;
}

export function stamp(ms: number): string {
  if (!ms) return '–';
  return hm(ms);
}
