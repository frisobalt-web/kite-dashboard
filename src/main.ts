import './style.css';
import { state, loadAll, updateSettings } from './state';
import { pageNu, pageWeek, pageSpot, pageGear, pageSettings, pageOver, setGearSpot } from './pages';
import { DEFAULTS, type GearItem, type Settings } from './lib/settings';

const app = document.getElementById('app')!;

const NAV: [string, string, string][] = [
  ['#/', 'Nu', '<path d="M3 8h11a3 3 0 1 0-3-3"/><path d="M3 12h16a3 3 0 1 1-3 3"/><path d="M3 16h7"/>'],
  ['#/week', 'Week', '<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M9 3v4M15 3v4"/>'],
  ['#/gear', 'Gear', '<path d="M12 2l7 7-7 13-7-13z"/><path d="M5 9h14"/>'],
  ['#/instellingen', 'Instellingen', '<path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="17" r="2"/>'],
  ['#/over', 'Over', '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>']
];

function route(): { name: string; arg?: string } {
  const h = location.hash.replace(/^#/, '') || '/';
  const m = h.match(/^\/spot\/([\w-]+)/);
  if (m) return { name: 'spot', arg: m[1] };
  return { name: h.split('/')[1] || 'nu' };
}

function navHtml(active: string): string {
  const icon = (p: string) => `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;
  const key = (href: string) => href.replace('#/', '') || 'nu';
  return NAV.map(([href, label, p]) => `<a href="${href}" class="${key(href) === active ? 'active' : ''}"${key(href) === active ? ' aria-current="page"' : ''}>${icon(p)}<span>${label}</span></a>`).join('');
}

function render(): void {
  const r = route();
  const active = r.name === 'spot' ? 'nu' : r.name;
  let body = '';
  switch (r.name) {
    case 'week': body = pageWeek(); break;
    case 'spot': body = pageSpot(r.arg!); break;
    case 'gear': body = pageGear(); break;
    case 'instellingen': body = pageSettings(); break;
    case 'over': body = pageOver(); break;
    default: body = pageNu();
  }
  const titles: Record<string, string> = { nu: 'Wind', week: 'Week', gear: 'Gear', instellingen: 'Instellingen', over: 'Over', spot: 'Spot' };
  app.innerHTML = `
    <header class="top">
      <a class="brand" href="#/"><span class="logo"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#97C459" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 2l7 7-7 13-7-13z"/><path d="M5 9h14"/></svg></span><span><b>Kite-dashboard</b><small>Zuid-Hollandse kust</small></span></a>
      <h1 class="mobtitle">${titles[active] || 'Wind'}</h1>
      <nav class="desknav" aria-label="Hoofdmenu">${navHtml(active)}</nav>
      <button type="button" class="icon refresh" data-action="refresh" aria-label="Vernieuwen"${state.loading ? ' aria-busy="true"' : ''}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 11a8 8 0 1 0-2.3 5.7"/><path d="M20 4v7h-7"/></svg></button>
    </header>
    <main class="page page-${r.name}">${body}</main>
    <nav class="tabbar" aria-label="Tabbladen">${navHtml(active)}</nav>`;
}

async function refresh(force: boolean): Promise<void> {
  state.loading = true;
  render();
  await loadAll(force);
  render();
}

function moveFav(i: number, dir: -1 | 1): void {
  const f = [...state.settings.favorieten];
  const j = i + dir;
  if (j < 0 || j >= f.length) return;
  [f[i], f[j]] = [f[j], f[i]];
  updateSettings({ favorieten: f });
}

app.addEventListener('click', (e) => {
  const el = (e.target as HTMLElement).closest<HTMLElement>('[data-action]');
  if (!el || el.tagName === 'INPUT') return;
  const a = el.dataset.action;
  if (a === 'refresh') { void refresh(true); return; }
  if (a === 'gearspot') { setGearSpot(Number(el.dataset.i)); render(); return; }
  if (a === 'delgear') { updateSettings({ gear: state.settings.gear.filter((g) => g.id !== el.dataset.id) }); render(); return; }
  if (a === 'power') { updateSettings({ power: Number(el.dataset.p) }); render(); return; }
  if (a === 'up' || a === 'down') { moveFav(Number(el.dataset.i), a === 'up' ? -1 : 1); render(); return; }
  if (a === 'export') {
    const blob = new Blob([JSON.stringify(state.settings, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'kite-dashboard-instellingen.json';
    link.click();
    URL.revokeObjectURL(link.href);
  }
});

app.addEventListener('change', async (e) => {
  const el = e.target as HTMLInputElement | HTMLSelectElement;
  const key = el.dataset.setting;
  if (key === 'gewicht') {
    const v = Number(el.value);
    if (v >= 35 && v <= 140) { updateSettings({ gewicht: Math.round(v) }); render(); }
    return;
  }
  if (key === 'gust') { updateSettings({ gust: Number(el.value) }); render(); return; }
  if (el instanceof HTMLInputElement && el.dataset.action === 'import' && el.files?.[0]) {
    try {
      const data = JSON.parse(await el.files[0].text()) as Partial<Settings>;
      updateSettings({ ...DEFAULTS, ...data });
      render();
    } catch {
      alert('Dit bestand kon niet worden gelezen.');
    }
  }
});

app.addEventListener('submit', (e) => {
  const form = e.target as HTMLFormElement;
  if (form.id !== 'gearform') return;
  e.preventDefault();
  const f = new FormData(form);
  const soort = String(f.get('soort')) as GearItem['soort'];
  const merk = String(f.get('merk') || '').trim();
  const model = String(f.get('model') || '').trim();
  const maat = String(f.get('maat') || '').trim().replace(',', '.');
  const err = form.querySelector<HTMLElement>('.formerror')!;
  const fail = (msg: string) => { err.textContent = msg; err.hidden = false; };
  if (!merk || !model) return fail('Vul merk en model in.');
  if (soort === 'kite' && !(parseFloat(maat) > 0 && parseFloat(maat) < 25)) return fail('Vul de maat van de kite in m² in, bijvoorbeeld 12.');
  const item: GearItem = { id: `g${Date.now()}`, soort, merk, model, maat: soort === 'kite' ? String(parseFloat(maat)) : maat };
  updateSettings({ gear: [...state.settings.gear, item] });
  render();
});

app.addEventListener('input', (e) => {
  const form = (e.target as HTMLElement).closest('form');
  const err = form?.querySelector<HTMLElement>('.formerror');
  if (err) err.hidden = true;
});

window.addEventListener('hashchange', () => { render(); window.scrollTo(0, 0); });
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && Date.now() - state.windFetched > 15 * 60_000) void refresh(false);
});

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => undefined);
}

void refresh(false);
