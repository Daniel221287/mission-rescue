// Mission Analyzer: lists the missions of a source and analyzes one mission end to end.
// spec.md > Mission Analyzer · prd.md > The Core Journey

import { readMission, MISSION_FILE } from './mission.mjs';
import { readWorklog, LOG_FILE } from './worklog.mjs';
import { judgeTask } from './proof.mjs';
import { diagnose, VERDICT_COLOR } from './stall.mjs';
import { readLimits, LIMITS_DIR } from './limits.mjs';
import { planRescue } from './rescue.mjs';
import { subSource } from './paths.mjs';

const RECENT_EVENTS = 12;

export async function listMissions(workspace) {
  if ((await workspace.readBytes(MISSION_FILE)) != null) return [{ dir: '.', name: '.' }];
  let entries = [];
  try {
    entries = await workspace.list('');
  } catch {
    return [];
  }
  const missions = [];
  for (const entry of entries) {
    if (entry.kind !== 'dir' || entry.name === LIMITS_DIR || entry.name.startsWith('.') || entry.name.startsWith('_')) continue;
    const sub = subSource(workspace, entry.name);
    if ((await sub.readBytes(MISSION_FILE)) != null || (await sub.readBytes(LOG_FILE)) != null) {
      missions.push({ dir: entry.name, name: entry.name });
    }
  }
  return missions;
}

export async function analyzeMission(source, { now = Date.now(), limits = [], confirmations = [], dir = '.' } = {}) {
  const nowMs = typeof now === 'number' ? now : Date.parse(now);
  const { mission, problems: missionProblems } = await readMission(source);
  if (!mission) {
    return {
      dir,
      ok: false,
      title: null,
      problems: missionProblems,
      tasks: [],
      counts: { total: 0, proven: 0 },
      verdict: {
        code: 'unreadable',
        color: VERDICT_COLOR.unreadable,
        confidence: 'high',
        reason: { key: 'unreadable', params: { file: MISSION_FILE, problem: missionProblems[0] || null } },
        facts: [],
      },
      recentEvents: [],
      checkedAt: new Date(nowMs).toISOString(),
    };
  }

  const { events, problems: logProblems, missing: logMissing } = await readWorklog(source, {
    taskIds: mission.tasks.map((t) => t.id),
  });
  // Human confirmations are stored per mission (its id, or its folder) and per exact file fingerprint.
  const missionKey = mission.id || dir;
  const tasks = [];
  for (const task of mission.tasks) tasks.push(await judgeTask(task, events, source, { confirmations, missionKey }));
  // Demo numbers (written with the built-in samples) explain the samples only; they never
  // decide anything about a real mission, even one that uses the same plan name.
  const usableLimits = mission.demo ? limits : limits.filter((entry) => entry.label !== 'demo');
  const verdict = diagnose({ mission, tasks, events, now: nowMs, limits: usableLimits, logProblems: logProblems.length });

  const report = {
    dir,
    ok: true,
    key: missionKey,
    id: mission.id,
    title: mission.title,
    agent: mission.agent,
    plan: mission.plan,
    demo: mission.demo,
    stallMinutes: mission.stallMinutes,
    problems: [...logProblems],
    logMissing,
    tasks,
    counts: { total: tasks.length, proven: tasks.filter((t) => t.state === 'proven').length },
    verdict,
    recentEvents: events.slice(-RECENT_EVENTS).map(({ line, at, event, task, reason, question, message, artifact, until }) => ({
      line, at, event, task, reason, question, message, artifact, until,
    })),
    checkedAt: new Date(nowMs).toISOString(),
  };
  report.rescue = planRescue(report);
  return report;
}

// The command center lists what needs attention first; finished missions go to the bottom.
export const ATTENTION_ORDER = [
  'proof-problem', 'likely-failure', 'unreadable', 'no-progress', 'needs-confirmation', 'waiting-human',
  'waiting-limit', 'undetermined', 'working', 'not-started', 'complete',
];

function attention(report) {
  const index = ATTENTION_ORDER.indexOf(report.verdict.code);
  return index === -1 ? ATTENTION_ORDER.length : index;
}

export async function analyzeWorkspace(workspace, { now = Date.now(), manualLimits = [], confirmations = [] } = {}) {
  const nowMs = typeof now === 'number' ? now : Date.parse(now);
  const limits = await readLimits(workspace, { now: nowMs, manual: manualLimits });
  const list = await listMissions(workspace);
  const missions = [];
  for (const { dir } of list) {
    const source = subSource(workspace, dir);
    missions.push(await analyzeMission(source, { now: nowMs, limits: limits.entries, confirmations, dir }));
  }
  missions.sort((a, b) => attention(a) - attention(b) || a.dir.localeCompare(b.dir));
  return { missions, limits, checkedAt: new Date(nowMs).toISOString() };
}
