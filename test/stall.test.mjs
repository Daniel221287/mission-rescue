import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeMission } from '../app/engine/analyze.mjs';
import { NOW, at, missionJson, done, source } from './helpers.mjs';

// Task 1 proven 60 min ago; what happens next decides the verdict.
async function verdictFor(extraLog, { files = {}, limits = [], mission = missionJson() } = {}) {
  const log = [{ at: at(65), event: 'started', task: 1 }, await done(1, 'out/1.txt', 'OK', 60), ...extraLog];
  const report = await analyzeMission(source({ mission, log, files: { 'out/1.txt': 'OK', ...files } }), { now: NOW, limits });
  return report.verdict;
}

test('a reported error is a likely failure with high confidence', async () => {
  const v = await verdictFor([{ at: at(50), event: 'started', task: 2 }, { at: at(40), event: 'error', task: 2, message: 'disk full' }]);
  assert.equal(v.code, 'likely-failure');
  assert.equal(v.confidence, 'high');
  assert.equal(v.reason.key, 'error-reported');
});

test('silence a little longer than expected is undetermined, not a failure', async () => {
  const v = await verdictFor([{ at: at(45), event: 'started', task: 2 }]);
  assert.equal(v.code, 'undetermined');
  assert.equal(v.confidence, 'low');
});

test('long silence mid-task is a likely failure (medium without a half-written file)', async () => {
  const v = await verdictFor([{ at: at(59), event: 'started', task: 2 }], {});
  const longer = await analyzeMission(
    source({ log: [{ at: at(200), event: 'started', task: 1 }, await done(1, 'out/1.txt', 'OK', 190), { at: at(189), event: 'started', task: 2 }], files: { 'out/1.txt': 'OK' } }),
    { now: NOW },
  );
  assert.equal(v.code, 'undetermined');
  assert.equal(longer.verdict.code, 'likely-failure');
  assert.equal(longer.verdict.confidence, 'medium');
});

test('the waiting time grows with the task: 40 min expected means 60 min before suspicion', async () => {
  const mission = missionJson();
  const log = [
    { at: at(130), event: 'started', task: 1 }, await done(1, 'out/1.txt', 'OK', 125),
    { at: at(124), event: 'started', task: 2 }, await done(2, 'out/2.json', '{"failed":0}', 120),
    { at: at(50), event: 'started', task: 3 },
  ];
  const report = await analyzeMission(source({ mission, log, files: { 'out/1.txt': 'OK', 'out/2.json': '{"failed":0}' } }), { now: NOW });
  assert.equal(report.verdict.waitMs, 60 * 60000);
  assert.equal(report.verdict.code, 'working');
});

test('heartbeats are not progress', async () => {
  const beats = [{ at: at(55), event: 'started', task: 2 }];
  for (let m = 50; m >= 2; m -= 8) beats.push({ at: at(m), event: 'heartbeat' });
  const v = await verdictFor(beats);
  assert.equal(v.code, 'no-progress');
  assert.equal(v.reason.key, 'signs-of-life-only');
});

test('waiting for a person shows the question', async () => {
  const v = await verdictFor([{ at: at(20), event: 'waiting', task: 2, reason: 'human', question: 'Which week?' }]);
  assert.equal(v.code, 'waiting-human');
  assert.equal(v.reason.params.question, 'Which week?');
});

test('waiting for a limit: said by the agent, corroborated by the limits, or inferred from them', async () => {
  const until = new Date(NOW + 30 * 60000).toISOString();
  const usedUp = [{ plan: 'Plan X', window: '5h', usedPercent: 100, resetsAt: until, resetsAtMs: NOW + 30 * 60000, label: 'demo' }];
  const said = await verdictFor([{ at: at(20), event: 'waiting', task: 2, reason: 'limit', until }]);
  assert.equal(said.code, 'waiting-limit');
  assert.equal(said.confidence, 'medium');
  const corroborated = await verdictFor([{ at: at(20), event: 'waiting', task: 2, reason: 'limit', until }], { limits: usedUp });
  assert.equal(corroborated.confidence, 'high');
  const inferred = await verdictFor([{ at: at(50), event: 'started', task: 2 }], { limits: usedUp });
  assert.equal(inferred.code, 'waiting-limit');
  assert.equal(inferred.reason.key, 'inferred-from-limits');
});

test('a limit that came back long ago while the agent stayed silent is a likely failure', async () => {
  const until = at(100);
  const log = [{ at: at(300), event: 'started', task: 1 }, await done(1, 'out/1.txt', 'OK', 290), { at: at(280), event: 'waiting', task: 2, reason: 'limit', until }];
  const report = await analyzeMission(source({ log, files: { 'out/1.txt': 'OK' } }), { now: NOW });
  assert.equal(report.verdict.code, 'likely-failure');
  assert.equal(report.verdict.reason.key, 'limit-back-agent-not');
});

test('recent progress is normal work; a proof problem wins over everything', async () => {
  const working = await verdictFor([{ at: at(10), event: 'started', task: 2 }]);
  assert.equal(working.code, 'working');
  const log = [{ at: at(65), event: 'started', task: 1 }, await done(1, 'out/1.txt', 'OK', 60)];
  const tampered = await analyzeMission(source({ log, files: { 'out/1.txt': 'OK but changed' } }), { now: NOW });
  assert.equal(tampered.verdict.code, 'proof-problem');
});

test('no events means not started; everything proven means complete', async () => {
  const empty = await analyzeMission(source({ log: [] }), { now: NOW });
  assert.equal(empty.verdict.code, 'not-started');
  const files = { 'out/1.txt': 'OK', 'out/2.json': '{"failed":0}', 'out/3.txt': 'text' };
  const log = [
    await done(1, 'out/1.txt', files['out/1.txt'], 30),
    await done(2, 'out/2.json', files['out/2.json'], 20),
    await done(3, 'out/3.txt', files['out/3.txt'], 10),
  ];
  const complete = await analyzeMission(source({ log, files }), { now: NOW });
  assert.equal(complete.verdict.code, 'complete');
  assert.equal(complete.verdict.color, 'green');
});
