// The picked-folder sources (File System Access handles and the webkitdirectory fallback),
// exercised with stand-ins for the browser objects.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHandleSource, createFileListSource, servedFromThisComputer } from '../app/sources-browser.mjs';
import { buildSampleMissions } from '../app/demo/samples.mjs';
import { analyzeWorkspace } from '../app/engine/analyze.mjs';
import { toBytes } from '../app/engine/hash.mjs';
import { NOW } from './helpers.mjs';

function notFound() {
  const error = new Error('not found');
  error.name = 'NotFoundError';
  return error;
}

// A minimal FileSystemDirectoryHandle over a { path: bytes } map.
function fakeDirHandle(files, name = 'missions', prefix = '') {
  const children = new Map();
  for (const [full, data] of Object.entries(files)) {
    if (!full.startsWith(prefix)) continue;
    const rest = full.slice(prefix.length);
    const [head, ...tail] = rest.split('/');
    children.set(head, tail.length ? 'directory' : { data });
  }
  return {
    kind: 'directory',
    name,
    async getDirectoryHandle(child) {
      if (children.get(child) !== 'directory') throw notFound();
      return fakeDirHandle(files, child, `${prefix}${child}/`);
    },
    async getFileHandle(child) {
      const entry = children.get(child);
      if (!entry || entry === 'directory') throw notFound();
      return { kind: 'file', name: child, async getFile() { return { async arrayBuffer() { return toBytes(entry.data).buffer; } }; } };
    },
    async *entries() {
      for (const [child, entry] of children) yield [child, { kind: entry === 'directory' ? 'directory' : 'file' }];
    },
  };
}

async function sampleFiles() {
  const missions = await buildSampleMissions({ now: NOW });
  const files = {};
  for (const [dir, map] of Object.entries(missions)) for (const [p, data] of Object.entries(map)) files[`${dir}/${p}`] = data;
  return files;
}

test('picked folder (File System Access): the same verdicts as the built-in samples', async () => {
  const handleSource = createHandleSource(fakeDirHandle({ ...(await sampleFiles()), '.git/config': 'x' }));
  assert.equal(handleSource.writable, false);
  const result = await analyzeWorkspace(handleSource, { now: NOW });
  const weekly = result.missions.find((m) => m.dir === 'weekly-report');
  assert.deepEqual([weekly.verdict.code, weekly.counts.proven, weekly.counts.total], ['likely-failure', 3, 7]);
  assert.equal(result.missions.length, 8);
  assert.equal(await handleSource.readBytes('weekly-report/nope.txt'), null);
});

test('picked folder (webkitdirectory fallback): a snapshot that works the same way, hidden files skipped', async () => {
  const files = await sampleFiles();
  const list = Object.entries(files).map(([p, data]) => ({
    name: p.split('/').pop(),
    webkitRelativePath: `missions/${p}`,
    async arrayBuffer() { return toBytes(data).buffer; },
  }));
  list.push({ name: 'secret', webkitRelativePath: 'missions/.env/secret', async arrayBuffer() { return toBytes('x').buffer; } });
  const src = createFileListSource(list);
  assert.equal(src.label, 'missions');
  assert.equal(src.snapshot, true);
  assert.equal(await src.readBytes('.env/secret'), null);
  const result = await analyzeWorkspace(src, { now: NOW });
  assert.equal(result.missions.find((m) => m.dir === 'offer-effect').verdict.code, 'needs-confirmation');
});

test('picking one mission folder (with mission.json inside) shows that mission', async () => {
  const files = await sampleFiles();
  const one = {};
  for (const [p, data] of Object.entries(files)) if (p.startsWith('logo-human/')) one[p.slice('logo-human/'.length)] = data;
  const result = await analyzeWorkspace(createHandleSource(fakeDirHandle(one, 'logo-human')), { now: NOW });
  assert.deepEqual(result.missions.map((m) => [m.dir, m.verdict.code]), [['.', 'waiting-human']]);
});

test('the page asks for the local program only when it was opened from this computer', () => {
  assert.equal(servedFromThisComputer({ protocol: 'http:', hostname: '127.0.0.1' }), true);
  assert.equal(servedFromThisComputer({ protocol: 'http:', hostname: 'localhost' }), true);
  assert.equal(servedFromThisComputer({ protocol: 'https:', hostname: 'daniel221287.github.io' }), false);
  assert.equal(servedFromThisComputer(undefined), false);
});
