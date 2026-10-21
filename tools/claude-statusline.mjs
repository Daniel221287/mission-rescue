#!/usr/bin/env node
// Limit Guardian (capture): a Claude Code status line command. Claude Code runs it and
// passes its session data as JSON on stdin; that data includes the plan's usage limits
// (rate_limits.five_hour / seven_day: used_percentage and resets_at). This script writes
// them to <workspace>/limits/limits.auto.json, which Mission Rescue labels
// "ZWERYFIKOWANE AUTOMATYCZNIE" while it is fresh, and prints a short status line.
// It reads only what Claude Code gives it: no logins, no requests to any service.
//
// ~/.claude/settings.json:
//   { "statusLine": { "type": "command",
//       "command": "node /path/to/mission-rescue/tools/claude-statusline.mjs --plan \"Claude Max\"" } }
// Options: --plan <name as in mission.json> (default "Claude"), --workspace <missions folder>
// (default <repo>/missions), --silent (write the file, print nothing), --lang en.
// spec.md > Limit Guardian

import path from 'node:path';
import { promises as fs } from 'node:fs';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const DEFAULT_WORKSPACE = path.join(ROOT, 'missions');
const WINDOWS = [
  ['five_hour', '5h'],
  ['seven_day', '7d'],
];

function toIso(value) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return new Date(value < 1e12 ? value * 1000 : value).toISOString();
  }
  if (typeof value === 'string' && value.trim()) {
    if (/^\d+(\.\d+)?$/.test(value.trim())) return toIso(Number(value));
    const ms = Date.parse(value);
    return Number.isFinite(ms) ? new Date(ms).toISOString() : null;
  }
  return null;
}

// Claude Code status line input -> the limits file content, or null when it has no limits.
export function limitsFromStatus(input, { plan = 'Claude', now = Date.now() } = {}) {
  const limits = input && typeof input === 'object' ? input.rate_limits : null;
  if (!limits || typeof limits !== 'object') return null;
  const plans = [];
  for (const [key, window] of WINDOWS) {
    const entry = limits[key];
    if (!entry || typeof entry !== 'object') continue;
    const used = Number(entry.used_percentage);
    if (!Number.isFinite(used) || used < 0) continue;
    plans.push({ plan, window, usedPercent: Math.round(used * 10) / 10, resetsAt: toIso(entry.resets_at) });
  }
  if (!plans.length) return null;
  return {
    source: 'auto',
    tool: 'claude-statusline',
    capturedAt: new Date(now).toISOString(),
    plans,
  };
}

export async function writeAutoLimits(workspaceDir, data) {
  const dir = path.join(path.resolve(workspaceDir), 'limits');
  await fs.mkdir(dir, { recursive: true });
  const target = path.join(dir, 'limits.auto.json');
  const temp = `${target}.${process.pid}.tmp`;
  await fs.writeFile(temp, `${JSON.stringify(data, null, 2)}\n`);
  await fs.rename(temp, target);
  return target;
}

export function statusText(input, data, { lang = 'pl' } = {}) {
  const model = input && input.model && typeof input.model.display_name === 'string' ? input.model.display_name : null;
  const parts = [];
  if (model) parts.push(model);
  if (data) {
    for (const p of data.plans) {
      const reset = p.resetsAt
        ? new Date(p.resetsAt).toLocaleTimeString(lang === 'en' ? 'en-GB' : 'pl-PL', { hour: '2-digit', minute: '2-digit' })
        : null;
      parts.push(`${p.window} ${p.usedPercent}%${reset && p.window === '5h' ? ` (${lang === 'en' ? 'reset' : 'odnowienie'} ${reset})` : ''}`);
    }
  } else {
    parts.push(lang === 'en' ? 'limits: no data yet' : 'limity: jeszcze brak danych');
  }
  return `Mission Rescue · ${parts.join(' · ')}`;
}

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--plan') args.plan = argv[(i += 1)];
    else if (a === '--workspace') args.workspace = argv[(i += 1)];
    else if (a === '--lang') args.lang = argv[(i += 1)];
    else if (a === '--silent') args.silent = true;
  }
  return args;
}

function readStdin(timeoutMs = 3000) {
  return new Promise((resolve) => {
    if (process.stdin.isTTY) {
      resolve('');
      return;
    }
    let text = '';
    const timer = setTimeout(() => resolve(text), timeoutMs);
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => {
      text += chunk;
    });
    process.stdin.on('end', () => {
      clearTimeout(timer);
      resolve(text);
    });
    process.stdin.on('error', () => {
      clearTimeout(timer);
      resolve(text);
    });
  });
}

async function main(argv) {
  const args = parseArgs(argv);
  const lang = args.lang === 'en' ? 'en' : 'pl';
  let input = null;
  try {
    input = JSON.parse(await readStdin());
  } catch {
    input = null;
  }
  const data = limitsFromStatus(input, {
    plan: args.plan || process.env.MISSION_RESCUE_PLAN || 'Claude',
  });
  if (data) {
    try {
      await writeAutoLimits(args.workspace || process.env.MISSION_RESCUE_WORKSPACE || DEFAULT_WORKSPACE, data);
    } catch {
      // The status line must never break Claude Code; a missed capture just ages out.
    }
  }
  if (!args.silent) process.stdout.write(`${statusText(input, data, { lang })}\n`);
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  main(process.argv.slice(2)).catch(() => {
    process.stdout.write('Mission Rescue\n');
  });
}
