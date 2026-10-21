// Command Center Screen: source switch, missions list, mission view.
// spec.md > Command Center Screen · prd.md > Screens and Layout

import { buildSampleWorkspace } from './demo/samples.mjs';
import { analyzeWorkspace } from './engine/analyze.mjs';
import { createHttpWorkspaceSource, localProgramAvailable } from './sources-browser.mjs';
import {
  t, describeReason, describeFact, describeProblem, stateText, describeCheck, describeCheckFailure,
  fmtTime, fmtRelative, limitLabelText, eventName,
} from './i18n.mjs';

const app = document.getElementById('app');

function load(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw == null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function save(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // storage is a convenience only
  }
}

const state = {
  lang: load('mr.lang', (navigator.language || 'pl').toLowerCase().startsWith('pl') ? 'pl' : 'en'),
  sourceKind: 'samples',
  sources: { samples: null, local: null },
  localAvailable: false,
  result: null,
  busy: false,
  error: null,
};

const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const L = (key, params) => t(state.lang, key, params);
const title2 = (value) => (value ? value[state.lang] || value.pl || value.en : '');

function route() {
  const match = location.hash.match(/^#\/m\/(.+)$/);
  return match ? { mission: decodeURIComponent(match[1]) } : { mission: null };
}

function currentSource() {
  return state.sources[state.sourceKind];
}

async function refresh() {
  state.busy = true;
  render();
  try {
    const source = currentSource();
    if (source && source.refresh) await source.refresh();
    state.result = await analyzeWorkspace(source, { now: Date.now() });
    state.error = null;
  } catch (error) {
    state.error = error && error.message ? error.message : String(error);
  }
  state.busy = false;
  render();
}

// ---- rendering ---------------------------------------------------------------------

function chip(color, text, extra = '') {
  return `<span class="chip chip--${esc(color)} ${extra}">${esc(text)}</span>`;
}

function bar(proven, total, color) {
  const pct = total ? Math.round((proven / total) * 100) : 0;
  return `<div class="bar bar--${esc(color)}" role="img" aria-label="${esc(L('mission.proven', { proven, total }))}"><span data-w="${pct}"></span></div>`;
}

function renderHeader() {
  const now = Date.now();
  const sources = [
    ['samples', L('src.samples'), true],
    ['local', L('src.local'), state.localAvailable],
  ];
  const note = state.sourceKind === 'local' ? L('src.local.note') : L('src.samples.note');
  return `
  <header class="top">
    <div class="top__brand">
      <a class="brand" href="#/">Mission Rescue</a>
      <span class="brand__sub">${esc(L('app.subtitle'))}</span>
    </div>
    <div class="top__actions">
      <button class="btn btn--ghost" data-action="lang" aria-label="${esc(L('lang.switch'))}">${esc(L('lang.switch'))}</button>
    </div>
  </header>
  <section class="sources" aria-label="${esc(L('src.label'))}">
    <div class="seg" role="radiogroup" aria-label="${esc(L('src.label'))}">
      ${sources.map(([kind, label, enabled]) => `<button class="seg__btn" role="radio" aria-checked="${state.sourceKind === kind}" data-action="source" data-kind="${kind}" ${enabled ? '' : 'disabled'}>${esc(label)}</button>`).join('')}
    </div>
    <p class="sources__note">${esc(note)}${!state.localAvailable ? ` <span class="muted">${esc(L('src.local.unavailable'))}</span>` : ''}</p>
    ${state.result ? `<p class="sources__checked muted">${esc(L('mission.checked', { at: fmtTime(state.result.checkedAt, state.lang, now) }))}</p>` : ''}
  </section>`;
}

function verdictBlock(report, { compact = false } = {}) {
  const v = report.verdict;
  const now = Date.now();
  const confidence = `${L('conf.label')}: ${L(`conf.${v.confidence}`)}`;
  if (compact) {
    return `${chip(v.color, L(`verdict.${v.code}`))} <span class="muted small">${esc(confidence)}</span>`;
  }
  return `
  <div class="verdict verdict--${esc(v.color)}">
    <div class="verdict__head">
      <div class="beacon beacon--${esc(v.color)}" aria-hidden="true"><span></span></div>
      <div>
        <h2 class="verdict__title">${esc(L(`verdict.${v.code}`))}</h2>
        <p class="verdict__conf">${esc(confidence)}</p>
      </div>
    </div>
    <div class="verdict__grid">
      <div><h3>${esc(L('section.what'))}</h3><p>${esc(describeReason(state.lang, v, now))}</p></div>
      <div><h3>${esc(L('section.todo'))}</h3><p>${esc(L(`todo.${v.code}`))}</p></div>
    </div>
    ${v.facts.length ? `<details class="facts" open><summary>${esc(L('section.facts'))}</summary><ul>${v.facts.map((f) => `<li>${esc(describeFact(state.lang, f, now))}</li>`).join('')}</ul></details>` : ''}
  </div>`;
}

function renderList() {
  const result = state.result;
  if (!result) return '';
  if (!result.missions.length) return `<section class="panel"><p>${esc(L('list.empty'))}</p></section>`;
  return `
  <section class="missions" aria-label="${esc(L('list.title'))}">
    <h2 class="section-title">${esc(L('list.title'))}</h2>
    <ul class="cards">
      ${result.missions.map((m) => `
      <li class="card card--${esc(m.verdict.color)}">
        <a class="card__link" href="#/m/${encodeURIComponent(m.dir)}">
          <span class="card__title">${esc(m.ok ? title2(m.title) : m.dir)}</span>
          ${m.demo ? `<span class="badge">${esc(L('mission.demo-badge'))}</span>` : ''}
          <span class="card__verdict">${verdictBlock(m, { compact: true })}</span>
          ${m.ok ? `${bar(m.counts.proven, m.counts.total, m.verdict.color)}<span class="card__count">${esc(L('mission.proven', m.counts))}</span>` : `<span class="muted">${esc(describeProblem(state.lang, m.problems[0] || { code: 'missing', file: 'mission.json' }))}</span>`}
        </a>
      </li>`).join('')}
    </ul>
  </section>
  ${renderLimits()}`;
}

function levelPill(label, value) {
  const cls = value === true || value === 'yes' || value === 'confirmed' ? 'yes' : value === 'not-applicable' ? 'na' : value === 'partial' ? 'partial' : 'no';
  const mark = { yes: '✓', no: '✕', na: '–', partial: '~' }[cls];
  const extra = cls === 'na' ? ` (${L('level.na')})` : cls === 'partial' ? ` (${L('level.partial')})` : '';
  return `<span class="lvl lvl--${cls}"><span class="lvl__mark" aria-hidden="true">${mark}</span>${esc(label)}${esc(extra)}</span>`;
}

function renderTask(task) {
  const now = Date.now();
  const a = task.artifact;
  const failure = a.checkResult && !a.checkResult.ok ? describeCheckFailure(state.lang, a.checkResult) : '';
  return `
  <li class="task task--${esc(task.color)}">
    <details>
      <summary>
        <span class="task__num">${task.id}</span>
        <span class="task__main">
          <span class="task__title">${esc(title2(task.title))}</span>
          <span class="levels">
            ${levelPill(L('level.declared'), task.levels.declared)}
            ${levelPill(L('level.exists'), task.levels.exists)}
            ${levelPill(L('level.verified'), task.levels.verified)}
            ${levelPill(L('level.effect'), task.levels.effect)}
          </span>
        </span>
        ${chip(task.color, stateText(state.lang, task.state), 'task__state')}
      </summary>
      <dl class="detail">
        <dt>${esc(L('detail.file'))}</dt><dd><code>${esc(a.file)}</code></dd>
        <dt>${esc(L('detail.condition'))}</dt><dd>${esc(describeCheck(state.lang, a.check))}${failure ? ` · <strong>${esc(failure)}</strong>` : ''}</dd>
        <dt>${esc(L('detail.declared-sha'))}</dt><dd><code class="sha">${esc(a.declaredSha || L('detail.none'))}</code></dd>
        <dt>${esc(L('detail.actual-sha'))}</dt><dd><code class="sha">${esc(a.actualSha || L('detail.none'))}</code></dd>
        ${task.startedAt ? `<dt>${esc(eventName(state.lang, 'started'))}</dt><dd>${esc(fmtTime(task.startedAt, state.lang, now))}</dd>` : ''}
        ${task.doneAt ? `<dt>${esc(eventName(state.lang, 'done'))}</dt><dd>${esc(fmtTime(task.doneAt, state.lang, now))}</dd>` : ''}
        ${task.errorMessage ? `<dt>${esc(eventName(state.lang, 'error'))}</dt><dd>${esc(task.errorMessage)}</dd>` : ''}
      </dl>
    </details>
  </li>`;
}

function renderLog(report) {
  const now = Date.now();
  if (!report.recentEvents.length) return `<p class="muted">${esc(L('log.empty'))}</p>`;
  return `<ol class="log">${report.recentEvents.map((e) => `<li><span class="log__time">${esc(fmtTime(e.at, state.lang, now))}</span> <span class="log__event">${esc(eventName(state.lang, e.event))}</span>${e.task != null ? ` <span class="log__task">#${e.task}</span>` : ''}${e.message ? ` <span class="log__msg">${esc(e.message)}</span>` : ''}${e.question ? ` <span class="log__msg">${esc(e.question)}</span>` : ''}${e.artifact && e.artifact.file ? ` <code>${esc(e.artifact.file)}</code>` : ''}</li>`).join('')}</ol>`;
}

function renderMission(dir) {
  const report = state.result && state.result.missions.find((m) => m.dir === dir);
  if (!report) {
    return `<section class="panel"><a class="back" href="#/">${esc(L('nav.back'))}</a><p>${esc(L('list.empty'))}</p></section>`;
  }
  return `
  <section class="mission">
    <a class="back" href="#/">${esc(L('nav.back'))}</a>
    <div class="mission__head">
      <h1 class="mission__title">${esc(report.ok ? title2(report.title) : report.dir)}</h1>
      ${report.demo ? `<span class="badge">${esc(L('mission.demo-badge'))}</span>` : ''}
      ${report.ok ? `<p class="mission__meta">${report.agent ? esc(L('mission.agent', { agent: report.agent })) : ''}${report.plan ? ` · ${esc(L('mission.plan', { plan: report.plan }))}` : ''}</p>` : ''}
    </div>
    ${verdictBlock(report)}
    <div class="actions">
      <button class="btn btn--primary" data-action="recheck" ${state.busy ? 'disabled' : ''}>${esc(L('btn.recheck'))}</button>
    </div>
    ${report.ok ? `
    <section class="panel">
      <h2 class="section-title">${esc(L('section.tasks'))} <span class="muted small">${esc(L('mission.proven', report.counts))}</span></h2>
      ${bar(report.counts.proven, report.counts.total, report.verdict.color)}
      <ol class="tasks">${report.tasks.map(renderTask).join('')}</ol>
    </section>
    <section class="panel">
      <h2 class="section-title">${esc(L('section.log'))}</h2>
      ${renderLog(report)}
    </section>` : ''}
    ${report.problems.length ? `
    <section class="panel panel--warn">
      <h2 class="section-title">${esc(L('section.problems'))}</h2>
      <ul>${report.problems.map((p) => `<li>${esc(describeProblem(state.lang, p))}</li>`).join('')}</ul>
    </section>` : ''}
  </section>
  ${renderLimits()}`;
}

function renderLimits() {
  const limits = state.result && state.result.limits;
  if (!limits) return '';
  const now = Date.now();
  const rows = limits.entries.map((e) => `
    <li class="limit limit--${esc(e.label)}">
      <div class="limit__head"><strong>${esc(e.plan)}</strong> <span class="muted">${esc(e.window)}</span> ${chip(e.label === 'stale' ? 'grey' : e.label === 'auto-verified' ? 'green' : e.label === 'demo' ? 'teal' : 'amber', limitLabelText(state.lang, e, now), 'limit__label')}</div>
      <div class="bar bar--${e.usedPercent >= 95 ? 'red' : e.usedPercent >= 75 ? 'amber' : 'green'}"><span data-w="${Math.min(100, e.usedPercent)}"></span></div>
      <div class="limit__meta"><span>${esc(String(e.usedPercent))}%</span>${e.resetsAt ? ` · <span>${esc(L('limit.resets', { at: `${fmtTime(e.resetsAt, state.lang, now)} (${fmtRelative(e.resetsAt, state.lang, now)})` }))}</span>` : ''}</div>
    </li>`).join('');
  return `
  <section class="panel limits" aria-label="${esc(L('section.limits'))}">
    <h2 class="section-title">${esc(L('section.limits'))}</h2>
    ${rows ? `<ul class="limits__list">${rows}</ul>` : `<p class="muted">${esc(L('limit.empty'))}</p>`}
    <p class="muted small">${esc(L('limit.note'))}</p>
  </section>`;
}

function render() {
  document.documentElement.lang = state.lang;
  const r = route();
  const body = state.error
    ? `<section class="panel panel--warn"><p>${esc(state.error)}</p></section>`
    : !state.result
      ? `<p class="boot">${esc(L('btn.recheck'))}…</p>`
      : r.mission
        ? renderMission(r.mission)
        : renderList();
  app.innerHTML = `${renderHeader()}<main class="main" ${state.busy ? 'aria-busy="true"' : ''}>${body}</main>
  <footer class="foot"><p>${esc(L('footer.privacy'))}</p><p class="muted">${esc(L('app.tagline'))}</p></footer>`;
  for (const span of app.querySelectorAll('.bar > span[data-w]')) span.style.width = `${span.dataset.w}%`;
}

// ---- events -----------------------------------------------------------------------

app.addEventListener('click', async (event) => {
  const target = event.target.closest('[data-action]');
  if (!target || target.disabled) return;
  const action = target.dataset.action;
  if (action === 'lang') {
    state.lang = state.lang === 'pl' ? 'en' : 'pl';
    save('mr.lang', state.lang);
    render();
  } else if (action === 'source') {
    const kind = target.dataset.kind;
    if (kind === state.sourceKind) return;
    state.sourceKind = kind;
    if (kind === 'local' && !state.sources.local) state.sources.local = createHttpWorkspaceSource();
    location.hash = '#/';
    await refresh();
  } else if (action === 'recheck') {
    await refresh();
  }
});

window.addEventListener('hashchange', () => {
  render();
  window.scrollTo({ top: 0 });
});

async function boot() {
  state.sources.samples = await buildSampleWorkspace({ now: Date.now() });
  state.localAvailable = await localProgramAvailable();
  if (state.localAvailable) {
    state.sources.local = createHttpWorkspaceSource();
    state.sourceKind = 'local';
  }
  await refresh();
}

boot();
