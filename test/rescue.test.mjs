import test from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import { promises as fs } from 'node:fs';
import { buildSampleWorkspace } from '../app/demo/samples.mjs';
import { runSampleAgent, tamperSample } from '../app/demo/sample-agent.mjs';
import { analyzeMission } from '../app/engine/analyze.mjs';
import { subSource } from '../app/engine/paths.mjs';
import { sha256Hex } from '../app/engine/hash.mjs';
import { weeklyTask } from '../app/demo/weekly-report.mjs';
import { demoReset, checkMission } from '../tools/mission-rescue.mjs';
import { createFsSource } from '../tools/fs-source.mjs';

const NOW = Date.parse('2026-10-21T12:00:00Z');

async function sample() {
  const ws = await buildSampleWorkspace({ now: NOW });
  return subSource(ws, 'weekly-report');
}

// A clock that moves forward a little with every step, starting at NOW.
function clock() {
  let t = NOW;
  return () => (t += 1000);
}

test('rescue plan for the jury sample: checkpoint 3, check task 4 first, then 5-7', async () => {
  const report = await analyzeMission(await sample(), { now: NOW, dir: 'weekly-report' });
  const plan = report.rescue;
  assert.equal(plan.needed, true);
  assert.equal(plan.checkpoint, 3);
  assert.deepEqual(plan.proven, [1, 2, 3]);
  assert.deepEqual(plan.steps.map((s) => [s.task, s.action]), [[4, 'check-first'], [5, 'do'], [6, 'do'], [7, 'do']]);
  assert.match(plan.instruction.pl, /NIE POWTARZAJ zadań 1, 2 i 3/);
  assert.match(plan.instruction.pl, /out\/04-podsumowanie\.md istnieje i zawiera „## Wnioski”/);
  assert.match(plan.instruction.en, /DO NOT REPEAT tasks 1, 2 and 3/);
  assert.match(plan.instruction.en, /FIRST CHECK WHETHER IT ALREADY HAPPENED/);
});

test('full flow in memory: red -> sample agent -> 7/7 green with real fingerprints', async () => {
  const src = await sample();
  const before = await analyzeMission(src, { now: NOW });
  assert.equal(before.verdict.code, 'likely-failure');
  const steps = [];
  const tick = clock();
  const result = await runSampleAgent(src, { clock: tick, onStep: (s) => steps.push(s.key) });
  assert.deepEqual(result.done, [4, 5, 6, 7]);
  assert.deepEqual(steps.slice(0, 2), ['demo.agent.step.check', 'demo.agent.step.redo'], 'task 4 is checked first and redone because it is incomplete');
  const after = await analyzeMission(src, { now: tick() });
  assert.equal(after.verdict.code, 'complete');
  assert.deepEqual(after.counts, { total: 7, proven: 7 });
  for (const task of after.tasks) {
    assert.deepEqual([task.levels.declared, task.levels.exists, task.levels.verified], ['yes', true, true], `task ${task.id}`);
    assert.equal(task.artifact.actualSha, await sha256Hex(await src.readBytes(task.artifact.file)));
  }
  const final = await src.readText('out/07-raport.md');
  assert.match(final, /## Dowody/);
  assert.match(final, new RegExp(after.tasks[0].artifact.actualSha));
});

test('check first: a complete but undeclared result is reported, not repeated', async () => {
  const src = await sample();
  const read = (p) => src.readText(p);
  const full = await weeklyTask(4).run(read);
  await src.write('out/04-podsumowanie.md', full);
  const before = await analyzeMission(src, { now: NOW });
  assert.equal(before.tasks[3].state, 'undeclared-result');
  const steps = [];
  await runSampleAgent(src, { clock: clock(), onStep: (s) => steps.push(`${s.key}:${s.task ?? ''}`) });
  assert.ok(steps.includes('demo.agent.step.reuse:4'));
  assert.equal(await src.readText('out/04-podsumowanie.md'), full, 'the file was not rewritten');
});

test('honesty test: a silent edit is caught by the fingerprint, and the agent redoes the task', async () => {
  const src = await sample();
  const tick = clock();
  await runSampleAgent(src, { clock: tick });
  await tamperSample(src);
  const tampered = await analyzeMission(src, { now: tick() });
  assert.equal(tampered.verdict.code, 'proof-problem');
  assert.equal(tampered.tasks[2].state, 'hash-mismatch');
  assert.equal(tampered.tasks[2].artifact.checkResult.ok, true, 'the condition alone would not catch it');
  assert.deepEqual(tampered.rescue.steps.map((s) => [s.task, s.action]), [[3, 'redo']]);
  const steps = [];
  await runSampleAgent(src, { clock: tick, onStep: (s) => steps.push(`${s.key}:${s.task ?? ''}`) });
  assert.deepEqual(steps, ['demo.agent.step.changed:3', 'demo.agent.step.done:3', 'demo.agent.finished:']);
  const repaired = await analyzeMission(src, { now: tick() });
  assert.equal(repaired.verdict.code, 'complete');
});

test('missing file and wrong result on the sample turn it red with the exact reason', async () => {
  const src = await sample();
  const tick = clock();
  await runSampleAgent(src, { clock: tick });
  await src.remove('out/05-wykres.csv');
  const missing = await analyzeMission(src, { now: tick() });
  assert.equal(missing.tasks[4].state, 'artifact-missing');
  assert.equal(missing.verdict.code, 'proof-problem');

  const src2 = await sample();
  await runSampleAgent(src2, { clock: tick });
  const wrong = JSON.stringify({ checks: 5, failed: 1 });
  await src2.write('out/06-autotest.json', wrong);
  await src2.append('worklog.jsonl', `${JSON.stringify({ at: new Date(tick()).toISOString(), event: 'done', task: 6, artifact: { file: 'out/06-autotest.json', sha256: await sha256Hex(wrong) } })}\n`);
  const bad = await analyzeMission(src2, { now: tick() });
  assert.equal(bad.tasks[5].state, 'wrong-result');
  assert.equal(bad.tasks[5].artifact.checkResult.code, 'value-differs');
});

test('full flow on disk: demo-reset -> red, sample agent -> green, exit code semantics', async () => {
  const ws = await fs.mkdtemp(path.join(os.tmpdir(), 'mission-rescue-flow-'));
  await demoReset(ws);
  const folder = path.join(ws, 'weekly-report');
  assert.equal((await checkMission(folder)).verdict.code, 'likely-failure');
  await runSampleAgent(createFsSource(folder, { writable: true }));
  const after = await checkMission(folder);
  assert.equal(after.verdict.code, 'complete');
  assert.deepEqual(after.counts, { total: 7, proven: 7 });
  const outs = (await fs.readdir(path.join(folder, 'out'))).sort();
  assert.deepEqual(outs, ['01-zamowienia.json', '02-walidacja.json', '03-sumy.json', '04-podsumowanie.md', '05-wykres.csv', '06-autotest.json', '07-raport.md']);
});

test('the sample agent refuses other missions and read-only folders', async () => {
  const ws = await buildSampleWorkspace({ now: NOW });
  await ws.write('other/mission.json', JSON.stringify({ format: 'mission-rescue/1', title: 'x', tasks: [{ id: 1, title: 'a', artifact: { file: 'a.txt', check: { type: 'nonEmpty' } } }] }));
  await assert.rejects(() => runSampleAgent(subSource(ws, 'other')), /only works on the sample mission/);
  await assert.rejects(() => runSampleAgent({ ...subSource(ws, 'weekly-report'), writable: false }), /writable/);
  await assert.rejects(() => tamperSample(subSource(ws, 'other')), /only works on the sample mission/);
});
