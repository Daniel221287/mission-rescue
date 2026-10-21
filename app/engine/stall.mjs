// Stall Detector: one honest verdict per mission, with the reason, the facts used and a
// confidence level. Progress means a new proven result; heartbeats and notes are only
// signs of life. Silence is not automatically a failure: the waiting time T scales with
// the current task's expected duration, and a short silence is "undetermined".
// spec.md > Stall Detector · prd.md > Stall Detector

import { PROOF_PROBLEM_STATES } from './proof.mjs';
import { limitForPlan } from './limits.mjs';

export const VERDICT_COLOR = {
  complete: 'green',
  'proof-problem': 'red',
  'likely-failure': 'red',
  'no-progress': 'red',
  'waiting-limit': 'amber',
  'waiting-human': 'teal',
  working: 'amber',
  undetermined: 'grey',
  'not-started': 'grey',
  unreadable: 'red',
};

const LIMIT_USED_UP = 95;
const SIGNS_OF_LIFE = new Set(['heartbeat', 'note']);

function verdict(code, confidence, reason, facts, extra = {}) {
  return { code, color: VERDICT_COLOR[code], confidence, reason, facts, ...extra };
}

export function waitingTimeMs(mission, currentTask) {
  const expected = currentTask && currentTask.expectedMinutes ? currentTask.expectedMinutes * 1.5 : 0;
  return Math.max(mission.stallMinutes, expected) * 60000;
}

export function diagnose({ mission, tasks, events, now, limits = [] }) {
  const nowMs = typeof now === 'number' ? now : Date.parse(now);
  const total = tasks.length;
  const proven = tasks.filter((t) => t.state === 'proven');
  const facts = [];

  if (proven.length === total) {
    return verdict('complete', 'high', { key: 'all-proven', params: { total } }, [
      { key: 'proven-count', params: { proven: total, total } },
    ]);
  }

  const broken = tasks.find((t) => PROOF_PROBLEM_STATES.has(t.state));
  if (broken) {
    return verdict('proof-problem', 'high', { key: 'proof-failed', params: { task: broken.id, state: broken.state } }, [
      { key: 'proof-state', params: { task: broken.id, state: broken.state, file: broken.artifact.file } },
    ], { currentTask: broken.id });
  }

  if (!events.length) {
    return verdict('not-started', 'high', { key: 'no-events', params: {} }, []);
  }

  const current = tasks.find((t) => t.state !== 'proven') || null;
  const T = waitingTimeMs(mission, current);
  const lastProven = proven.filter((t) => t.doneAtMs != null).sort((a, b) => b.doneAtMs - a.doneAtMs)[0] || null;
  const progressAt = lastProven ? lastProven.doneAtMs : events[0].atMs;
  // The clock for "no progress" starts at the later of the last proven result and the
  // start of the task being worked on now, so a task that has just started is not blamed.
  const workStart = Math.max(progressAt, current && current.startedAtMs != null ? current.startedAtMs : -Infinity);
  const lastEvent = events[events.length - 1];
  const meaningful = events.filter((e) => !SIGNS_OF_LIFE.has(e.event));
  const lastMeaningful = meaningful.length ? meaningful[meaningful.length - 1] : null;
  const silence = Math.max(0, nowMs - lastEvent.atMs);
  const noProgress = Math.max(0, nowMs - workStart);
  const limit = limitForPlan(mission.plan, limits, nowMs);

  if (lastProven) facts.push({ key: 'last-proven', params: { task: lastProven.id, at: lastProven.doneAt } });
  else facts.push({ key: 'nothing-proven', params: {} });
  facts.push({ key: 'last-signal', params: { event: lastEvent.event, task: lastEvent.task, at: lastEvent.at } });
  facts.push({ key: 'silence', params: { ms: silence } });
  facts.push({ key: 'waiting-time', params: { ms: T, minimum: mission.stallMinutes, expected: current ? current.expectedMinutes : null } });
  if (current && current.partialArtifact) facts.push({ key: 'partial-file', params: { task: current.id, file: current.artifact.file } });
  if (limit) {
    facts.push({ key: 'limit', params: { plan: limit.plan, window: limit.window, used: limit.usedPercent, until: limit.resetsAt, label: limit.label } });
  } else if (mission.plan) {
    facts.push({ key: 'limit-unknown', params: { plan: mission.plan } });
  }
  const base = { currentTask: current ? current.id : null, waitMs: T, silenceMs: silence, noProgressMs: noProgress };

  if (lastMeaningful && lastMeaningful.event === 'error' && lastMeaningful.atMs >= progressAt) {
    return verdict('likely-failure', 'high', { key: 'error-reported', params: { task: lastMeaningful.task, message: lastMeaningful.message || '' } }, facts, base);
  }

  if (lastMeaningful && lastMeaningful.event === 'waiting' && lastMeaningful.atMs >= progressAt) {
    const w = lastMeaningful;
    if (w.reason === 'human') {
      return verdict('waiting-human', 'high', { key: 'question', params: { question: w.question || '', task: w.task } }, facts, base);
    }
    if (w.reason === 'limit') {
      const untilMs = w.untilMs ?? (limit ? limit.resetsAtMs : null);
      const until = w.until ?? (limit ? limit.resetsAt : null);
      if (untilMs != null && untilMs > nowMs) {
        const corroborated = Boolean(limit && limit.usedPercent >= LIMIT_USED_UP);
        return verdict('waiting-limit', corroborated ? 'high' : 'medium', { key: 'agent-said-limit', params: { until, corroborated } }, facts, base);
      }
      if (untilMs != null && nowMs - untilMs > T && lastEvent.atMs <= untilMs) {
        return verdict('likely-failure', 'medium', { key: 'limit-back-agent-not', params: { until } }, facts, base);
      }
      return verdict('waiting-limit', 'medium', { key: 'agent-said-limit', params: { until, corroborated: false } }, facts, base);
    }
    return verdict('undetermined', 'medium', { key: 'waiting-other', params: { message: w.message || w.question || '' } }, facts, base);
  }

  if (noProgress > T && silence <= T) {
    const beats = events.filter((e) => e.atMs > workStart && e.event !== 'done').length;
    return verdict('no-progress', noProgress > 2 * T ? 'high' : 'medium', { key: 'signs-of-life-only', params: { sinceMs: noProgress, beats } }, facts, base);
  }

  if (silence > T) {
    if (limit && limit.usedPercent >= LIMIT_USED_UP && limit.resetsAtMs && limit.resetsAtMs > nowMs) {
      return verdict('waiting-limit', 'medium', { key: 'inferred-from-limits', params: { plan: limit.plan, window: limit.window, used: limit.usedPercent, until: limit.resetsAt } }, facts, base);
    }
    if (silence > 3 * T) {
      const partial = Boolean(current && current.partialArtifact);
      return verdict('likely-failure', partial ? 'high' : 'medium', { key: 'silence', params: { task: current ? current.id : null, partial, silenceMs: silence } }, facts, base);
    }
    return verdict('undetermined', 'low', { key: 'short-silence', params: { silenceMs: silence, waitMs: T } }, facts, base);
  }

  return verdict('working', 'medium', { key: noProgress <= T ? 'recent-progress' : 'recent-activity', params: { at: lastEvent.at } }, facts, base);
}
