// Work Log Reader: reads worklog.jsonl, one JSON object per line.
// spec.md > Work Log Reader · prd.md > Mission Tracker

export const LOG_FILE = 'worklog.jsonl';
export const EVENTS = ['started', 'progress', 'done', 'waiting', 'error', 'heartbeat', 'note'];
const WAIT_REASONS = new Set(['limit', 'human', 'other']);

function problem(code, line, params = {}) {
  return { file: LOG_FILE, line, code, ...params };
}

export function parseWorklog(text, { taskIds } = {}) {
  const events = [];
  const problems = [];
  const known = taskIds ? new Set(taskIds) : null;
  const lines = String(text ?? '').split(/\r?\n/);
  lines.forEach((raw, index) => {
    const line = index + 1;
    if (!raw.trim()) return;
    let entry;
    try {
      entry = JSON.parse(raw);
    } catch {
      problems.push(problem('invalid-json', line));
      return;
    }
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return problems.push(problem('not-an-object', line));
    const atMs = Date.parse(entry.at);
    if (typeof entry.at !== 'string' || !Number.isFinite(atMs)) return problems.push(problem('bad-time', line));
    if (!EVENTS.includes(entry.event)) return problems.push(problem('unknown-event', line, { found: String(entry.event ?? '') }));
    let task = null;
    if (entry.task != null) {
      if (!Number.isInteger(entry.task) || (known && !known.has(entry.task))) {
        return problems.push(problem('unknown-task', line, { found: String(entry.task) }));
      }
      task = entry.task;
    }
    if (['started', 'progress', 'done'].includes(entry.event) && task == null) {
      return problems.push(problem('missing-task', line));
    }
    const event = { line, at: new Date(atMs).toISOString(), atMs, event: entry.event, task };
    if (entry.event === 'done' && entry.artifact && typeof entry.artifact === 'object') {
      event.artifact = {
        file: typeof entry.artifact.file === 'string' ? entry.artifact.file : null,
        sha256: typeof entry.artifact.sha256 === 'string' ? entry.artifact.sha256.toLowerCase() : null,
      };
    }
    if (entry.event === 'waiting') {
      event.reason = WAIT_REASONS.has(entry.reason) ? entry.reason : 'other';
      const untilMs = Date.parse(entry.until);
      if (Number.isFinite(untilMs)) {
        event.until = new Date(untilMs).toISOString();
        event.untilMs = untilMs;
      }
      if (typeof entry.question === 'string') event.question = entry.question;
    }
    if (typeof entry.message === 'string') event.message = entry.message;
    events.push(event);
  });
  events.sort((a, b) => a.atMs - b.atMs || a.line - b.line);
  return { events, problems };
}

export async function readWorklog(source, options = {}) {
  const text = await source.readText(LOG_FILE);
  if (text == null) return { events: [], problems: [], missing: true };
  return { ...parseWorklog(text, options), missing: false };
}
