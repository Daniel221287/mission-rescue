// Limit Guardian (reading): limits files in the workspace's limits/ folder plus manual
// entries from the page. Every number is labelled by where it comes from.
// spec.md > Limit Guardian · prd.md > Limit Guardian

export const LIMITS_DIR = 'limits';
export const AUTO_FRESH_MINUTES = 30;

function toMs(now) {
  return typeof now === 'number' ? now : Date.parse(now);
}

function normalizePlan(raw, source, capturedAtMs, origin) {
  if (!raw || typeof raw !== 'object') return null;
  const plan = typeof raw.plan === 'string' ? raw.plan.trim() : '';
  const window = typeof raw.window === 'string' ? raw.window.trim() : '';
  const used = Number(raw.usedPercent);
  if (!plan || !window || !Number.isFinite(used) || used < 0) return null;
  const resetsAtMs = Date.parse(raw.resetsAt);
  return {
    plan,
    window,
    usedPercent: Math.round(used * 10) / 10,
    resetsAt: Number.isFinite(resetsAtMs) ? new Date(resetsAtMs).toISOString() : null,
    resetsAtMs: Number.isFinite(resetsAtMs) ? resetsAtMs : null,
    source,
    capturedAt: Number.isFinite(capturedAtMs) ? new Date(capturedAtMs).toISOString() : null,
    capturedAtMs: Number.isFinite(capturedAtMs) ? capturedAtMs : null,
    origin,
  };
}

export function labelLimit(entry, nowMs) {
  if (entry.resetsAtMs != null && entry.resetsAtMs <= nowMs) return { label: 'stale', staleReason: 'reset-passed' };
  if (entry.source === 'auto') {
    const age = entry.capturedAtMs == null ? Infinity : nowMs - entry.capturedAtMs;
    return age <= AUTO_FRESH_MINUTES * 60000 && age > -60000
      ? { label: 'auto-verified', staleReason: null }
      : { label: 'stale', staleReason: 'old-capture' };
  }
  if (entry.source === 'demo') return { label: 'demo', staleReason: null };
  return { label: 'manual', staleReason: null };
}

export async function readLimits(workspace, { now = Date.now(), manual = [] } = {}) {
  const nowMs = toMs(now);
  const entries = [];
  const problems = [];
  let files = [];
  try {
    files = (await workspace.list(LIMITS_DIR)).filter((f) => f.kind === 'file' && f.name.endsWith('.json'));
  } catch {
    files = [];
  }
  for (const f of files) {
    const path = `${LIMITS_DIR}/${f.name}`;
    const text = await workspace.readText(path);
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      problems.push({ file: path, code: 'invalid-json' });
      continue;
    }
    const source = data && (data.source === 'auto' || data.source === 'demo') ? data.source : null;
    if (!source) {
      problems.push({ file: path, code: 'unknown-source' });
      continue;
    }
    const capturedAtMs = Date.parse(data.capturedAt);
    for (const raw of Array.isArray(data.plans) ? data.plans : []) {
      const entry = normalizePlan(raw, source, capturedAtMs, path);
      if (entry) entries.push(entry);
      else problems.push({ file: path, code: 'bad-plan' });
    }
  }
  (Array.isArray(manual) ? manual : []).forEach((raw, manualIndex) => {
    const entry = normalizePlan(raw, 'manual', Date.parse(raw && raw.enteredAt), 'manual');
    if (entry) entries.push({ ...entry, manualIndex });
  });
  for (const entry of entries) Object.assign(entry, labelLimit(entry, nowMs));
  entries.sort((a, b) => a.plan.localeCompare(b.plan) || a.window.localeCompare(b.window));
  return { entries, problems };
}

// How much each kind of number is trusted when several describe the same plan and window.
const TRUST = { 'auto-verified': 3, manual: 2, demo: 1 };

// The most constraining current (not out-of-date) limit for a plan. For each window the
// most trusted number wins (verified automatically, then manual, then demo).
export function limitForPlan(plan, entries, nowMs) {
  if (!plan || !Array.isArray(entries)) return null;
  const candidates = entries.filter(
    (e) => e.plan === plan && e.label !== 'stale' && (e.resetsAtMs == null || e.resetsAtMs > nowMs),
  );
  if (!candidates.length) return null;
  const byWindow = new Map();
  for (const e of candidates) {
    const best = byWindow.get(e.window);
    if (!best || (TRUST[e.label] || 0) > (TRUST[best.label] || 0)) byWindow.set(e.window, e);
  }
  return [...byWindow.values()].sort((a, b) => b.usedPercent - a.usedPercent || (a.resetsAtMs ?? Infinity) - (b.resetsAtMs ?? Infinity))[0];
}
