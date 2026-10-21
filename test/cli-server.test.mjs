import test from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import { promises as fs } from 'node:fs';
import { demoReset, checkMission, formatReport } from '../tools/mission-rescue.mjs';
import { createServer } from '../tools/server.mjs';

async function tempWorkspace() {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'mission-rescue-'));
  await demoReset(dir);
  return dir;
}

test('command line: demo-reset writes real files and check finds the stopped mission', async () => {
  const ws = await tempWorkspace();
  const files = await fs.readdir(path.join(ws, 'weekly-report', 'out'));
  assert.deepEqual(files.sort(), ['01-zamowienia.json', '02-walidacja.json', '03-sumy.json', '04-podsumowanie.md']);
  const report = await checkMission(path.join(ws, 'weekly-report'));
  assert.equal(report.verdict.code, 'likely-failure');
  assert.deepEqual(report.counts, { total: 7, proven: 3 });
  const text = formatReport(report, 'en');
  assert.match(text, /LIKELY FAILURE/);
  assert.match(text, /3 of 7 proven/);
});

test('local program: read-only workspace listing and files, nothing outside', async (t) => {
  const ws = await tempWorkspace();
  const server = createServer({ workspace: ws });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  t.after(() => server.close());
  const base = `http://127.0.0.1:${server.address().port}`;

  const index = await (await fetch(`${base}/workspace/index.json`)).json();
  assert.ok(index.files.includes('weekly-report/mission.json'));
  assert.ok(index.files.includes('limits/limits.demo.json'));

  const mission = await fetch(`${base}/workspace/weekly-report/mission.json`);
  assert.equal(mission.status, 200);
  assert.equal(mission.headers.get('cache-control'), 'no-store');
  assert.equal((await mission.json()).id, 'weekly-report');

  // Dot segments are collapsed by the URL parser (nothing there to serve) or refused.
  assert.notEqual((await fetch(`${base}/workspace/%2e%2e/%2e%2e/package.json`)).status, 200);
  assert.equal((await fetch(`${base}/workspace/..%2f..%2fpackage.json`)).status, 403);
  assert.equal((await fetch(`${base}/workspace/.hidden`)).status, 403);
  assert.equal((await fetch(`${base}/etc/passwd`)).status, 404);
  assert.equal((await fetch(`${base}/workspace/weekly-report/mission.json`, { method: 'POST' })).status, 405);
  assert.equal((await fetch(`${base}/workspace/nope.json`)).status, 404);
});
