// Haalt de astronomische getijvoorspelling (10-minutenstanden) op bij Rijkswaterstaat
// en schrijft public/data/tides.json. Draait dagelijks via .github/workflows/tides.yml.
import { writeFile, readFile, mkdir } from 'node:fs/promises';

const BASE = 'https://ddapi20-waterwebservices.rijkswaterstaat.nl';
const OUT = new URL('../public/data/tides.json', import.meta.url);
const DAYS = 8;
const STATIONS = {
  scheveningen: { codes: ['scheveningen', 'scheveningen.buitenhaven'], zoek: /schevening/i },
  hoekvanholland: { codes: ['hoekvanholland', 'hoekvanholland.boei'], zoek: /hoek ?van ?holland/i }
};
const HEADERS = { 'Content-Type': 'application/json', Accept: 'application/json', 'X-API-KEY': 'kite-dashboard' };

async function post(path, body) {
  const res = await fetch(BASE + path, { method: 'POST', headers: HEADERS, body: JSON.stringify(body) });
  const text = await res.text();
  if (!res.ok) throw new Error(`${path} HTTP ${res.status}: ${text.slice(0, 300)}`);
  return JSON.parse(text);
}

function period(from, to) {
  return { Begindatumtijd: from.toISOString().replace('Z', '+00:00'), Einddatumtijd: to.toISOString().replace('Z', '+00:00') };
}

async function catalogCodes(re) {
  try {
    const cat = await post('/METADATASERVICES/OphalenCatalogus', { CatalogusFilter: { Compartimenten: true, Grootheden: true, ProcesTypes: true } });
    const list = cat.LocatieLijst || [];
    return list.filter((l) => re.test(`${l.Naam} ${l.Code}`)).map((l) => l.Code);
  } catch (e) {
    console.warn('Catalogus niet beschikbaar:', e.message);
    return [];
  }
}

function extractSeries(json) {
  const lists = json.WaarnemingenLijst || [];
  let best = [];
  for (const w of lists) {
    const rows = (w.MetingenLijst || [])
      .map((m) => [m.Tijdstip, m.Meetwaarde?.Waarde_Numeriek])
      .filter(([t, v]) => t && typeof v === 'number' && Math.abs(v) < 1000);
    if (rows.length > best.length) best = rows;
  }
  return best.map(([t, v]) => [new Date(t).toISOString(), Math.round(v)]).sort((a, b) => (a[0] < b[0] ? -1 : 1));
}

async function fetchStation(id, cfg, from, to) {
  const tried = new Set();
  const candidates = [...cfg.codes];
  for (let pass = 0; pass < 2; pass++) {
    for (const code of candidates) {
      if (tried.has(code)) continue;
      tried.add(code);
      try {
        const json = await post('/ONLINEWAARNEMINGENSERVICES/OphalenWaarnemingen', {
          Locatie: { Code: code },
          AquoPlusWaarnemingMetadata: { AquoMetadata: { Compartiment: { Code: 'OW' }, Grootheid: { Code: 'WATHTE' }, ProcesType: 'astronomisch' } },
          Periode: period(from, to)
        });
        const series = extractSeries(json);
        if (series.length > 100) {
          console.log(`${id}: ${series.length} standen via locatiecode "${code}"`);
          return { code, reeks: series };
        }
        console.warn(`${id}: code "${code}" gaf ${series.length} standen`);
      } catch (e) {
        console.warn(`${id}: code "${code}" mislukt: ${e.message}`);
      }
    }
    if (pass === 0) candidates.push(...(await catalogCodes(cfg.zoek)));
  }
  throw new Error(`Geen getijdata gevonden voor ${id}`);
}

const from = new Date(Date.now() - 6 * 3600_000);
from.setUTCMinutes(0, 0, 0);
const to = new Date(from.getTime() + DAYS * 86400_000);
const stations = {};
const failures = [];
for (const [id, cfg] of Object.entries(STATIONS)) {
  try {
    stations[id] = await fetchStation(id, cfg, from, to);
  } catch (e) {
    failures.push(e.message);
  }
}

if (!Object.keys(stations).length) {
  console.error('Alle getijstations mislukt; het bestaande bestand blijft staan.', failures);
  process.exit(1);
}

let previous = {};
try { previous = JSON.parse(await readFile(OUT, 'utf8')).stations || {}; } catch { /* eerste keer */ }
for (const id of Object.keys(STATIONS)) if (!stations[id] && previous[id]) stations[id] = previous[id];

await mkdir(new URL('.', OUT), { recursive: true });
await writeFile(OUT, JSON.stringify({ bijgewerkt: new Date().toISOString(), bron: 'Rijkswaterstaat WaterWebservices, astronomisch getij (cm t.o.v. NAP)', stations }) + '\n');
console.log('tides.json geschreven', failures.length ? `(met fouten: ${failures.join('; ')})` : '');
