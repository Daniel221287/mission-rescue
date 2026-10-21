// Mission Reader: reads and validates mission.json.
// spec.md > Mission Reader · prd.md > Mission Tracker

import { isSafeRelPath, safeRelPath } from './paths.mjs';

export const MISSION_FILE = 'mission.json';
export const MISSION_FORMAT = 'mission-rescue/1';
export const DEFAULT_STALL_MINUTES = 30;
const CHECK_TYPES = new Set(['contains', 'json', 'nonEmpty']);

function text2(value) {
  if (typeof value === 'string' && value.trim()) return { pl: value.trim(), en: value.trim() };
  if (value && typeof value === 'object') {
    const pl = typeof value.pl === 'string' && value.pl.trim() ? value.pl.trim() : null;
    const en = typeof value.en === 'string' && value.en.trim() ? value.en.trim() : null;
    if (pl || en) return { pl: pl || en, en: en || pl };
  }
  return null;
}

function positiveNumber(value) {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : null;
}

function problem(code, params = {}) {
  return { file: MISSION_FILE, code, ...params };
}

function validateCheck(check) {
  if (!check || typeof check !== 'object' || !CHECK_TYPES.has(check.type)) return null;
  if (check.type === 'contains') {
    return typeof check.text === 'string' && check.text.length ? { type: 'contains', text: check.text } : null;
  }
  if (check.type === 'json') {
    if (typeof check.path !== 'string' || !check.path.trim() || !('equals' in check)) return null;
    return { type: 'json', path: check.path.trim(), equals: check.equals };
  }
  return { type: 'nonEmpty' };
}

// Where a JSON text stops being valid (character index), or null when it is valid.
// Engines word their errors differently and some give no position, so the page and the
// command line find the place the same way themselves.
export function jsonErrorPosition(text) {
  const s = String(text);
  let i = 0;
  const fail = () => {
    throw i;
  };
  const ws = () => {
    while (i < s.length && ' \t\n\r'.includes(s[i])) i += 1;
  };
  function string() {
    i += 1;
    while (i < s.length) {
      const c = s[i];
      if (c === '"') {
        i += 1;
        return;
      }
      if (c === '\\') i += 2;
      else if (c < ' ') fail();
      else i += 1;
    }
    fail();
  }
  function number() {
    const m = /^-?(0|[1-9]\d*)(\.\d+)?([eE][+-]?\d+)?/.exec(s.slice(i));
    if (!m) fail();
    i += m[0].length;
  }
  function list(close, item) {
    i += 1;
    ws();
    if (s[i] === close) {
      i += 1;
      return;
    }
    for (;;) {
      item();
      ws();
      if (s[i] === ',') {
        i += 1;
        continue;
      }
      if (s[i] === close) {
        i += 1;
        return;
      }
      fail();
    }
  }
  function value() {
    ws();
    const c = s[i];
    if (c === '{') {
      list('}', () => {
        ws();
        if (s[i] !== '"') fail();
        string();
        ws();
        if (s[i] !== ':') fail();
        i += 1;
        value();
      });
    } else if (c === '[') list(']', value);
    else if (c === '"') string();
    else if (c === '-' || (c >= '0' && c <= '9')) number();
    else if (s.startsWith('true', i)) i += 4;
    else if (s.startsWith('false', i)) i += 5;
    else if (s.startsWith('null', i)) i += 4;
    else fail();
  }
  try {
    value();
    ws();
    if (i < s.length) fail();
    return null;
  } catch (position) {
    return typeof position === 'number' ? Math.min(position, s.length) : null;
  }
}

export function jsonErrorLine(text) {
  const position = jsonErrorPosition(text);
  return position == null ? null : String(text).slice(0, position).split('\n').length;
}

export function parseMission(text) {
  let raw;
  try {
    raw = JSON.parse(text);
  } catch (error) {
    const line = jsonErrorLine(text);
    return { mission: null, problems: [problem('invalid-json', line ? { detail: error.message, line } : { detail: error.message })] };
  }
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { mission: null, problems: [problem('not-an-object')] };
  }
  const problems = [];
  if (raw.format !== MISSION_FORMAT) problems.push(problem('unknown-format', { found: String(raw.format ?? '') }));
  const title = text2(raw.title);
  if (!title) problems.push(problem('bad-title'));
  if (!Array.isArray(raw.tasks) || raw.tasks.length === 0) {
    problems.push(problem('no-tasks'));
    return { mission: null, problems };
  }

  const seen = new Set();
  const tasks = [];
  raw.tasks.forEach((task, index) => {
    const where = { task: task && task.id != null ? task.id : `#${index + 1}` };
    if (!task || typeof task !== 'object') return problems.push(problem('bad-task', where));
    if (!Number.isInteger(task.id) || task.id <= 0) return problems.push(problem('bad-task-id', where));
    if (seen.has(task.id)) return problems.push(problem('duplicate-task-id', where));
    seen.add(task.id);
    const taskTitle = text2(task.title);
    if (!taskTitle) problems.push(problem('bad-task-title', where));
    const artifact = task.artifact;
    if (!artifact || !isSafeRelPath(artifact.file)) return problems.push(problem('bad-artifact', where));
    const check = validateCheck(artifact.check);
    if (!check) return problems.push(problem('bad-check', where));
    let effect = null;
    if (task.effect != null) {
      const whereText = text2(task.effect.where);
      if (task.effect.kind !== 'external' || !whereText) return problems.push(problem('bad-effect', where));
      effect = { kind: 'external', where: whereText };
    }
    tasks.push({
      id: task.id,
      title: taskTitle || { pl: `Zadanie ${task.id}`, en: `Task ${task.id}` },
      expectedMinutes: positiveNumber(task.expectedMinutes),
      artifact: { file: safeRelPath(artifact.file), check },
      effect,
    });
  });

  if (problems.length) return { mission: null, problems };
  tasks.sort((a, b) => a.id - b.id);
  return {
    mission: {
      format: MISSION_FORMAT,
      id: typeof raw.id === 'string' && raw.id.trim() ? raw.id.trim() : null,
      title,
      agent: typeof raw.agent === 'string' && raw.agent.trim() ? raw.agent.trim() : null,
      plan: typeof raw.plan === 'string' && raw.plan.trim() ? raw.plan.trim() : null,
      stallMinutes: positiveNumber(raw.stallMinutes) || DEFAULT_STALL_MINUTES,
      demo: typeof raw.demo === 'string' ? raw.demo : null,
      tasks,
    },
    problems: [],
  };
}

export async function readMission(source) {
  const text = await source.readText(MISSION_FILE);
  if (text == null) return { mission: null, problems: [problem('missing')] };
  return parseMission(text);
}
