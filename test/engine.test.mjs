import test from 'node:test';
import assert from 'node:assert/strict';
import { safeRelPath, isSafeRelPath } from '../app/engine/paths.mjs';
import { parseMission } from '../app/engine/mission.mjs';
import { parseWorklog } from '../app/engine/worklog.mjs';
import { analyzeMission, analyzeWorkspace, ATTENTION_ORDER } from '../app/engine/analyze.mjs';
import { sha256Hex } from '../app/engine/hash.mjs';
import { createMemorySource } from '../app/engine/memory-source.mjs';
import { buildSampleWorkspace } from '../app/demo/samples.mjs';
import { subSource } from '../app/engine/paths.mjs';
import { NOW, at, missionJson, done, source } from './helpers.mjs';

test('paths stay inside the folder', () => {
  assert.equal(safeRelPath('a\\b/./c.txt'), 'a/b/c.txt');
  for (const bad of ['../x', 'a/../../x', '/etc/passwd', 'C:\\x', '', '   ']) assert.equal(isSafeRelPath(bad), false, bad);
});

test('SHA-256 matches a known value', async () => {
  assert.equal(await sha256Hex('abc'), 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
});

test('mission file: valid, broken JSON, unknown format, duplicate task, bad check', () => {
  assert.ok(parseMission(JSON.stringify(missionJson())).mission);
  assert.equal(parseMission('{oops').problems[0].code, 'invalid-json');
  assert.equal(parseMission(JSON.stringify(missionJson({ format: 'x' }))).problems[0].code, 'unknown-format');
  const dup = missionJson();
  dup.tasks[1].id = 1;
  assert.equal(parseMission(JSON.stringify(dup)).problems[0].code, 'duplicate-task-id');
  const badCheck = missionJson();
  badCheck.tasks[0].artifact.check = { type: 'magic' };
  assert.equal(parseMission(JSON.stringify(badCheck)).problems[0].code, 'bad-check');
  const escape = missionJson();
  escape.tasks[0].artifact.file = '../secret.txt';
  assert.equal(parseMission(JSON.stringify(escape)).problems[0].code, 'bad-artifact');
});

test('work log: broken lines are reported with their line numbers and skipped', () => {
  const text = [
    JSON.stringify({ at: at(5), event: 'started', task: 1 }),
    '{not json',
    JSON.stringify({ at: at(4), event: 'teleport', task: 1 }),
    JSON.stringify({ at: at(3), event: 'started', task: 9 }),
    JSON.stringify({ at: 'yesterday', event: 'note' }),
    JSON.stringify({ at: at(10), event: 'heartbeat' }),
  ].join('\n');
  const { events, problems } = parseWorklog(text, { taskIds: [1, 2, 3] });
  assert.deepEqual(problems.map((p) => [p.line, p.code]), [[2, 'invalid-json'], [3, 'unknown-event'], [4, 'unknown-task'], [5, 'bad-time']]);
  assert.deepEqual(events.map((e) => e.event), ['heartbeat', 'started']);
});

async function stateOf(files, log, taskId = 1, mission = missionJson()) {
  const report = await analyzeMission(source({ mission, log, files }), { now: NOW });
  return report.tasks.find((t) => t.id === taskId);
}

test('proof: proven needs declaration, file, matching fingerprint and the condition', async () => {
  const task = await stateOf({ 'out/1.txt': 'OK done' }, [await done(1, 'out/1.txt', 'OK done', 10)]);
  assert.equal(task.state, 'proven');
  assert.deepEqual(task.levels, { declared: 'yes', exists: true, verified: true, effect: 'not-applicable' });
});

test('proof: declared done but the result file is missing', async () => {
  const task = await stateOf({}, [await done(1, 'out/1.txt', 'OK done', 10)]);
  assert.equal(task.state, 'artifact-missing');
  assert.equal(task.levels.exists, false);
});

test('proof: the file changed after it was declared (fingerprint mismatch)', async () => {
  const task = await stateOf({ 'out/1.txt': 'OK done, then edited' }, [await done(1, 'out/1.txt', 'OK done', 10)]);
  assert.equal(task.state, 'hash-mismatch');
  assert.equal(task.levels.verified, false);
});

test('proof: matching fingerprint but a wrong result fails the condition', async () => {
  const wrong = JSON.stringify({ failed: 2 });
  const task = await stateOf({ 'out/2.json': wrong }, [await done(2, 'out/2.json', wrong, 10)], 2);
  assert.equal(task.state, 'wrong-result');
  assert.equal(task.artifact.checkResult.code, 'value-differs');
});

test('proof: declared without file details, and declared a different file', async () => {
  const noInfo = await stateOf({ 'out/1.txt': 'OK' }, [{ at: at(10), event: 'done', task: 1 }]);
  assert.equal(noInfo.state, 'declared-no-artifact-info');
  const other = await stateOf({ 'out/other.txt': 'OK' }, [await done(1, 'out/other.txt', 'OK', 10)]);
  assert.equal(other.state, 'wrong-file');
});

test('proof: a passing result that was never declared is only an uncertain effect', async () => {
  const task = await stateOf({ 'out/1.txt': 'OK' }, [{ at: at(10), event: 'started', task: 1 }]);
  assert.equal(task.state, 'undeclared-result');
  assert.notEqual(task.color, 'green');
});

test('proof: an error event makes the task failed; a half-written file is in progress', async () => {
  const failed = await stateOf({}, [{ at: at(10), event: 'started', task: 1 }, { at: at(5), event: 'error', task: 1, message: 'boom' }]);
  assert.equal(failed.state, 'failed');
  const partial = await stateOf({ 'out/1.txt': 'half' }, [{ at: at(10), event: 'started', task: 1 }]);
  assert.equal(partial.state, 'in-progress');
  assert.equal(partial.partialArtifact, true);
});

test('jury sample: real files, 3 of 7 proven, task 4 uncertain, likely failure with high confidence', async () => {
  const ws = await buildSampleWorkspace({ now: NOW });
  const report = await analyzeMission(subSource(ws, 'weekly-report'), { now: NOW, dir: 'weekly-report' });
  assert.equal(report.ok, true);
  assert.deepEqual(report.counts, { total: 7, proven: 3 });
  assert.deepEqual(report.tasks.map((t) => t.state), ['proven', 'proven', 'proven', 'in-progress', 'not-started', 'not-started', 'not-started']);
  assert.equal(report.tasks[3].partialArtifact, true);
  assert.equal(report.verdict.code, 'likely-failure');
  assert.equal(report.verdict.confidence, 'high');
  assert.equal(report.verdict.reason.key, 'silence');
  assert.ok(report.verdict.facts.some((f) => f.key === 'partial-file'));
});

test('workspace: lists missions, keeps a broken mission as a readable card', async () => {
  const ws = await buildSampleWorkspace({ now: NOW });
  await ws.write('broken/mission.json', '{ this is not json');
  await ws.write('broken/worklog.jsonl', '');
  const result = await analyzeWorkspace(ws, { now: NOW });
  const dirs = result.missions.map((m) => m.dir);
  // What needs attention first: the jury mission (likely failure), then unreadable missions.
  assert.deepEqual(dirs.slice(0, 3), ['weekly-report', 'broken', 'broken-mission']);
  const order = ATTENTION_ORDER;
  const ranks = result.missions.map((m) => order.indexOf(m.verdict.code));
  assert.deepEqual(ranks, [...ranks].sort((a, b) => a - b));
  const broken = result.missions.find((m) => m.dir === 'broken');
  assert.equal(broken.ok, false);
  assert.equal(broken.verdict.code, 'unreadable');
  assert.equal(broken.problems[0].code, 'invalid-json');
});

test('memory source: list, write, append, read-only', async () => {
  const src = createMemorySource({ 'a/b.txt': 'x' });
  assert.deepEqual(await src.list(''), [{ name: 'a', kind: 'dir' }]);
  await src.append('a/log.txt', 'one\n');
  await src.append('a/log.txt', 'two\n');
  assert.equal(await src.readText('a/log.txt'), 'one\ntwo\n');
  const ro = createMemorySource({}, { writable: false });
  await assert.rejects(() => ro.write('x', 'y'));
});
