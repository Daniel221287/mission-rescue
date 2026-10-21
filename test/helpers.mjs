// Small helpers to build missions in memory for tests.
import { createMemorySource } from '../app/engine/memory-source.mjs';
import { sha256Hex } from '../app/engine/hash.mjs';

export const MIN = 60000;
export const NOW = Date.parse('2026-10-21T12:00:00Z');

export function at(minutesBeforeNow) {
  return new Date(NOW - minutesBeforeNow * MIN).toISOString();
}

export function missionJson(overrides = {}) {
  return {
    format: 'mission-rescue/1',
    id: 'test',
    title: { pl: 'Misja testowa', en: 'Test mission' },
    agent: 'tester',
    plan: 'Plan X',
    stallMinutes: 30,
    tasks: [
      { id: 1, title: 'one', artifact: { file: 'out/1.txt', check: { type: 'contains', text: 'OK' } } },
      { id: 2, title: 'two', artifact: { file: 'out/2.json', check: { type: 'json', path: 'failed', equals: 0 } } },
      { id: 3, title: 'three', expectedMinutes: 40, artifact: { file: 'out/3.txt', check: { type: 'nonEmpty' } } },
    ],
    ...overrides,
  };
}

export async function done(task, file, content, minutesBeforeNow) {
  return { at: at(minutesBeforeNow), event: 'done', task, artifact: { file, sha256: await sha256Hex(content) } };
}

export function source({ mission = missionJson(), log = [], files = {} } = {}) {
  const all = { ...files };
  if (mission !== null) all['mission.json'] = typeof mission === 'string' ? mission : JSON.stringify(mission);
  if (log !== null) all['worklog.jsonl'] = log.map((e) => (typeof e === 'string' ? e : JSON.stringify(e))).join('\n') + '\n';
  return createMemorySource(all);
}
