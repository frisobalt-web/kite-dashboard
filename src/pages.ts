import { state, orderedData, upcoming, nowHour, bestNow, SPOTS, type SpotData, type HourView } from './state';
import { esc, r, arrow, dirText, cellStyle, labelChip, rainIcon, hourStrip, stamp } from './ui';
import { legendGradient, windColor } from './lib/colors';
import { idealSize, estimatedRange } from './lib/kite';
import { levelAt, tideState, type TideStation } from './lib/tides';
import { hm, hourLabel, dayLabel, dayKey, longDay } from './lib/time';
import { bestSetup, kiteOptions, quiverGaps } from './lib/gear';
import type { GearItem } from './lib/settings';

/* ---------- gedeelde stukken ---------- */

function tideFor(d: SpotData): TideStation | undefined {
  return state.tides[d.spot.getijStation];
}

function tideChip(st: TideStation | undefined): string {
  if (!st) return '';
  const { rising, next } = tideState(st, Date.now());
  if (!next) return '';
  return `<span class="chip chip-tide"><b>${rising ? 'Vloed' : 'Eb'}</b><small>${next.type} ${hm(next.t)}</small></span>`;
}

function tideBars(st: TideStation | undefined, hours: HourView[]): string {
  if (!st || !hours.length) return '';
  const lv = hours.map((h) => levelAt(st.reeks, h.t));
  const vals = lv.filter((x): x is number => x !== null);
  if (!vals.length) return '';
  const min = Math.min(...vals), max = Math.max(...vals);
  const marks = hours.map((h) => {
    const e = st.extremen.find((x) => Math.abs(x.t - h.t) <= 30 * 60_000);
    return e ? e.type : '';
  });
  return `<div class="tidebars" style="--n:${hours.length}" aria-label="Getij per uur">${lv
    .map((v, i) => {
      const pct = v === null || max === min ? 10 : 15 + ((v - min) / (max - min)) * 85;
      const nd = i && hours[i].t - hours[i - 1].t > 3 * 3600_000 ? ' class="newday"' : '';
      return `<div${nd}><i style="height:${r(pct)}%"></i><em>${marks[i]}</em></div>`;
    })
    .join('')}</div>`;
}

function hourHeader(hours: HourView[], nowT: number | null): string {
  return `<div class="strip strip-head" style="--n:${hours.length}">${hours
    .map((h, i) => `<div class="${h.t === nowT ? 'now' : ''}${i && h.t - hours[i - 1].t > 3 * 3600_000 ? ' newday' : ''}"><span>${hourLabel(h.t)}</span><span class="rain">${rainIcon(h.rain)}</span></div>`)
    .join('')}</div>`;
}

function sourceNote(): string {
  const tide = state.tideSource === 'rws' ? 'Rijkswaterstaat' : state.tideSource === 'benadering' ? 'benadering (Open-Meteo)' : 'niet beschikbaar';
  const old = state.windFetched && Date.now() - state.windFetched > 3 * 3600_000;
  return `<p class="meta${old ? ' warn' : ''}">Wind bijgewerkt ${stamp(state.windFetched)} · getij: ${tide}${
    state.tideSource === 'rws' ? ` (${longDay(state.tideFetched)})` : ''
  }</p>`;
}

function errorBox(): string {
  return state.error ? `<div class="card error" role="alert">${esc(state.error)} <button type="button" data-action="refresh">Opnieuw</button></div>` : '';
}

function offWarn(h: HourView | undefined): string {
  if (!h) return '';
  if (h.dirStatus === 'aflandig') return '<span class="badge badge-danger">Aflandig: niet kiten</span>';
  if (h.dirStatus === 'sideshore') return '<span class="badge badge-warn">Sideshore, opletten</span>';
  return '';
}

/* ---------- Nu ---------- */

export function pageNu(): string {
  if (state.loading && !state.data.length) return '<div class="card">Verwachting laden…</div>';
  if (!state.data.length) return errorBox();
  const best = bestNow();
  const list = orderedData();
  const ref = list[0];
  const refHours = upcoming(ref, 24);
  const nowT = nowHour(ref)?.t ?? null;
  const hero = best
    ? `<section class="hero" style="${cellStyle(best.h.avg)}">
        <div>
          <p class="eyebrow">Beste spot nu · ${hm(best.h.t)}</p>
          <h1><a href="#/spot/${best.d.spot.id}">${esc(best.d.spot.naam)}</a></h1>
          <p class="hero-sub">${arrow(best.h.dir, 18)} ${dirText(best.h.dir)} · vlagen ${r(best.h.gust)} kn · ${best.h.rain >= 0.1 ? `${best.h.rain.toFixed(1).replace('.', ',')} mm regen` : 'droog'}</p>
          <div class="chips">${labelChip(best.h.label, true)}${tideChip(tideFor(best.d))}${offWarn(best.h)}</div>
        </div>
        <div class="hero-num">${r(best.h.avg)}<span> kn</span></div>
      </section>`
    : `<section class="card"><h2>Nu geen geschikte spot</h2><p>Donker, aflandig of te weinig wind bij alle spots. Kijk bij <a href="#/week">Week</a> voor de komende dagen.</p></section>`;

  const rows = list
    .map((d) => {
      const hrs = upcoming(d, 24);
      const h = nowHour(d);
      const nt = h?.t ?? null;
      return `<a class="spotrow" href="#/spot/${d.spot.id}">
        <div class="spotname">
          <b>${esc(d.spot.naam)}</b>
          <span class="muted">${h ? `${arrow(h.dir)} ${dirText(h.dir)} · ${r(h.avg)} kn, vlagen ${r(h.gust)}` : ''}${d.marine?.sst != null ? ` · water ${r(d.marine.sst)}°C` : ''}</span>
          ${offWarn(h)}
        </div>
        ${hourStrip(hrs, nt)}
        <div class="spotlabel">${h ? labelChip(h.label) : ''}</div>
      </a>`;
    })
    .join('');

  const st = tideFor(ref);
  return `${errorBox()}${hero}
    <section class="card">
      <div class="card-head"><h2>Komende uren</h2><span class="muted">Daglicht · gem. wind boven, vlagen onder · knopen</span></div>
      <div class="table">
        <div class="spotrow head"><div class="spotname muted">Uur · regen</div>${hourHeader(refHours, nowT)}<div></div></div>
        <div class="spotrow head"><div class="spotname muted">Getij ${esc(SPOTS.find((s) => s.getijStation === ref.spot.getijStation)?.kort || '')}</div>${tideBars(st, refHours)}<div></div></div>
        ${rows}
      </div>
      <div class="legend"><div class="bar" style="background:${legendGradient()}"></div><div class="ticks"><span>0</span><span>10</span><span>20</span><span>30</span><span>40 kn</span></div></div>
    </section>
    ${sourceNote()}`;
}

/* ---------- Week ---------- */

interface DaySummary { key: string; t: number; max: HourView | null; window: string; best: HourView | null }

function summarizeDays(d: SpotData): DaySummary[] {
  const byDay = new Map<string, HourView[]>();
  for (const h of d.hours) {
    if (!h.daylight) continue;
    const k = dayKey(h.t);
    if (!byDay.has(k)) byDay.set(k, []);
    byDay.get(k)!.push(h);
  }
  return [...byDay.entries()].slice(0, 7).map(([key, hs]) => {
    const ok = hs.filter((h) => h.score !== null && h.score >= 3);
    const max = hs.reduce<HourView | null>((m, h) => (h.dirStatus !== 'aflandig' && (!m || h.avg > m.avg) ? h : m), null);
    const best = hs.reduce<HourView | null>((m, h) => (h.score !== null && (!m || h.score > (m.score ?? -9)) ? h : m), null);
    const window = ok.length ? `${hourLabel(ok[0].t)}–${hourLabel(ok[ok.length - 1].t + 3600_000)} u` : '';
    return { key, t: hs[0].t, max, window, best };
  });
}

export function pageWeek(): string {
  if (!state.data.length) return state.loading ? '<div class="card">Verwachting laden…</div>' : errorBox();
  const list = orderedData();
  const sums = list.map((d) => ({ d, days: summarizeDays(d) }));
  const days = sums[0].days;

  const grid = `<div class="weekgrid" style="--n:${days.length}">
      <div></div>${days.map((x) => `<div class="weekday">${dayLabel(x.t)}</div>`).join('')}
      ${sums
        .map(
          ({ d, days: ds }) => `<a class="weekname" href="#/spot/${d.spot.id}">${esc(d.spot.kort)}</a>${ds
            .map((x) =>
              x.max
                ? `<div class="weekcell" style="${cellStyle(x.max.avg)}"><b>${r(x.max.avg)}</b><small>${x.window || 'te zwak'}</small></div>`
                : '<div class="weekcell off"><b>afl.</b><small>niet kiten</small></div>'
            )
            .join('')}`
        )
        .join('')}
    </div>`;

  const cards = days
    .map((day, i) => {
      let best: { d: SpotData; h: HourView } | null = null;
      for (const s of sums) {
        const b = s.days[i]?.best;
        if (b && b.score !== null && (!best || b.score > (best.h.score ?? -9))) best = { d: s.d, h: b };
      }
      const maxAll = Math.max(...sums.map((s) => s.days[i]?.max?.avg ?? 0));
      return `<details class="daycard">
        <summary>
          <span class="dayname">${dayLabel(day.t)}</span>
          ${best && best.h.score! >= 3 ? `<span><b>${esc(best.d.spot.kort)}</b> <span class="muted">${hourLabel(best.h.t)} u</span></span>${labelChip(best.h.label)}` : '<span class="muted">Geen goede kitemomenten</span>'}
          ${maxAll > 0 ? `<span class="pill" style="${cellStyle(maxAll)}">${r(maxAll)}</span>` : '<span class="badge badge-danger">aflandig</span>'}
        </summary>
        <div class="dayspots">${sums
          .map((s) => {
            const x = s.days[i];
            return `<div><span>${esc(s.d.spot.kort)}</span>${x?.max ? `<span class="pill" style="${cellStyle(x.max.avg)}">${r(x.max.avg)}</span><span class="muted">${x.window || 'te zwak'}</span>` : '<span class="badge badge-danger">aflandig</span>'}</div>`;
          })
          .join('')}</div>
      </details>`;
    })
    .join('');

  return `${errorBox()}<section class="card">
      <div class="card-head"><h2>Komende 7 dagen</h2><span class="muted">Hoogste gemiddelde wind overdag · tijdvak met goed kite-advies</span></div>
      <div class="desk-only">${grid}</div>
      <div class="mob-only">${cards}</div>
    </section>${sourceNote()}`;
}

/* ---------- Spot ---------- */

function windChart(hours: HourView[]): string {
  if (hours.length < 2) return '';
  const W = 960, H = 220, P = 28;
  const maxV = Math.max(30, ...hours.map((h) => h.gust)) + 2;
  const x = (i: number) => P + (i / (hours.length - 1)) * (W - P * 2);
  const y = (v: number) => H - 30 - (v / maxV) * (H - 50);
  const band = hours.map((h, i) => `${x(i).toFixed(1)},${y(h.gust).toFixed(1)}`).join(' ') + ' ' +
    [...hours].reverse().map((h, j) => `${x(hours.length - 1 - j).toFixed(1)},${y(h.avg).toFixed(1)}`).join(' ');
  const line = hours.map((h, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(h.avg).toFixed(1)}`).join(' ');
  const grid = [10, 20, 30].map((v) => `<line x1="${P}" x2="${W - P}" y1="${y(v)}" y2="${y(v)}" class="grid"/><text x="4" y="${y(v) + 4}" class="axis">${v}</text>`).join('');
  const labels = hours
    .map((h, i) => (i % 3 === 0 ? `<text x="${x(i)}" y="${H - 8}" class="axis" text-anchor="middle">${hourLabel(h.t)}</text>` : ''))
    .join('');
  const dots = hours.map((h, i) => `<circle cx="${x(i)}" cy="${y(h.avg)}" r="4" fill="${windColor(h.avg)}" stroke="#14181f" stroke-width="1"/>`).join('');
  const rain = hours.map((h, i) => (h.rain > 0 ? `<rect x="${x(i) - 4}" y="${H - 30 - Math.min(40, h.rain * 12)}" width="8" height="${Math.min(40, h.rain * 12)}" fill="#85B7EB" opacity=".8"/>` : '')).join('');
  return `<svg viewBox="0 0 ${W} ${H}" class="chart" role="img" aria-label="Wind en vlagen per uur">
    ${grid}${rain}<polygon points="${band}" fill="#97C459" opacity=".25"/><path d="${line}" fill="none" stroke="#14181f" stroke-width="2"/>${dots}${labels}</svg>`;
}

function tideChart(st: TideStation | undefined, from: number, to: number): string {
  if (!st) return '<p class="muted">Geen getijdata beschikbaar.</p>';
  const pts = st.reeks.filter((p) => p.t >= from && p.t <= to);
  if (pts.length < 2) return '<p class="muted">Geen getijdata voor deze periode.</p>';
  const W = 960, H = 160, P = 28;
  const min = Math.min(...pts.map((p) => p.h)), max = Math.max(...pts.map((p) => p.h));
  const x = (t: number) => P + ((t - from) / (to - from)) * (W - P * 2);
  const y = (h: number) => 20 + (1 - (h - min) / (max - min || 1)) * (H - 50);
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${x(p.t).toFixed(1)} ${y(p.h).toFixed(1)}`).join(' ');
  const area = `${line} L${x(pts[pts.length - 1].t).toFixed(1)} ${H - 30} L${x(pts[0].t).toFixed(1)} ${H - 30} Z`;
  const ex = st.extremen
    .filter((e) => e.t >= from && e.t <= to)
    .map((e) => `<circle cx="${x(e.t)}" cy="${y(e.h)}" r="4" fill="#185FA5"/><text x="${x(e.t)}" y="${e.type === 'HW' ? y(e.h) - 8 : y(e.h) + 16}" text-anchor="middle" class="axis strong">${e.type} ${hm(e.t)}</text>`)
    .join('');
  const now = Date.now();
  const nowLine = now >= from && now <= to ? `<line x1="${x(now)}" x2="${x(now)}" y1="10" y2="${H - 30}" stroke="#14181f" stroke-dasharray="3 3"/>` : '';
  return `<svg viewBox="0 0 ${W} ${H}" class="chart" role="img" aria-label="Getijcurve"><path d="${area}" fill="#E6F1FB"/><path d="${line}" fill="none" stroke="#185FA5" stroke-width="2.5"/>${nowLine}${ex}</svg>`;
}

export function pageSpot(id: string): string {
  const d = state.data.find((x) => x.spot.id === id);
  if (!d) return state.loading ? '<div class="card">Laden…</div>' : '<div class="card">Spot niet gevonden. <a href="#/">Terug</a></div>';
  const h = nowHour(d);
  const hours = upcoming(d, 36, false).slice(0, 36);
  const st = tideFor(d);
  const from = hours[0]?.t ?? Date.now(), to = hours[hours.length - 1]?.t ?? Date.now();
  const extremes = st ? st.extremen.filter((e) => e.t >= from && e.t <= to).slice(0, 6) : [];
  return `<p><a href="#/">← Alle spots</a></p>
    <section class="hero" style="${h ? cellStyle(h.avg) : ''}">
      <div>
        <p class="eyebrow">Nu</p>
        <h1>${esc(d.spot.naam)}</h1>
        ${h ? `<p class="hero-sub">${arrow(h.dir, 18)} ${dirText(h.dir)} · vlagen ${r(h.gust)} kn</p><div class="chips">${labelChip(h.label, true)}${tideChip(st)}${offWarn(h)}</div>` : ''}
      </div>
      ${h ? `<div class="hero-num">${r(h.avg)}<span> kn</span></div>` : ''}
    </section>
    <section class="card">
      <div class="card-head"><h2>Wind komende 36 uur</h2><span class="muted">Lijn = gemiddeld, band = tot vlagen, blauw = regen</span></div>
      ${windChart(hours)}
      <div class="scroll">${hourStrip(hours, h?.t ?? null)}</div>
    </section>
    <div class="cols">
      <section class="card">
        <div class="card-head"><h2>Getij</h2><span class="muted">${state.tideSource === 'rws' ? 'Rijkswaterstaat' : 'benadering'} · station ${esc(d.spot.getijStation)}</span></div>
        ${tideChart(st, from, to)}
        <div class="facts">${extremes.map((e) => `<div><span class="muted">${e.type === 'HW' ? 'Hoogwater' : 'Laagwater'}</span><b>${dayLabel(e.t)} ${hm(e.t)}</b><span class="muted">${e.h >= 0 ? '+' : ''}${e.h.toFixed(2).replace('.', ',')} m</span></div>`).join('')}</div>
      </section>
      <section class="card">
        <h2>Spot</h2>
        <div class="facts">
          <div><span class="muted">Watertemperatuur</span><b>${d.marine?.sst != null ? `${r(d.marine.sst)} °C` : '–'}</b></div>
          <div><span class="muted">Golfhoogte</span><b>${d.marine?.wave != null ? `${d.marine.wave.toFixed(1).replace('.', ',')} m` : '–'}</b></div>
          <div><span class="muted">Luchttemperatuur</span><b>${h ? `${r(h.temp)} °C` : '–'}</b></div>
          <div><span class="muted">Goede windrichting</span><b>${d.spot.goedeSector[0]}°–${d.spot.goedeSector[1]}°</b></div>
        </div>
        <p class="muted">${esc(d.spot.notitie)}</p>
        <p><a href="https://www.openstreetmap.org/?mlat=${d.spot.lat}&mlon=${d.spot.lon}#map=14/${d.spot.lat}/${d.spot.lon}" target="_blank" rel="noopener">Bekijk op de kaart</a></p>
      </section>
    </div>${sourceNote()}`;
}

/* ---------- Gear ---------- */

let gearSpot = 0;
export const setGearSpot = (i: number) => { gearSpot = i; };

export function pageGear(): string {
  const s = state.settings;
  const list = orderedData();
  const d = list[Math.min(gearSpot, list.length - 1)];
  const h = d ? nowHour(d) : undefined;
  const setup = h ? bestSetup(s.gear, h.eff, s.gewicht, s.power) : [];
  const kites = kiteOptions(s.gear, s.gewicht, s.power);
  const pos = (k: number) => Math.max(0, Math.min(100, ((k - 8) / 28) * 100));
  const gaps = quiverGaps(kites);
  const groups: [GearItem['soort'], string][] = [['kite', 'Kites'], ['bar', 'Bars'], ['board', 'Boards']];

  return `<div class="cols cols-gear">
    <div class="stack">
      <section class="card dark">
        <div class="card-head"><div><p class="eyebrow">Beste setup${h ? ` · ${hm(h.t)}` : ''}</p><h2>${d ? `${esc(d.spot.kort)}${h ? ` · ${r(h.avg)} kn, vlagen ${r(h.gust)}` : ''}` : 'Geen data'}</h2></div>
        <div class="seg" role="group" aria-label="Kies spot">${list.map((x, i) => `<button type="button" data-action="gearspot" data-i="${i}" aria-pressed="${i === gearSpot}">${esc(x.spot.kort)}</button>`).join('')}</div></div>
        ${h && h.dirStatus === 'aflandig' ? '<p class="badge badge-danger">Aflandige wind: niet kiten op deze spot.</p>' : ''}
        <div class="setup">${setup.map((p) => `<div class="setup-item"><span class="eyebrow">${p.rol}</span><b>${esc(p.naam)}</b><p>${esc(p.waarom)}</p><span class="tag tag-${p.toon}">${esc(p.tag)}</span></div>`).join('')}</div>
      </section>
      <section class="card">
        <div class="card-head"><h2>Windbereik van je kites</h2><span class="muted">${s.gewicht} kg · geschat · donker = sweet spot · lijn = nu</span></div>
        ${kites.length ? kites.map((k) => `<div class="range"><div><b>${esc(k.item.merk)} ${esc(k.item.model)} ${k.size}m</b><span class="muted">${k.lo}–${k.hi} kn</span></div>
          <div class="range-track"><i style="left:${pos(k.lo)}%;width:${pos(k.hi) - pos(k.lo)}%"></i><i class="sweet" style="left:${pos(k.sweetLo)}%;width:${pos(k.sweetHi) - pos(k.sweetLo)}%"></i>${h ? `<i class="nowline" style="left:${pos(h.eff)}%"></i>` : ''}</div></div>`).join('')
          + '<div class="range"><div></div><div class="ticks"><span>8</span><span>15</span><span>22</span><span>29</span><span>36 kn</span></div></div>' : '<p class="muted">Nog geen kites ingevuld.</p>'}
        <div class="chips">${gaps.map((g) => `<span class="badge badge-warn">${esc(g)}</span>`).join('')}</div>
      </section>
    </div>
    <div class="stack">
      <section class="card">
        <h2>Jouw gear</h2>
        ${groups.map(([soort, titel]) => {
          const items = s.gear.filter((g) => g.soort === soort);
          return `<p class="eyebrow">${titel}</p>${items.length ? items.map((g) => `<div class="gearitem"><div><b>${esc(g.merk)} ${esc(g.model)}${soort === 'kite' ? ` ${esc(g.maat)}m` : ''}</b><span class="muted">${soort === 'kite' ? (() => { const e = estimatedRange(parseFloat(g.maat), s.gewicht, s.power); return `${e.lo}–${e.hi} kn (geschat)`; })() : soort === 'bar' ? (g.maat ? `${esc(g.maat)} cm` : 'maat onbekend') : esc(g.maat)}</span></div><button type="button" class="icon" data-action="delgear" data-id="${esc(g.id)}" aria-label="Verwijder ${esc(g.merk)} ${esc(g.model)}">×</button></div>`).join('') : '<p class="muted">Nog niets.</p>'}`;
        }).join('')}
      </section>
      <section class="card">
        <h2>Gear toevoegen</h2>
        <form id="gearform" class="form" novalidate>
          <label>Soort<select name="soort"><option value="kite">Kite</option><option value="bar">Bar</option><option value="board">Board</option></select></label>
          <div class="two"><label>Merk<input name="merk" placeholder="Duotone" autocomplete="off"></label><label>Model en jaar<input name="model" placeholder="Rebel SLS 2024" autocomplete="off"></label></div>
          <label>Maat<input name="maat" placeholder="Kite: 12 · bar: 52 · board: 138 x 42" autocomplete="off"></label>
          <p class="formerror" role="alert" hidden></p>
          <button type="submit" class="primary">Toevoegen</button>
          <p class="muted small">Windbereik is geschat met de formule. Voor Ozone Edge kent de app het bar-advies van de fabrikant.</p>
        </form>
      </section>
    </div>
  </div>`;
}

/* ---------- Instellingen ---------- */

export function pageSettings(): string {
  const s = state.settings;
  const sizes = [12, 15, 18, 22, 26, 30].map((k) => {
    const m = idealSize(s.gewicht, k, s.power);
    return `<div class="sizecell"><span style="${cellStyle(k)}">${k} kn</span><b>${m > 17 ? '–' : `${r(m)}m`}</b></div>`;
  }).join('');
  return `<div class="cols">
    <section class="card form">
      <h2>Jij</h2>
      <label>Gewicht (kg)<input type="number" min="35" max="140" step="1" value="${s.gewicht}" data-setting="gewicht"></label>
      <fieldset><legend>Power</legend><div class="seg">${[-2, -1, 0, 1, 2].map((p) => `<button type="button" data-action="power" data-p="${p}" aria-pressed="${p === s.power}">${p > 0 ? '+' : ''}${p}</button>`).join('')}</div><span class="muted small">Meer power = grotere kite. Standaard +1 voor boosten.</span></fieldset>
      <label>Vlagen meetellen<select data-setting="gust">${[[0, 'Niet'], [1 / 3, 'Een derde (standaard)'], [0.5, 'Half'], [1, 'Volledig']].map(([v, t]) => `<option value="${v}"${Math.abs(Number(v) - s.gust) < 0.01 ? ' selected' : ''}>${t}</option>`).join('')}</select></label>
      <div><p class="eyebrow">Ideale maat bij constante wind</p><div class="sizes">${sizes}</div></div>
    </section>
    <section class="card form">
      <h2>Spots</h2>
      <p class="muted small">Volgorde = volgorde in de lijsten; bij gelijke score wint de bovenste.</p>
      ${s.favorieten.map((id, i) => { const sp = SPOTS.find((x) => x.id === id); return sp ? `<div class="gearitem"><b>${esc(sp.naam)}</b><span><button type="button" class="icon" data-action="up" data-i="${i}" aria-label="${esc(sp.kort)} omhoog"${i === 0 ? ' disabled' : ''}>↑</button><button type="button" class="icon" data-action="down" data-i="${i}" aria-label="${esc(sp.kort)} omlaag"${i === s.favorieten.length - 1 ? ' disabled' : ''}>↓</button></span></div>` : ''; }).join('')}
      <h2>Back-up</h2>
      <p class="muted small">Zet je instellingen en gear over tussen telefoon en laptop.</p>
      <div class="two"><button type="button" data-action="export">Exporteren</button><label class="filebtn">Importeren<input type="file" accept="application/json" data-action="import"></label></div>
    </section>
  </div>`;
}

/* ---------- Over ---------- */

export function pageOver(): string {
  return `<section class="card prose">
    <h2>Over dit dashboard</h2>
    <p><b>Wind, vlagen, regen en temperatuur</b>: KNMI HARMONIE AROME via <a href="https://open-meteo.com/en/docs/knmi-api" target="_blank" rel="noopener">Open-Meteo</a> (model <code>knmi_seamless</code>), elk uur ververst. Laatst opgehaald ${stamp(state.windFetched)}.</p>
    <p><b>Getij</b>: astronomische voorspelling van <a href="https://rijkswaterstaatdata.nl/waterdata/" target="_blank" rel="noopener">Rijkswaterstaat</a>, dagelijks opgehaald. Lukt dat niet, dan een benadering uit het zeemodel van Open-Meteo (minder nauwkeurig aan de kust). Nu: ${state.tideSource === 'rws' ? 'Rijkswaterstaat' : state.tideSource === 'benadering' ? 'benadering' : 'niet beschikbaar'}.</p>
    <p><b>Watertemperatuur en golven</b>: Open-Meteo Marine, met modellen van DWD en Météo-France.</p>
    <h3>Ideale kitemaat</h3>
    <p>maat (m²) = gewicht ÷ effectieve wind × (2,2 + 0,1 × power). Effectieve wind = gemiddelde wind + deel van het verschil met de vlagen (instelbaar). Een vuistregel: board, kite en niveau spelen ook mee.</p>
    <h3>Kleurschaal</h3>
    <div class="legend"><div class="bar" style="background:${legendGradient()}"></div><div class="ticks"><span>0</span><span>10</span><span>20</span><span>30</span><span>40 kn</span></div></div>
    <p class="muted small">Check altijd de borden en kitezones ter plekke. Dit dashboard vervangt geen eigen inschatting.</p>
  </section>`;
}

