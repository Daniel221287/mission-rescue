// Sample Builder: builds the sample workspace with real computed files and times
// relative to "now". Used by the page (in memory), by demo-reset (on disk) and by tests.
// spec.md > Sample Builder and Sample Agent

import { createMemorySource } from '../engine/memory-source.mjs';
import { sha256Hex } from '../engine/hash.mjs';
import { INPUT_CSV, INPUT_FILE, weeklyMission, weeklyTask, partialSummary } from './weekly-report.mjs';
import { buildExtraSamples } from './extra-samples.mjs';

const MIN = 60000;

function iso(ms) {
  return new Date(ms).toISOString();
}

function json(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function jsonl(entries) {
  return `${entries.map((e) => JSON.stringify(e)).join('\n')}\n`;
}

// Runs real tasks inside a scratch memory folder and returns all its files.
async function runWeekly({ nowMs, provenTasks, startedTask, partial, minutesAgo }) {
  const scratch = createMemorySource({ 'mission.json': json(weeklyMission()), [INPUT_FILE]: INPUT_CSV });
  const read = (path) => scratch.readText(path);
  const t0 = nowMs - minutesAgo * MIN;
  const log = [];
  let minute = 0;
  for (const id of provenTasks) {
    const task = weeklyTask(id);
    log.push({ at: iso(t0 + minute * MIN), event: 'started', task: id });
    const content = await task.run(read);
    await scratch.write(task.artifact.file, content);
    minute += Math.max(3, Math.round(task.expectedMinutes * 0.8));
    log.push({ at: iso(t0 + minute * MIN), event: 'done', task: id, artifact: { file: task.artifact.file, sha256: await sha256Hex(content) } });
    minute += 1;
  }
  if (startedTask) {
    log.push({ at: iso(t0 + minute * MIN), event: 'started', task: startedTask });
    if (partial) await scratch.write(weeklyTask(startedTask).artifact.file, await partialSummary(read));
  }
  await scratch.write('worklog.jsonl', jsonl(log));
  const files = {};
  for (const path of scratch.paths()) files[path] = await scratch.readBytes(path);
  return files;
}

// The jury mission: 7 tasks, 1-3 proven, task 4 started with an incomplete file and an
// unknown effect, 5-7 not started, then about 2 h 20 min of silence.
export async function buildWeeklyReportFiles({ now = Date.now() } = {}) {
  const nowMs = typeof now === 'number' ? now : Date.parse(now);
  return runWeekly({ nowMs, provenTasks: [1, 2, 3], startedTask: 4, partial: true, minutesAgo: 160 });
}

export function demoLimitsFile({ now = Date.now() } = {}) {
  const nowMs = typeof now === 'number' ? now : Date.parse(now);
  return json({
    source: 'demo',
    note: 'Sample numbers for the demo, not real usage.',
    capturedAt: iso(nowMs - 3 * MIN),
    plans: [
      { plan: 'ChatGPT Pro', window: '5h', usedPercent: 18, resetsAt: iso(nowMs + 190 * MIN) },
      { plan: 'ChatGPT Pro', window: '7d', usedPercent: 41, resetsAt: iso(nowMs + 4 * 24 * 60 * MIN) },
      { plan: 'Claude Max', window: '5h', usedPercent: 100, resetsAt: iso(nowMs + 35 * MIN) },
      { plan: 'Claude Max', window: '7d', usedPercent: 63, resetsAt: iso(nowMs + 2 * 24 * 60 * MIN) },
    ],
  });
}

// Every sample mission: folder name -> files.
export async function buildSampleMissions({ now = Date.now() } = {}) {
  return {
    'weekly-report': await buildWeeklyReportFiles({ now }),
    ...(await buildExtraSamples({ now })),
  };
}

export async function buildSampleWorkspace({ now = Date.now(), label = 'samples' } = {}) {
  const files = {};
  const missions = await buildSampleMissions({ now });
  for (const [dir, missionFiles] of Object.entries(missions)) {
    for (const [path, data] of Object.entries(missionFiles)) files[`${dir}/${path}`] = data;
  }
  files['limits/limits.demo.json'] = demoLimitsFile({ now });
  return createMemorySource(files, { label, writable: true });
}
