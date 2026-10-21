// Regression tests for the problems found in the independent review on 21 Oct 2026
// (resumed tasks, an unreadable log, demo limits, agent clocks, JSON checks, fingerprints,
// and the local program's hardening).
import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { promises as fs } from 'node:fs';
import { analyzeMission } from '../app/engine/analyze.mjs';
import { parseMission } from '../app/engine/mission.mjs';
import { parseWorklog, cleanSha256 } from '../app/engine/worklog.mjs';
import { sha256Hex } from '../app/engine/hash.mjs';
import { describeReason } from '../app/i18n.mjs';
import { demoReset } from '../tools/mission-rescue.mjs';
import { createServer, isLocalHost } from '../tools/server.mjs';
import { createFsSource } from '../tools/fs-source.mjs';
import { NOW, MIN, at, missionJson, done, source } from './helpers.mjs';

const proven1 = async () => [{ at: at(200), event: 'started', task: 1 }, await done(1, 'out/1.txt', 'OK', 190)];

test('a task started again (rescue or retry) counts from its latest start: working, not "no progress"', async () => {
  const resumed = [...(await proven1()), { at: at(185), event: 'started', task: 2 }, { at: at(1), event: 'started', task: 2 }];
  const a = await analyzeMission(source({ log: resumed, files: { 'out/1.txt': 'OK' } }), { now: NOW });
  assert.equal(a.verdict.code, 'working');
  assert.equal(a.tasks[1].startedAtMs, NOW - 1 * MIN);

  const retry = [...(await proven1()), { at: at(185), event: 'started', task: 2 }, { at: at(180), event: 'error', task: 2, message: 'x' }, { at: at(2), event: 'started', task: 2 }];
  const b = await analyzeMission(source({ log: retry, files: { 'out/1.txt': 'OK' } }), { now: NOW });
  assert.equal(b.verdict.code, 'working');

  // Still-working lines without a proven result for well past the expected time stay "no progress".
  const busy = [...(await proven1()), { at: at(120), event: 'started', task: 2 }];
  for (let m = 110; m >= 5; m -= 15) busy.push({ at: at(m), event: 'progress', task: 2, message: 'still checking' });
  const c = await analyzeMission(source({ log: busy, files: { 'out/1.txt': 'OK' } }), { now: NOW });
  assert.equal(c.verdict.code, 'no-progress');
});

test('no readable log but result files exist: undetermined, never "start the agent"', async () => {
  const noLog = await analyzeMission(source({ log: null, files: { 'out/1.txt': 'OK' } }), { now: NOW });
  assert.equal(noLog.verdict.code, 'undetermined');
  assert.equal(noLog.verdict.reason.key, 'no-readable-log');
  assert.deepEqual(noLog.verdict.reason.params.tasks, [1]);
  assert.match(describeReason('en', noLog.verdict, NOW), /result files already exist \(tasks: 1\)/);

  const brokenOnly = await analyzeMission(source({ log: ['{not json'] }), { now: NOW });
  assert.equal(brokenOnly.verdict.code, 'undetermined');
  assert.match(describeReason('pl', brokenOnly.verdict, NOW), /Żadnej linii logu pracy nie da się odczytać/);

  const empty = await analyzeMission(source({ log: [] }), { now: NOW });
  assert.equal(empty.verdict.code, 'not-started');
});

test('demo limits explain the samples only; a real mission with the same plan ignores them', async () => {
  const usedUp = [{ plan: 'Plan X', window: '5h', usedPercent: 100, resetsAt: new Date(NOW + 30 * MIN).toISOString(), resetsAtMs: NOW + 30 * MIN, label: 'demo' }];
  const log = [...(await proven1()), { at: at(45), event: 'started', task: 2 }];
  const real = await analyzeMission(source({ log, files: { 'out/1.txt': 'OK' } }), { now: NOW, limits: usedUp });
  assert.notEqual(real.verdict.code, 'waiting-limit');
  const sample = await analyzeMission(source({ mission: missionJson({ demo: 'extra' }), log, files: { 'out/1.txt': 'OK' } }), { now: NOW, limits: usedUp });
  assert.equal(sample.verdict.code, 'waiting-limit');
});

test('agent clocks: a time far in the future is flagged, a time without a zone is reported', async () => {
  const future = [...(await proven1()), { at: new Date(NOW + 3 * 60 * MIN).toISOString(), event: 'started', task: 2 }];
  const f = await analyzeMission(source({ log: future, files: { 'out/1.txt': 'OK' } }), { now: NOW });
  assert.equal(f.verdict.code, 'undetermined');
  assert.equal(f.verdict.reason.key, 'future-time');
  assert.match(describeReason('en', f.verdict, NOW), /3 h later than this computer's clock/);

  const parsed = parseWorklog('{"at":"2026-10-21T11:00:00","event":"started","task":1}\n{"at":"2026-10-21T11:05:00+02:00","event":"heartbeat"}\n', { taskIds: [1] });
  assert.equal(parsed.events.length, 2);
  assert.deepEqual(parsed.problems.map((p) => [p.code, p.line, p.count]), [['time-without-zone', 1, 1]]);
});

test('the last "done" is the last one written, even if the clock went back between them', async () => {
  const log = [
    { at: at(30), event: 'started', task: 1 },
    { at: at(10), event: 'done', task: 1, artifact: { file: 'out/1.txt', sha256: await sha256Hex('OK old') } },
    { at: at(11), event: 'started', task: 1 },
    { at: at(12), event: 'done', task: 1, artifact: { file: 'out/1.txt', sha256: await sha256Hex('OK') } },
  ];
  const report = await analyzeMission(source({ log, files: { 'out/1.txt': 'OK' } }), { now: NOW });
  assert.equal(report.tasks[0].state, 'proven');
});

test('JSON checks ignore key order; pasted fingerprints are cleaned', async () => {
  const mission = missionJson({ tasks: [{ id: 1, title: 'one', artifact: { file: 'out/1.json', check: { type: 'json', path: 'totals', equals: { a: 1, b: [1, 2] } } } }] });
  const content = '{"totals":{"b":[1,2],"a":1}}';
  const hash = await sha256Hex(content);
  const log = [{ at: at(5), event: 'started', task: 1 }, { at: at(2), event: 'done', task: 1, artifact: { file: 'out/1.json', sha256: `${hash}  out/1.json\n` } }];
  const report = await analyzeMission(source({ mission, log, files: { 'out/1.json': content } }), { now: NOW });
  assert.equal(report.tasks[0].state, 'proven');
  assert.equal(cleanSha256(hash.toUpperCase().match(/../g).join(' ')), hash);
  assert.equal(cleanSha256(`  ${hash}\r\n`), hash);
});

test('mission file: "kind" of an outside effect may be left out; hidden result folders are refused', () => {
  const withEffect = parseMission(JSON.stringify(missionJson({
    tasks: [{ id: 1, title: 'send', artifact: { file: 'out/sent.json', check: { type: 'nonEmpty' } }, effect: { where: 'the Sent folder' } }],
  })));
  assert.deepEqual(withEffect.problems, []);
  assert.equal(withEffect.mission.tasks[0].effect.kind, 'external');

  const hidden = parseMission(JSON.stringify(missionJson({ tasks: [{ id: 1, title: 'x', artifact: { file: '.out/1.txt', check: { type: 'nonEmpty' } } }] })));
  assert.equal(hidden.mission, null);
  assert.equal(hidden.problems[0].code, 'bad-artifact');
});

test('texts: an error without a task, and the rescue instruction asks for "started" lines', async () => {
  const log = [...(await proven1()), { at: at(5), event: 'error', message: 'disk full' }];
  const report = await analyzeMission(source({ log, files: { 'out/1.txt': 'OK' } }), { now: NOW });
  assert.equal(report.verdict.reason.key, 'error-reported');
  assert.equal(describeReason('en', report.verdict, NOW), 'The agent reported an error: "disk full"');
  assert.match(report.rescue.instruction.en, /"event":"started","task":<N>/);
  assert.match(report.rescue.instruction.pl, /"event":"started","task":<N>/);
});

function rawGet(port, urlPath, host) {
  return new Promise((resolve, reject) => {
    const req = http.request({ host: '127.0.0.1', port, path: urlPath, method: 'GET', headers: { Host: host } }, (res) => {
      res.resume();
      res.on('end', () => resolve(res.statusCode));
    });
    req.on('error', reject);
    req.end();
  });
}

test('local program: answers only requests addressed to this computer and never follows links out', async (t) => {
  assert.equal(isLocalHost('127.0.0.1:4317'), true);
  assert.equal(isLocalHost('localhost:4317'), true);
  assert.equal(isLocalHost('evil.example'), false);

  const ws = await fs.mkdtemp(path.join(os.tmpdir(), 'mission-rescue-'));
  await demoReset(ws);
  const outside = await fs.mkdtemp(path.join(os.tmpdir(), 'mission-rescue-outside-'));
  await fs.writeFile(path.join(outside, 'secret.txt'), 'secret');
  let linked = true;
  try {
    await fs.symlink(path.join(outside, 'secret.txt'), path.join(ws, 'weekly-report', 'out', 'link.txt'));
  } catch {
    linked = false; // creating links needs extra rights on some Windows setups
  }

  const server = createServer({ workspace: ws });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  t.after(() => server.close());
  const { port } = server.address();

  assert.equal(await rawGet(port, '/workspace/weekly-report/mission.json', `127.0.0.1:${port}`), 200);
  assert.equal(await rawGet(port, '/workspace/weekly-report/mission.json', 'attacker.example'), 403);
  if (linked) {
    assert.equal(await rawGet(port, '/workspace/weekly-report/out/link.txt', `127.0.0.1:${port}`), 403);
    const disk = createFsSource(path.join(ws, 'weekly-report'));
    assert.equal(await disk.readBytes('out/link.txt'), null);
  }
});
