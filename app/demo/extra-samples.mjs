// Extra sample missions: one for every kind of stop the detector tells apart, plus an
// outside effect waiting for a person's confirmation and a broken mission file.
// Every "done" result is a real file with its real SHA-256; all data is fictional and all
// times are relative to "now", so each sample shows its state when it is built.
// spec.md > Sample Builder and Sample Agent · prd.md > Stall Detector

import { sha256Hex } from '../engine/hash.mjs';

const MIN = 60000;
const iso = (ms) => new Date(ms).toISOString();
const json = (value) => `${JSON.stringify(value, null, 2)}\n`;
const jsonl = (entries) => `${entries.map((e) => JSON.stringify(e)).join('\n')}\n`;
const both = (pl, en) => ({ pl, en });

function task(id, title, expectedMinutes, file, check, effect) {
  return { id, title, expectedMinutes, artifact: { file, check }, ...(effect ? { effect } : {}) };
}

const contains = (text) => ({ type: 'contains', text });
const equals = (path, value) => ({ type: 'json', path, equals: value });

// ---- the samples ------------------------------------------------------------------

const SAMPLES = [
  {
    dir: 'menu-working',
    mission: {
      id: 'menu-working',
      title: both('Tłumaczenie menu na angielski', 'Translating the menu into English'),
      agent: both('Codex (przykład)', 'Codex (sample)'),
      plan: 'ChatGPT Pro',
      tasks: [
        task(1, both('Spisz menu', 'Write down the menu'), 5, 'out/1-menu.md', contains('## Menu')),
        task(2, both('Przetłumacz pozycje', 'Translate the items'), 20, 'out/2-menu-en.md', contains('## Menu (EN)')),
        task(3, both('Sprawdź ceny i alergeny', 'Check prices and allergens'), 10, 'out/3-kontrola.json', equals('failed', 0)),
      ],
    },
    artifacts: {
      1: () => '## Menu\n\n- Zupa pomidorowa z bazylią: 14 zł\n- Pierogi ruskie (8 szt.): 24 zł\n- Sernik z wanilią: 16 zł\n- Herbata zielona: 9 zł\n',
    },
    timeline: [
      { min: -14, event: 'started', task: 1 },
      { min: -9, event: 'done', task: 1 },
      { min: -8, event: 'started', task: 2 },
      { min: -3, event: 'progress', task: 2, message: both('Przetłumaczone 7 z 12 pozycji', '7 of 12 items translated') },
    ],
  },
  {
    dir: 'newsletter-limit',
    mission: {
      id: 'newsletter-limit',
      title: both('Newsletter dla klientów herbaciarni', "The tea shop's customer newsletter"),
      agent: both('Claude Code (przykład)', 'Claude Code (sample)'),
      plan: 'Claude Max',
      tasks: [
        task(1, both('Zbierz nowości tygodnia', "Collect the week's news"), 10, 'out/1-nowosci.md', contains('## Nowości')),
        task(2, both('Napisz szkic newslettera', 'Write the newsletter draft'), 15, 'out/2-szkic.md', contains('## Szkic')),
        task(3, both('Popraw język i ton', 'Polish the language and tone'), 10, 'out/3-wersja-koncowa.md', contains('## Wersja końcowa')),
        task(4, both('Przygotuj wersję angielską', 'Prepare the English version'), 10, 'out/4-english.md', contains('## English version')),
        task(5, both('Lista kontrolna przed wysyłką', 'Pre-send checklist'), 5, 'out/5-lista.json', equals('ready', true)),
      ],
    },
    artifacts: {
      1: () => '## Nowości\n\n- Nowa herbata: sencha z wiśnią\n- Warsztaty parzenia w sobotę o 10:00\n- Darmowa dostawa od 120 zł\n',
      2: () => '## Szkic\n\nDzień dobry!\n\nW tym tygodniu mamy dla Was senchę z wiśnią, sobotnie warsztaty parzenia i darmową dostawę od 120 zł.\n\nDo zobaczenia przy herbacie!\n',
    },
    timeline: [
      { min: -95, event: 'started', task: 1 },
      { min: -88, event: 'done', task: 1 },
      { min: -87, event: 'started', task: 2 },
      { min: -70, event: 'done', task: 2 },
      { min: -69, event: 'started', task: 3 },
      {
        min: -66,
        event: 'waiting',
        task: 3,
        reason: 'limit',
        untilMin: 35,
        message: both('Limit 5 h w Claude Max wyczerpany. Wracam po odnowieniu.', 'The Claude Max 5-hour limit is used up. Back after the reset.'),
      },
    ],
  },
  {
    dir: 'logo-human',
    mission: {
      id: 'logo-human',
      title: both('Strona wizytówka: wybór logo', 'Business card site: choosing a logo'),
      agent: both('Codex (przykład)', 'Codex (sample)'),
      plan: 'ChatGPT Pro',
      tasks: [
        task(1, both('Zbierz treści o firmie', 'Collect the company content'), 10, 'out/1-tresci.md', contains('## O nas')),
        task(2, both('Przygotuj dwa projekty logo', 'Prepare two logo designs'), 15, 'out/2-logo.json', equals('variants', 2)),
        task(3, both('Zbuduj stronę z wybranym logo', 'Build the page with the chosen logo'), 20, 'out/3-strona.html', contains('<h1>')),
        task(4, both('Sprawdź stronę na telefonie', 'Check the page on a phone'), 10, 'out/4-telefon.json', equals('ok', true)),
      ],
    },
    artifacts: {
      1: () => '## O nas\n\nMała pracownia ceramiki: kubki, czarki i talerze robione ręcznie.\n\n## Kontakt\n\nkontakt@example.com\n',
      2: () => json({ variants: 2, files: ['logo-a-lisc.svg', 'logo-b-filizanka.svg'], note: 'A: zielony liść, B: filiżanka' }),
    },
    timeline: [
      { min: -60, event: 'started', task: 1 },
      { min: -52, event: 'done', task: 1 },
      { min: -51, event: 'started', task: 2 },
      { min: -40, event: 'done', task: 2 },
      { min: -39, event: 'started', task: 3 },
      {
        min: -38,
        event: 'waiting',
        task: 3,
        reason: 'human',
        question: both(
          'Które logo wybierasz: A (zielony liść) czy B (filiżanka)? Bez tego nie zbuduję strony.',
          'Which logo do you choose: A (green leaf) or B (cup)? I cannot build the page without it.',
        ),
      },
    ],
  },
  {
    dir: 'catalog-noprogress',
    mission: {
      id: 'catalog-noprogress',
      title: both('Opisy produktów do sklepu', 'Product descriptions for the shop'),
      agent: both('Gemini CLI (przykład)', 'Gemini CLI (sample)'),
      plan: 'Google AI Pro',
      tasks: [
        task(1, both('Zbierz listę produktów', 'Collect the product list'), 10, 'out/1-produkty.json', equals('count', 6)),
        task(2, both('Napisz opisy 6 produktów', 'Write descriptions of 6 products'), 15, 'out/2-opisy.md', contains('## Opisy')),
        task(3, both('Sprawdź długość i ton', 'Check length and tone'), 10, 'out/3-kontrola.json', equals('failed', 0)),
        task(4, both('Przygotuj plik do importu', 'Prepare the import file'), 10, 'out/4-import.csv', contains('sku,nazwa,opis')),
      ],
    },
    artifacts: {
      1: () => json({ count: 6, products: ['Kubek 300 ml', 'Czarka', 'Talerz 24 cm', 'Miska', 'Dzbanek', 'Podstawka'] }),
    },
    timeline: [
      { min: -130, event: 'started', task: 1 },
      { min: -121, event: 'done', task: 1 },
      { min: -120, event: 'started', task: 2 },
      { min: -105, event: 'note', task: 2, message: both('Piszę opisy…', 'Writing the descriptions…') },
      { min: -95, event: 'heartbeat', task: 2 },
      { min: -85, event: 'note', task: 2, message: both('Poprawiam jeszcze opis kubka', 'Still improving the mug description') },
      { min: -75, event: 'heartbeat', task: 2 },
      { min: -65, event: 'note', task: 2, message: both('Jeszcze raz przeglądam wszystkie opisy', 'Reviewing all descriptions once more') },
      { min: -55, event: 'heartbeat', task: 2 },
      { min: -45, event: 'heartbeat', task: 2 },
      { min: -35, event: 'note', task: 2, message: both('Prawie gotowe', 'Almost done') },
      { min: -25, event: 'heartbeat', task: 2 },
      { min: -15, event: 'heartbeat', task: 2 },
      { min: -6, event: 'note', task: 2, message: both('Poprawiam jeszcze ton', 'Still adjusting the tone') },
    ],
  },
  {
    dir: 'invoice-undetermined',
    mission: {
      id: 'invoice-undetermined',
      title: both('Zestawienie faktur za październik', 'October invoice summary'),
      agent: both('Claude Code (przykład)', 'Claude Code (sample)'),
      plan: 'Claude Pro',
      tasks: [
        task(1, both('Wczytaj listę faktur', 'Load the invoice list'), 5, 'out/1-faktury.json', equals('count', 12)),
        task(2, both('Policz sumy netto i VAT', 'Compute net and VAT totals'), 20, 'out/2-sumy.json', equals('currency', 'PLN')),
        task(3, both('Przygotuj zestawienie dla księgowej', 'Prepare the summary for the accountant'), 10, 'out/3-zestawienie.md', contains('## Razem')),
      ],
    },
    artifacts: {
      1: () => json({ count: 12, month: '2026-10', files: Array.from({ length: 12 }, (_, i) => `FV-${String(i + 1).padStart(3, '0')}-2026.pdf`) }),
    },
    timeline: [
      { min: -53, event: 'started', task: 1 },
      { min: -47, event: 'done', task: 1 },
      { min: -45, event: 'started', task: 2 },
    ],
  },
  {
    dir: 'offer-effect',
    mission: {
      id: 'offer-effect',
      title: both('Oferta dla klienta wysłana e-mailem', 'A client offer sent by e-mail'),
      agent: both('Claude Code (przykład)', 'Claude Code (sample)'),
      plan: 'Claude Max',
      tasks: [
        task(1, both('Przygotuj ofertę', 'Prepare the offer'), 10, 'out/1-oferta.md', contains('## Oferta')),
        task(2, both('Sprawdź ceny i terminy', 'Check prices and dates'), 5, 'out/2-kontrola.json', equals('failed', 0)),
        task(3, both('Wyślij ofertę do klienta', 'Send the offer to the client'), 5, 'out/3-wysylka.json', equals('status', 'sent'), {
          kind: 'external',
          where: both('folderze „Wysłane” w poczcie (adres klienta: klient@example.com)', 'the mail "Sent" folder (client address: klient@example.com)'),
        }),
      ],
    },
    artifacts: {
      1: () => '## Oferta\n\nStrona wizytówka z formularzem kontaktowym.\n\n- Projekt i wdrożenie: 1 200 zł netto\n- Termin: 10 dni roboczych\n- Ważna do: 31.10.2026\n',
      2: () => json({ checks: 4, failed: 0, items: ['cena netto', 'termin', 'ważność', 'dane klienta'] }),
      3: ({ at }) => json({ status: 'sent', to: 'klient@example.com', subject: 'Oferta: strona wizytówka', sentAt: at, messageId: `<demo-${Date.parse(at)}@example.com>` }),
    },
    timeline: [
      { min: -40, event: 'started', task: 1 },
      { min: -33, event: 'done', task: 1 },
      { min: -32, event: 'started', task: 2 },
      { min: -26, event: 'done', task: 2 },
      { min: -25, event: 'started', task: 3 },
      { min: -21, event: 'done', task: 3 },
    ],
  },
];

// A mission file with a syntax error (a comma after the last task) next to a work log.
const BROKEN_MISSION = `{
  "format": "mission-rescue/1",
  "id": "broken-mission",
  "title": { "pl": "Zepsuty plik misji (przykład)", "en": "A broken mission file (sample)" },
  "tasks": [
    { "id": 1, "title": "Zadanie", "artifact": { "file": "out/1.md", "check": { "type": "nonEmpty" } } },
  ]
}
`;

async function buildSample(sample, nowMs) {
  const files = {};
  const mission = { format: 'mission-rescue/1', ...sample.mission, stallMinutes: 30, demo: 'extra' };
  files['mission.json'] = json(mission);
  const log = [];
  for (const step of sample.timeline) {
    const at = iso(nowMs + step.min * MIN);
    const entry = { at, event: step.event };
    if (step.task != null) entry.task = step.task;
    if (step.event === 'done') {
      const def = mission.tasks.find((t) => t.id === step.task);
      const content = sample.artifacts[step.task]({ at, nowMs });
      files[def.artifact.file] = content;
      entry.artifact = { file: def.artifact.file, sha256: await sha256Hex(content) };
    }
    if (step.reason) entry.reason = step.reason;
    if (step.untilMin != null) entry.until = iso(nowMs + step.untilMin * MIN);
    if (step.question) entry.question = step.question;
    if (step.message) entry.message = step.message;
    log.push(entry);
  }
  files['worklog.jsonl'] = jsonl(log);
  return files;
}

// Folder name -> files, for every extra sample.
export async function buildExtraSamples({ now = Date.now() } = {}) {
  const nowMs = typeof now === 'number' ? now : Date.parse(now);
  const out = {};
  for (const sample of SAMPLES) out[sample.dir] = await buildSample(sample, nowMs);
  out['broken-mission'] = {
    'mission.json': BROKEN_MISSION,
    'worklog.jsonl': jsonl([{ at: iso(nowMs - 12 * MIN), event: 'started', task: 1 }]),
  };
  return out;
}

export const EXTRA_SAMPLE_DIRS = [...SAMPLES.map((s) => s.dir), 'broken-mission'];
