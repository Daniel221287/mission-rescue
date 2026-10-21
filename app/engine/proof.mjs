// Proof Engine: four separate proof levels per task.
//   1 declared  - the agent logged "done" with the result file and its SHA-256
//   2 exists    - the result file is really there
//   3 verified  - the file's SHA-256 equals the declared one and the task's condition passes
//   4 effect    - only for tasks with an outside effect: an independent (human) confirmation
//                 tied to this exact file fingerprint
// A task is green ("proven") only when every level that applies is met.
// spec.md > Proof Engine · prd.md > Proof Engine

import { sha256Hex, bytesToText, isSha256Hex } from './hash.mjs';
import { safeRelPath, isSafeRelPath } from './paths.mjs';

export const PROOF_PROBLEM_STATES = new Set(['artifact-missing', 'hash-mismatch', 'wrong-result', 'wrong-file']);
export const UNCERTAIN_STATES = new Set([
  'declared-no-artifact-info',
  'undeclared-result',
  'effect-unconfirmed',
  'in-progress',
  'failed',
  ...PROOF_PROBLEM_STATES,
]);

export const STATE_COLOR = {
  proven: 'green',
  'effect-unconfirmed': 'amber',
  'declared-no-artifact-info': 'amber',
  'undeclared-result': 'amber',
  'in-progress': 'amber',
  'artifact-missing': 'red',
  'hash-mismatch': 'red',
  'wrong-result': 'red',
  'wrong-file': 'red',
  failed: 'red',
  'not-started': 'grey',
};

function readPath(value, path) {
  let current = value;
  for (const part of path.split('.')) {
    if (current == null) return undefined;
    current = Array.isArray(current) && /^\d+$/.test(part) ? current[Number(part)] : current[part];
  }
  return current;
}

// Deep equality for JSON values; the order of object keys does not matter.
function sameValue(a, b) {
  if (a === b) return true;
  if (a === null || b === null || typeof a !== 'object' || typeof b !== 'object') return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  if (Array.isArray(a)) return a.length === b.length && a.every((value, i) => sameValue(value, b[i]));
  const keys = Object.keys(a);
  return keys.length === Object.keys(b).length && keys.every((k) => Object.prototype.hasOwnProperty.call(b, k) && sameValue(a[k], b[k]));
}

export function runCheck(check, bytes) {
  const text = bytesToText(bytes);
  if (check.type === 'contains') {
    return check.text && text.includes(check.text)
      ? { ok: true, type: 'contains', text: check.text }
      : { ok: false, type: 'contains', code: 'text-missing', text: check.text };
  }
  if (check.type === 'json') {
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      return { ok: false, type: 'json', code: 'invalid-json', path: check.path, expected: check.equals };
    }
    const actual = readPath(data, check.path);
    return sameValue(actual, check.equals)
      ? { ok: true, type: 'json', path: check.path, expected: check.equals, actual }
      : { ok: false, type: 'json', code: 'value-differs', path: check.path, expected: check.equals, actual };
  }
  return text.trim().length > 0 ? { ok: true, type: 'nonEmpty' } : { ok: false, type: 'nonEmpty', code: 'empty' };
}

export function findConfirmation(confirmations, missionKey, taskId, sha256) {
  if (!Array.isArray(confirmations) || !sha256) return null;
  return (
    confirmations.find((c) => c && c.mission === missionKey && c.task === taskId && c.sha256 === sha256) || null
  );
}

export async function judgeTask(task, events, source, { confirmations = [], missionKey = null } = {}) {
  // The log is append-only, so the order of its lines is the order of the work, even if the
  // agent's clock jumps back a little between two lines.
  const own = events.filter((e) => e.task === task.id).sort((a, b) => (a.line ?? 0) - (b.line ?? 0));
  // A task can be started again (a retry, or a rescue): the work clock follows the latest start.
  // Agents that never log "started" are timed from their first "progress" line.
  const starts = own.filter((e) => e.event === 'started');
  const started = starts.length ? starts[starts.length - 1] : own.find((e) => e.event === 'progress') || null;
  const doneEvents = own.filter((e) => e.event === 'done');
  const lastDone = doneEvents.length ? doneEvents[doneEvents.length - 1] : null;
  const lastEvent = own.length ? own[own.length - 1] : null;
  const file = task.artifact.file;

  const bytes = await source.readBytes(file);
  const exists = bytes != null;
  const actualSha = exists ? await sha256Hex(bytes) : null;
  const check = exists ? runCheck(task.artifact.check, bytes) : null;

  const declaredFile = lastDone && lastDone.artifact && isSafeRelPath(lastDone.artifact.file)
    ? safeRelPath(lastDone.artifact.file)
    : null;
  const declaredSha = lastDone && lastDone.artifact && isSha256Hex(lastDone.artifact.sha256) ? lastDone.artifact.sha256 : null;
  const declaredFully = Boolean(lastDone && declaredFile && declaredSha);

  const confirmation = task.effect ? findConfirmation(confirmations, missionKey, task.id, actualSha) : null;

  let state;
  if (lastDone) {
    if (!declaredFully) state = 'declared-no-artifact-info';
    else if (declaredFile !== file) state = 'wrong-file';
    else if (!exists) state = 'artifact-missing';
    else if (declaredSha !== actualSha) state = 'hash-mismatch';
    else if (!check.ok) state = 'wrong-result';
    else if (task.effect && !confirmation) state = 'effect-unconfirmed';
    else state = 'proven';
  } else if (exists && check.ok) {
    state = 'undeclared-result';
  } else if (lastEvent && lastEvent.event === 'error') {
    state = 'failed';
  } else if (started || exists) {
    state = 'in-progress';
  } else {
    state = 'not-started';
  }

  const verified = declaredFully && declaredFile === file && exists && declaredSha === actualSha && Boolean(check && check.ok);
  return {
    id: task.id,
    title: task.title,
    expectedMinutes: task.expectedMinutes,
    state,
    color: STATE_COLOR[state],
    levels: {
      declared: declaredFully ? 'yes' : lastDone ? 'partial' : 'no',
      exists,
      verified,
      effect: task.effect ? (confirmation ? 'confirmed' : 'unconfirmed') : 'not-applicable',
    },
    artifact: {
      file,
      check: task.artifact.check,
      exists,
      size: exists ? bytes.length : null,
      actualSha,
      declaredFile,
      declaredSha,
      checkResult: check,
    },
    // A result file that exists but fails its condition while the task was never declared
    // means the work stopped mid-way (for example a half-written file).
    partialArtifact: Boolean(!lastDone && exists && check && !check.ok),
    effect: task.effect ? { where: task.effect.where, confirmation } : null,
    startedAt: started ? started.at : null,
    startedAtMs: started ? started.atMs : null,
    doneAt: lastDone ? lastDone.at : null,
    doneAtMs: lastDone ? lastDone.atMs : null,
    lastEventAt: lastEvent ? lastEvent.at : null,
    errorMessage: lastEvent && lastEvent.event === 'error' ? lastEvent.message || null : null,
  };
}
