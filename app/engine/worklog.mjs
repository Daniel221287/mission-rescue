// Work Log Reader: reads worklog.jsonl, one JSON object per line.
// spec.md > Work Log Reader · prd.md > Mission Tracker

export const LOG_FILE = 'worklog.jsonl';
export const EVENTS = ['started', 'progress', 'done', 'waiting', 'error', 'heartbeat', 'note'];
const WAIT_REASONS = new Set(['limit', 'human', 'other']);

// Free text from the agent: a string, or the same text in Polish and English ({"pl": …, "en": …}).
export function readText(value) {
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const out = {};
    for (const lang of ['pl', 'en']) if (typeof value[lang] === 'string' && value[lang].trim()) out[lang] = value[lang];
    return Object.keys(out).length ? out : null;
  }
  return null;
}

function problem(code, line, params = {}) {
  return { file: LOG_FILE, line, code, ...params };
}

// The 64 hex characters of a SHA-256, also when the agent pasted a tool's whole output
// ("<hash>  out/file.md", a trailing newline, upper case, or bytes separated by spaces).
export function cleanSha256(value) {
  if (typeof value !== 'string') return null;
  const text = value.trim().toLowerCase();
  const joined = text.replace(/\s+/g, '');
  if (/^[0-9a-f]{64}$/.test(joined)) return joined;
  return text.split(/\s+/)[0] || null;
}

// ISO 8601 with a time zone: ends with Z or an offset such as +02:00.
const HAS_ZONE = /(?:z|[+-]\d{2}(?::?\d{2})?)$/i;

export function parseWorklog(text, { taskIds } = {}) {
  const events = [];
  const problems = [];
  const known = taskIds ? new Set(taskIds) : null;
  const noZone = [];
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
    // Without a time zone the time is read as this computer's local time; it still counts,
    // but the result then depends on where Mission Rescue runs, so it is reported.
    if (!HAS_ZONE.test(entry.at.trim())) noZone.push(line);
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
        sha256: cleanSha256(entry.artifact.sha256),
      };
    }
    if (entry.event === 'waiting') {
      event.reason = WAIT_REASONS.has(entry.reason) ? entry.reason : 'other';
      const untilMs = Date.parse(entry.until);
      if (Number.isFinite(untilMs)) {
        event.until = new Date(untilMs).toISOString();
        event.untilMs = untilMs;
      }
      const question = readText(entry.question);
      if (question) event.question = question;
    }
    const message = readText(entry.message);
    if (message) event.message = message;
    events.push(event);
  });
  if (noZone.length) problems.push(problem('time-without-zone', noZone[0], { count: noZone.length }));
  events.sort((a, b) => a.atMs - b.atMs || a.line - b.line);
  return { events, problems };
}

export async function readWorklog(source, options = {}) {
  const text = await source.readText(LOG_FILE);
  if (text == null) return { events: [], problems: [], missing: true };
  return { ...parseWorklog(text, options), missing: false };
}
