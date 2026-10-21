import test from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { promises as fs } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { buildSampleWorkspace } from '../app/demo/samples.mjs';
import { EXTRA_SAMPLE_DIRS } from '../app/demo/extra-samples.mjs';
import { analyzeWorkspace, analyzeMission } from '../app/engine/analyze.mjs';
import { subSource } from '../app/engine/paths.mjs';
import { sha256Hex } from '../app/engine/hash.mjs';
import { readLimits, limitForPlan } from '../app/engine/limits.mjs';
import { parseWorklog } from '../app/engine/worklog.mjs';
import { parseMission } from '../app/engine/mission.mjs';
import { createMemorySource } from '../app/engine/memory-source.mjs';
import { describeReason, describeProblem, limitLabelText, textIn } from '../app/i18n.mjs';
import { limitsFromStatus, statusText } from '../tools/claude-statusline.mjs';
import { createFsSource } from '../tools/fs-source.mjs';
import { checkMission } from '../tools/mission-rescue.mjs';
import { NOW, MIN } from './helpers.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

async function samples(now = NOW) {
  const ws = await buildSampleWorkspace({ now });
  return { ws, result: await analyzeWorkspace(ws, { now }) };
}

test('every kind of stop has its own sample with an honest verdict and confidence', async () => {
  const { result } = await samples();
  const got = Object.fromEntries(result.missions.map((m) => [m.dir, [m.verdict.code, m.verdict.confidence]]));
  assert.deepEqual(got, {
    'weekly-report': ['likely-failure', 'high'],
    'broken-mission': ['unreadable', 'high'],
    'catalog-noprogress': ['no-progress', 'high'],
    'offer-effect': ['needs-confirmation', 'high'],
    'logo-human': ['waiting-human', 'high'],
    'newsletter-limit': ['waiting-limit', 'high'],
    'invoice-undetermined': ['undetermined', 'low'],
    'menu-working': ['working', 'medium'],
  });
  assert.deepEqual(result.missions.map((m) => m.dir)[0], 'weekly-report', 'the jury mission needs attention first');
  assert.equal(EXTRA_SAMPLE_DIRS.length, 7);
});

test('every reported result in the samples is a real file with its real fingerprint', async () => {
  const { ws, result } = await samples();
  for (const m of result.missions.filter((r) => r.ok)) {
    for (const task of m.tasks.filter((t) => t.levels.declared === 'yes')) {
      assert.equal(task.levels.verified, true, `${m.dir} task ${task.id}`);
      const bytes = await subSource(ws, m.dir).readBytes(task.artifact.file);
      assert.equal(task.artifact.declaredSha, await sha256Hex(bytes));
    }
  }
});

test('the reasons are concrete: the question, the reset time, the silence, the signs of life', async () => {
  const { result } = await samples();
  const by = (dir) => result.missions.find((m) => m.dir === dir);
  assert.match(describeReason('pl', by('logo-human').verdict, NOW), /Które logo wybierasz: A \(zielony liść\) czy B \(filiżanka\)\?/);
  assert.match(describeReason('en', by('logo-human').verdict, NOW), /Which logo do you choose/);
  assert.match(describeReason('pl', by('newsletter-limit').verdict, NOW), /dane o limitach to potwierdzają/);
  assert.equal(by('newsletter-limit').verdict.reason.params.until, new Date(NOW + 35 * MIN).toISOString());
  assert.match(describeReason('en', by('catalog-noprogress').verdict, NOW), /signs of life \(11 entries\)/);
  assert.match(describeReason('pl', by('invoice-undetermined').verdict, NOW), /Cisza trwa 45 min/);
  assert.match(describeReason('en', by('offer-effect').verdict, NOW), /Task 3 has an effect outside this computer, to be checked in the mail "Sent" folder/);
  const broken = by('broken-mission');
  assert.equal(describeProblem('en', broken.problems[0]), 'mission.json, line 7: invalid JSON');
  assert.equal(describeReason('pl', broken.verdict, NOW), 'Nie mogę odczytać pliku misji: mission.json, linia 7: niepoprawny JSON.');
});

test('outside effect: confirmed by a person turns it green; a changed file voids the confirmation', async () => {
  const ws = await buildSampleWorkspace({ now: NOW });
  const src = subSource(ws, 'offer-effect');
  const before = await analyzeMission(src, { now: NOW, dir: 'offer-effect' });
  assert.equal(before.verdict.code, 'needs-confirmation');
  const task3 = before.tasks[2];
  assert.equal(task3.state, 'effect-unconfirmed');
  assert.deepEqual(task3.levels, { declared: 'yes', exists: true, verified: true, effect: 'unconfirmed' });
  assert.deepEqual(before.rescue.steps.map((s) => [s.task, s.action]), [[3, 'confirm']]);
  assert.match(before.rescue.instruction.pl, /Nic dla agenta/);

  const confirmations = [{ mission: before.key, task: 3, sha256: task3.artifact.actualSha, at: new Date(NOW).toISOString() }];
  const after = await analyzeMission(src, { now: NOW, dir: 'offer-effect', confirmations });
  assert.equal(after.verdict.code, 'complete');
  assert.equal(after.tasks[2].levels.effect, 'confirmed');

  // The agent sends the offer again (a new file, a new fingerprint): the old confirmation no longer counts.
  const resent = JSON.stringify({ status: 'sent', to: 'klient@example.com', sentAt: new Date(NOW).toISOString() });
  await src.write('out/3-wysylka.json', resent);
  await src.append('worklog.jsonl', `${JSON.stringify({ at: new Date(NOW).toISOString(), event: 'done', task: 3, artifact: { file: 'out/3-wysylka.json', sha256: await sha256Hex(resent) } })}\n`);
  const again = await analyzeMission(src, { now: NOW + MIN, dir: 'offer-effect', confirmations });
  assert.equal(again.tasks[2].state, 'effect-unconfirmed');
  assert.equal(again.verdict.code, 'needs-confirmation');
});

test('an unconfirmed outside effect does not hide later work: the next task is the current one', async () => {
  const ws = await buildSampleWorkspace({ now: NOW });
  const src = subSource(ws, 'offer-effect');
  const mission = JSON.parse(await src.readText('mission.json'));
  mission.tasks.push({ id: 4, title: 'Archive', expectedMinutes: 5, artifact: { file: 'out/4.md', check: { type: 'nonEmpty' } } });
  await src.write('mission.json', JSON.stringify(mission));
  await src.append('worklog.jsonl', `${JSON.stringify({ at: new Date(NOW - 2 * MIN).toISOString(), event: 'started', task: 4 })}\n`);
  const report = await analyzeMission(src, { now: NOW, dir: 'offer-effect' });
  assert.equal(report.verdict.code, 'working');
  assert.equal(report.verdict.currentTask, 4);
  assert.deepEqual(report.rescue.steps.map((s) => [s.task, s.action]), [[3, 'confirm'], [4, 'check-first']]);
});

test('limits are labelled by where they come from: demo, manual, verified automatically, out of date', async () => {
  const ws = createMemorySource({
    'limits/limits.demo.json': JSON.stringify({ source: 'demo', capturedAt: new Date(NOW).toISOString(), plans: [{ plan: 'A', window: '5h', usedPercent: 10, resetsAt: new Date(NOW + 60 * MIN).toISOString() }] }),
    'limits/limits.auto.json': JSON.stringify({ source: 'auto', capturedAt: new Date(NOW - 5 * MIN).toISOString(), plans: [{ plan: 'Claude Max', window: '5h', usedPercent: 97, resetsAt: new Date(NOW + 40 * MIN).toISOString() }] }),
  });
  const manual = [
    { plan: 'ChatGPT Plus', window: '5h', usedPercent: 50, resetsAt: new Date(NOW + 90 * MIN).toISOString(), enteredAt: new Date(NOW).toISOString() },
    { plan: 'Old', window: '7d', usedPercent: 99, resetsAt: new Date(NOW - MIN).toISOString(), enteredAt: new Date(NOW - 60 * MIN).toISOString() },
  ];
  const { entries } = await readLimits(ws, { now: NOW, manual });
  const label = (plan) => entries.find((e) => e.plan === plan);
  assert.equal(label('A').label, 'demo');
  assert.equal(label('Claude Max').label, 'auto-verified');
  assert.equal(label('ChatGPT Plus').label, 'manual');
  assert.deepEqual([label('Old').label, label('Old').staleReason], ['stale', 'reset-passed']);
  assert.equal(limitLabelText('pl', label('Old'), NOW), 'NIEAKTUALNE · odnowienie już minęło');
  assert.equal(limitForPlan('Old', entries, NOW), null, 'an out-of-date limit is never used for a diagnosis');
  const mixed = [
    { plan: 'P', window: '5h', usedPercent: 100, resetsAtMs: NOW + 9 * MIN, label: 'demo' },
    { plan: 'P', window: '5h', usedPercent: 64, resetsAtMs: NOW + 99 * MIN, label: 'auto-verified' },
    { plan: 'P', window: '7d', usedPercent: 30, resetsAtMs: NOW + 999 * MIN, label: 'manual' },
  ];
  assert.deepEqual([limitForPlan('P', mixed, NOW).usedPercent, limitForPlan('P', mixed, NOW).label], [64, 'auto-verified'], 'a verified number beats a demo one for the same window');

  const later = await readLimits(ws, { now: NOW + 45 * MIN });
  const auto = later.entries.find((e) => e.plan === 'Claude Max');
  assert.deepEqual([auto.label, auto.staleReason], ['stale', 'reset-passed']);
  const old = await readLimits(createMemorySource({
    'limits/limits.auto.json': JSON.stringify({ source: 'auto', capturedAt: new Date(NOW - 50 * MIN).toISOString(), plans: [{ plan: 'Claude Max', window: '7d', usedPercent: 20, resetsAt: new Date(NOW + 3000 * MIN).toISOString() }] }),
  }), { now: NOW });
  assert.deepEqual([old.entries[0].label, old.entries[0].staleReason], ['stale', 'old-capture']);
  assert.equal(limitLabelText('en', old.entries[0], NOW), 'OUT OF DATE · captured 50 min ago');
});

test('Claude Code status line: the documented input becomes limits.auto.json, labelled verified', async () => {
  const input = {
    model: { display_name: 'Opus' },
    rate_limits: {
      five_hour: { used_percentage: 42.4, resets_at: Math.floor((NOW + 100 * MIN) / 1000) },
      seven_day: { used_percentage: 18, resets_at: Math.floor((NOW + 3 * 24 * 60 * MIN) / 1000) },
    },
  };
  const data = limitsFromStatus(input, { plan: 'Claude Max', now: NOW });
  assert.deepEqual(data.plans, [
    { plan: 'Claude Max', window: '5h', usedPercent: 42.4, resetsAt: new Date(NOW + 100 * MIN).toISOString() },
    { plan: 'Claude Max', window: '7d', usedPercent: 18, resetsAt: new Date(NOW + 3 * 24 * 60 * MIN).toISOString() },
  ]);
  assert.equal(limitsFromStatus({ model: { display_name: 'Opus' } }), null, 'no limits in the input: nothing is written');
  assert.match(statusText(input, data, { lang: 'en' }), /^Mission Rescue · Opus · 5h 42.4% \(reset \d\d:\d\d\) · 7d 18%$/);

  // The real command, as Claude Code runs it: JSON on stdin, a file in the workspace.
  const ws = await fs.mkdtemp(path.join(os.tmpdir(), 'mission-rescue-status-'));
  const live = { ...input, rate_limits: { five_hour: { used_percentage: 97, resets_at: Math.floor((Date.now() + 30 * MIN) / 1000) } } };
  const out = await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [path.join(ROOT, 'tools', 'claude-statusline.mjs'), '--workspace', ws, '--plan', 'Claude Max', '--lang', 'en']);
    let text = '';
    child.stdout.on('data', (chunk) => { text += chunk; });
    child.on('error', reject);
    child.on('close', (code) => resolve({ code, text }));
    child.stdin.end(JSON.stringify(live));
  });
  assert.equal(out.code, 0);
  assert.match(out.text, /Mission Rescue · Opus · 5h 97%/);
  const written = JSON.parse(await fs.readFile(path.join(ws, 'limits', 'limits.auto.json'), 'utf8'));
  assert.equal(written.source, 'auto');
  const { entries } = await readLimits(createFsSource(ws), { now: Date.now() });
  assert.deepEqual(entries.map((e) => [e.plan, e.window, e.usedPercent, e.label]), [['Claude Max', '5h', 97, 'auto-verified']]);

  // Garbage on stdin never breaks the status line.
  const bad = await new Promise((resolve) => {
    const child = spawn(process.execPath, [path.join(ROOT, 'tools', 'claude-statusline.mjs'), '--workspace', ws]);
    let text = '';
    child.stdout.on('data', (chunk) => { text += chunk; });
    child.on('close', (code) => resolve({ code, text }));
    child.stdin.end('not json');
  });
  assert.equal(bad.code, 0);
  assert.match(bad.text, /Mission Rescue · limity: jeszcze brak danych/);
});

test('the stall verdict uses verified limits: a silent agent with a used-up plan is waiting for the limit', async () => {
  const ws = await buildSampleWorkspace({ now: NOW });
  const src = subSource(ws, 'invoice-undetermined');
  const mission = JSON.parse(await src.readText('mission.json'));
  const limits = [{ plan: mission.plan, window: '5h', usedPercent: 100, resetsAt: new Date(NOW + 20 * MIN).toISOString(), resetsAtMs: NOW + 20 * MIN, label: 'auto-verified' }];
  const report = await analyzeMission(src, { now: NOW, limits });
  assert.deepEqual([report.verdict.code, report.verdict.confidence, report.verdict.reason.key], ['waiting-limit', 'medium', 'inferred-from-limits']);
  const staleLimits = [{ ...limits[0], label: 'stale' }];
  const ignored = await analyzeMission(src, { now: NOW, limits: staleLimits });
  assert.equal(ignored.verdict.code, 'undetermined', 'out-of-date limits are not used');
});

test('agent texts can be bilingual, and broken JSON is located by line', () => {
  const { events } = parseWorklog([
    JSON.stringify({ at: '2026-10-21T10:00:00Z', event: 'waiting', task: 1, reason: 'human', question: { pl: 'Które?', en: 'Which one?' } }),
    JSON.stringify({ at: '2026-10-21T10:01:00Z', event: 'note', message: 'zwykły tekst' }),
    JSON.stringify({ at: '2026-10-21T10:02:00Z', event: 'note', message: { de: 'nein' } }),
  ].join('\n'), { taskIds: [1] });
  assert.deepEqual(events[0].question, { pl: 'Które?', en: 'Which one?' });
  assert.equal(textIn('en', events[0].question), 'Which one?');
  assert.equal(events[1].message, 'zwykły tekst');
  assert.equal(events[2].message, undefined);
  const { problems } = parseMission('{\n  "format": "mission-rescue/1",\n  "tasks": [1,]\n}');
  assert.deepEqual([problems[0].code, problems[0].line], ['invalid-json', 3]);
});

test('extra samples on disk: the command line gives the same verdicts', async () => {
  const ws = await fs.mkdtemp(path.join(os.tmpdir(), 'mission-rescue-extra-'));
  const { demoReset } = await import('../tools/mission-rescue.mjs');
  await demoReset(ws);
  const verdicts = {};
  for (const dir of ['logo-human', 'offer-effect', 'broken-mission']) verdicts[dir] = (await checkMission(path.join(ws, dir))).verdict.code;
  assert.deepEqual(verdicts, { 'logo-human': 'waiting-human', 'offer-effect': 'needs-confirmation', 'broken-mission': 'unreadable' });
});
