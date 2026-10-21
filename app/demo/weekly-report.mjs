// The jury sample mission: "Raport tygodniowy z danych testowych".
// Fictional orders of a fictional tea shop, and the 7 tasks' real computations.
// The same code is used by the page, by demo-reset/demo-agent and by the tests, so the
// results (and their SHA-256 fingerprints) are really computed, never canned.
// spec.md > Sample Builder and Sample Agent

import { sha256Hex } from '../engine/hash.mjs';

export const INPUT_FILE = 'input/zamowienia.csv';

// Fictional data. Any resemblance to a real shop is accidental.
export const INPUT_CSV = `id,data,klient,produkt,ilosc,cena
Z-001,2026-10-12,K-01,Herbata zielona,2,18.50
Z-002,2026-10-12,K-02,Czarka gliniana,1,24.00
Z-003,2026-10-12,K-03,Napar owocowy,3,12.90
Z-004,2026-10-13,K-04,Herbata czarna,2,16.00
Z-005,2026-10-13,K-01,Matcha,1,49.00
Z-006,2026-10-13,K-05,Herbata zielona,1,18.50
Z-007,2026-10-14,K-06,Imbryk szklany,1,79.00
Z-008,2026-10-14,K-02,Napar owocowy,2,12.90
Z-009,2026-10-14,K-07,Herbata czarna,4,16.00
Z-010,2026-10-14,K-08,Czarka gliniana,2,24.00
Z-011,2026-10-15,K-03,Matcha,2,49.00
Z-012,2026-10-15,K-09,Herbata zielona,3,18.50
Z-013,2026-10-15,K-10,Napar owocowy,1,12.90
Z-014,2026-10-16,K-11,Imbryk szklany,1,79.00
Z-015,2026-10-16,K-04,Herbata czarna,2,16.00
Z-016,2026-10-16,K-12,Matcha,1,49.00
Z-017,2026-10-16,K-13,Herbata zielona,0,18.50
Z-018,2026-10-16,K-05,Napar owocowy,5,12.90
Z-019,2026-10-17,K-14,Czarka gliniana,3,24.00
Z-020,2026-10-17,K-06,Herbata zielona,2,18.50
Z-021,2026-10-17,K-15,Matcha,1,49.00
Z-022,2026-10-17,K-16,Imbryk szklany,2,79.00
Z-023,2026-10-18,K-07,Herbata czarna,3,16.00
Z-024,2026-10-18,K-17,Napar owocowy,2,12.90
`;

const WEEK_START = '2026-10-12';
const WEEK_END = '2026-10-18';
const DAY_NAMES = ['niedziela', 'poniedziałek', 'wtorek', 'środa', 'czwartek', 'piątek', 'sobota'];

function json(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function grosze(price, qty) {
  return Math.round(Number(price) * 100) * Number(qty);
}

function zl(groszeValue) {
  return (groszeValue / 100).toFixed(2);
}

function ordersWord(n) {
  const lastTwo = n % 100;
  const last = n % 10;
  if (n === 1) return 'zamówienie';
  if (last >= 2 && last <= 4 && !(lastTwo >= 12 && lastTwo <= 14)) return 'zamówienia';
  return 'zamówień';
}

function dayName(date) {
  return DAY_NAMES[new Date(`${date}T12:00:00Z`).getUTCDay()];
}

async function readJson(read, path) {
  const text = await read(path);
  if (text == null) throw new Error(`missing input: ${path}`);
  return JSON.parse(text);
}

// --- the seven tasks -------------------------------------------------------------

async function loadOrders(read) {
  const csv = await read(INPUT_FILE);
  if (csv == null) throw new Error(`missing input: ${INPUT_FILE}`);
  const [header, ...lines] = csv.trim().split(/\r?\n/);
  const columns = header.split(',');
  const orders = lines.map((line) => {
    const cells = line.split(',');
    const row = Object.fromEntries(columns.map((c, i) => [c, cells[i]]));
    return { id: row.id, data: row.data, klient: row.klient, produkt: row.produkt, ilosc: Number(row.ilosc), cena: Number(row.cena) };
  });
  return json({ zrodlo: INPUT_FILE, columns, rows: orders.length, orders });
}

async function validateOrders(read) {
  const { orders } = await readJson(read, 'out/01-zamowienia.json');
  const seen = new Set();
  const invalid = [];
  for (const o of orders) {
    const reasons = [];
    if (seen.has(o.id)) reasons.push('powtórzony identyfikator');
    seen.add(o.id);
    if (!(o.data >= WEEK_START && o.data <= WEEK_END)) reasons.push('data poza tygodniem');
    if (!Number.isInteger(o.ilosc) || o.ilosc <= 0) reasons.push('ilość <= 0');
    if (!(o.cena > 0)) reasons.push('cena <= 0');
    if (reasons.length) invalid.push({ id: o.id, powody: reasons });
  }
  return json({ checked: orders.length, valid: orders.length - invalid.length, invalid });
}

async function dailyTotals(read) {
  const { orders } = await readJson(read, 'out/01-zamowienia.json');
  const { invalid } = await readJson(read, 'out/02-walidacja.json');
  const bad = new Set(invalid.map((i) => i.id));
  const byDay = new Map();
  for (const o of orders) {
    if (bad.has(o.id)) continue;
    const day = byDay.get(o.data) || { date: o.data, orders: 0, grosze: 0 };
    day.orders += 1;
    day.grosze += grosze(o.cena, o.ilosc);
    byDay.set(o.data, day);
  }
  const days = [...byDay.values()].sort((a, b) => a.date.localeCompare(b.date));
  const week = days.reduce((sum, d) => sum + d.grosze, 0);
  return json({
    days: days.length,
    waluta: 'PLN',
    byDay: days.map((d) => ({ date: d.date, dzien: dayName(d.date), orders: d.orders, total: zl(d.grosze) })),
    weekTotal: zl(week),
  });
}

async function summaryText(read, { complete = true } = {}) {
  const totals = await readJson(read, 'out/03-sumy.json');
  const validation = await readJson(read, 'out/02-walidacja.json');
  const best = [...totals.byDay].sort((a, b) => Number(b.total) - Number(a.total))[0];
  const weakest = [...totals.byDay].sort((a, b) => Number(a.total) - Number(b.total))[0];
  const lines = [
    '# Podsumowanie tygodnia (dane fikcyjne)',
    '',
    '## Liczby',
    `- Zamówienia poprawne: ${validation.valid} z ${validation.checked}`,
    `- Sprzedaż w tygodniu: ${totals.weekTotal} zł`,
    `- Dni z zamówieniami: ${totals.days}`,
    '',
    '## Najlepszy dzień',
    `- ${best.dzien} ${best.date}: ${best.total} zł (${best.orders} ${ordersWord(best.orders)})`,
    '',
  ];
  if (!complete) return `${lines.join('\n')}`;
  lines.push(
    '## Wnioski',
    `- Najsłabszy dzień: ${weakest.dzien} ${weakest.date} (${weakest.total} zł).`,
    `- Odrzucone zamówienia: ${validation.invalid.map((i) => `${i.id} (${i.powody.join(', ')})`).join('; ') || 'brak'}.`,
    '- Wszystkie liczby wyliczone z pliku wejściowego; patrz pliki 01–03.',
    '',
  );
  return lines.join('\n');
}

async function summarize(read) {
  return summaryText(read, { complete: true });
}

export async function partialSummary(read) {
  return summaryText(read, { complete: false });
}

async function chartData(read) {
  const totals = await readJson(read, 'out/03-sumy.json');
  return `dzien,suma\n${totals.byDay.map((d) => `${d.date},${d.total}`).join('\n')}\n`;
}

async function selfTest(read) {
  const loaded = await readJson(read, 'out/01-zamowienia.json');
  const validation = await readJson(read, 'out/02-walidacja.json');
  const totals = await readJson(read, 'out/03-sumy.json');
  const chart = await read('out/05-wykres.csv');
  const bad = new Set(validation.invalid.map((i) => i.id));
  const recomputed = new Map();
  for (const o of loaded.orders) {
    if (bad.has(o.id)) continue;
    recomputed.set(o.data, (recomputed.get(o.data) || 0) + grosze(o.cena, o.ilosc));
  }
  const weekRecomputed = [...recomputed.values()].reduce((a, b) => a + b, 0);
  const chartRows = chart == null ? [] : chart.trim().split(/\r?\n/).slice(1);
  const details = [
    { check: 'liczba wierszy = sprawdzone', ok: loaded.rows === validation.checked },
    { check: 'poprawne + odrzucone = wszystkie', ok: validation.valid + validation.invalid.length === validation.checked },
    { check: 'sumy dzienne zgodne z danymi', ok: totals.byDay.every((d) => zl(recomputed.get(d.date) || 0) === d.total) },
    { check: 'suma tygodnia zgodna z danymi', ok: zl(weekRecomputed) === totals.weekTotal },
    { check: 'wykres ma wszystkie dni', ok: chartRows.length === totals.days },
  ];
  return json({ checks: details.length, failed: details.filter((d) => !d.ok).length, details });
}

async function finalReport(read) {
  const files = ['out/01-zamowienia.json', 'out/02-walidacja.json', 'out/03-sumy.json', 'out/04-podsumowanie.md', 'out/05-wykres.csv', 'out/06-autotest.json'];
  const rows = [];
  for (const file of files) {
    const text = await read(file);
    if (text == null) throw new Error(`missing input: ${file}`);
    rows.push(`| ${file} | ${await sha256Hex(text)} |`);
  }
  const totals = await readJson(read, 'out/03-sumy.json');
  const test = await readJson(read, 'out/06-autotest.json');
  return [
    '# Raport końcowy (dane fikcyjne)',
    '',
    `Sprzedaż w tygodniu ${WEEK_START} – ${WEEK_END}: ${totals.weekTotal} zł.`,
    `Autotest: ${test.checks - test.failed} z ${test.checks} sprawdzeń zaliczonych.`,
    '',
    '## Dowody',
    '',
    '| plik | SHA-256 |',
    '|---|---|',
    ...rows,
    '',
  ].join('\n');
}

export const WEEKLY_TASKS = [
  { id: 1, title: { pl: 'Wczytaj zamówienia', en: 'Load the orders' }, expectedMinutes: 5,
    artifact: { file: 'out/01-zamowienia.json', check: { type: 'json', path: 'rows', equals: 24 } }, run: loadOrders },
  { id: 2, title: { pl: 'Sprawdź poprawność danych', en: 'Validate the data' }, expectedMinutes: 5,
    artifact: { file: 'out/02-walidacja.json', check: { type: 'json', path: 'checked', equals: 24 } }, run: validateOrders },
  { id: 3, title: { pl: 'Policz sumy dzienne', en: 'Compute daily totals' }, expectedMinutes: 5,
    artifact: { file: 'out/03-sumy.json', check: { type: 'json', path: 'days', equals: 7 } }, run: dailyTotals },
  { id: 4, title: { pl: 'Napisz podsumowanie tygodnia', en: 'Write the weekly summary' }, expectedMinutes: 10,
    artifact: { file: 'out/04-podsumowanie.md', check: { type: 'contains', text: '## Wnioski' } }, run: summarize },
  { id: 5, title: { pl: 'Przygotuj dane do wykresu', en: 'Prepare the chart data' }, expectedMinutes: 5,
    artifact: { file: 'out/05-wykres.csv', check: { type: 'contains', text: 'dzien,suma' } }, run: chartData },
  { id: 6, title: { pl: 'Autotest wyników', en: 'Self-test the results' }, expectedMinutes: 5,
    artifact: { file: 'out/06-autotest.json', check: { type: 'json', path: 'failed', equals: 0 } }, run: selfTest },
  { id: 7, title: { pl: 'Raport końcowy z dowodami', en: 'Final report with proofs' }, expectedMinutes: 10,
    artifact: { file: 'out/07-raport.md', check: { type: 'contains', text: '## Dowody' } }, run: finalReport },
];

export function weeklyMission() {
  return {
    format: 'mission-rescue/1',
    id: 'weekly-report',
    title: { pl: 'Raport tygodniowy z danych testowych', en: 'Weekly report from test data' },
    agent: { pl: 'Przykładowy agent (demo)', en: 'Sample agent (demo)' },
    plan: 'ChatGPT Pro',
    stallMinutes: 30,
    demo: 'weekly-report',
    tasks: WEEKLY_TASKS.map(({ id, title, expectedMinutes, artifact }) => ({ id, title, expectedMinutes, artifact })),
  };
}

export function weeklyTask(id) {
  return WEEKLY_TASKS.find((t) => t.id === id) || null;
}
