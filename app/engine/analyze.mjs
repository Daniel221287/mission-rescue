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
        reason: { key: 'unreadable', params: { file: MISSION_FILE } },
        facts: [],
      },
      recentEvents: [],
      checkedAt: new Date(nowMs).toISOString(),
    };
  }

  const { events, problems: logProblems, missing: logMissing } = await readWorklog(source, {
    taskIds: mission.tasks.map((t) => t.id),
  });
  const missionKey = dir;
  const tasks = [];
  for (const task of mission.tasks) tasks.push(await judgeTask(task, events, source, { confirmations, missionKey }));
  const verdict = diagnose({ mission, tasks, events, now: nowMs, limits });

  const report = {
    dir,
    ok: true,
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

export async function analyzeWorkspace(workspace, { now = Date.now(), manualLimits = [], confirmations = [] } = {}) {
  const nowMs = typeof now === 'number' ? now : Date.parse(now);
  const limits = await readLimits(workspace, { now: nowMs, manual: manualLimits });
  const list = await listMissions(workspace);
  const missions = [];
  for (const { dir } of list) {
    const source = subSource(workspace, dir);
    missions.push(await analyzeMission(source, { now: nowMs, limits: limits.entries, confirmations, dir }));
  }
  return { missions, limits, checkedAt: new Date(nowMs).toISOString() };
}
