// Command Center Screen: source switch, missions list, mission view.
// spec.md > Command Center Screen · prd.md > Screens and Layout

import { buildSampleWorkspace } from './demo/samples.mjs';
import { runSampleAgent, tamperSample } from './demo/sample-agent.mjs';
import { analyzeWorkspace } from './engine/analyze.mjs';
import { subSource } from './engine/paths.mjs';
import {
  createHttpWorkspaceSource, localProgramAvailable, folderPickerSupport, createHandleSource, createFileListSource,
} from './sources-browser.mjs';
import {
  t, describeReason, describeFact, describeProblem, stateText, describeCheck, describeCheckFailure,
  fmtTime, fmtRelative, limitLabelText, eventName, textIn,
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
  sources: { samples: null, local: null, folder: null },
  localAvailable: false,
  folderSupport: 'none',
  manualLimits: load('mr.manualLimits', []),
  confirmations: load('mr.confirmations', []),
  limitFormOpen: false,
  limitFormError: null,
  result: null,
  busy: false,
  error: null,
  agentRunning: false,
  agentSteps: [],
  notice: null,
  copyState: null,
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
    state.result = await analyzeWorkspace(source, {
      now: Date.now(),
      manualLimits: state.manualLimits,
      confirmations: state.confirmations,
    });
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
    ['folder', L('src.folder'), state.folderSupport !== 'none'],
  ];
  const folder = state.sources.folder;
  let note = state.sourceKind === 'local' ? L('src.local.note') : L('src.samples.note');
  let extra = !state.localAvailable ? ` <span class="muted">${esc(L('src.local.unavailable'))}</span>` : '';
  if (state.sourceKind === 'folder') {
    note = folder ? L('src.folder.picked', { name: folder.label }) : L('src.folder.none');
    extra = `${folder && folder.snapshot ? ` <span class="muted">${esc(L('src.folder.snapshot'))}</span>` : ''} <button class="btn btn--ghost btn--small" data-action="pick-folder">${esc(folder ? L('btn.pick-again') : L('btn.pick-folder'))}</button>`;
  }
  if (state.folderSupport === 'none' && state.sourceKind !== 'folder') extra += ` <span class="muted small">${esc(L('src.folder.unsupported'))}</span>`;
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
    <p class="sources__note">${esc(note)}${extra}</p>
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
        ${task.errorMessage ? `<dt>${esc(eventName(state.lang, 'error'))}</dt><dd>${esc(textIn(state.lang, task.errorMessage))}</dd>` : ''}
        ${task.effect ? `<dt>${esc(L('detail.where'))}</dt><dd>${esc(textIn(state.lang, task.effect.where))}</dd>` : ''}
        ${task.effect && task.effect.confirmation ? `<dt>${esc(L('level.effect'))}</dt><dd>${esc(L('detail.confirmed-by-human', { at: fmtTime(task.effect.confirmation.at, state.lang, now) }))} <button class="btn btn--ghost btn--small" data-action="unconfirm-effect" data-task="${task.id}">${esc(L('btn.unconfirm-effect'))}</button></dd>` : ''}
      </dl>
      ${task.state === 'effect-unconfirmed' ? confirmBox(task) : ''}
    </details>
  </li>`;
}

// A person confirms an outside effect for exactly this version of the result file.
function confirmBox(task) {
  if (!task || !task.effect || !task.artifact.actualSha) return '';
  return `
      <div class="confirm">
        <p>${esc(L('confirm.where', { where: textIn(state.lang, task.effect.where) }))}</p>
        <button class="btn btn--primary" data-action="confirm-effect" data-task="${task.id}">${esc(L('btn.confirm-effect'))}</button>
        <p class="muted small">${esc(L('confirm.note', { sha: task.artifact.actualSha.slice(0, 12) }))}</p>
      </div>`;
}

function renderLog(report) {
  const now = Date.now();
  if (!report.recentEvents.length) return `<p class="muted">${esc(L('log.empty'))}</p>`;
  return `<ol class="log">${report.recentEvents.map((e) => `<li><span class="log__time">${esc(fmtTime(e.at, state.lang, now))}</span> <span class="log__event">${esc(eventName(state.lang, e.event))}</span>${e.task != null ? ` <span class="log__task">#${e.task}</span>` : ''}${e.message ? ` <span class="log__msg">${esc(textIn(state.lang, e.message))}</span>` : ''}${e.question ? ` <span class="log__msg">${esc(textIn(state.lang, e.question))}</span>` : ''}${e.artifact && e.artifact.file ? ` <code>${esc(e.artifact.file)}</code>` : ''}</li>`).join('')}</ol>`;
}

const ACTION_COLOR = { 'check-first': 'amber', redo: 'red', do: 'grey', confirm: 'teal' };

function renderRescue(report) {
  const plan = report.rescue;
  if (!plan) return '';
  if (!plan.needed) {
    return `<section class="panel rescue"><h2 class="section-title">${esc(L('section.rescue'))}</h2><p class="muted">${esc(L('rescue.not-needed'))}</p></section>`;
  }
  const copyLabel = state.copyState === 'ok' ? L('btn.copied') : state.copyState === 'failed' ? L('btn.copy-failed') : L('btn.copy');
  const confirmOnly = plan.steps.every((s) => s.action === 'confirm');
  const taskById = (id) => report.tasks.find((t) => t.id === id);
  return `
  <section class="panel rescue" aria-label="${esc(L('section.rescue'))}">
    <h2 class="section-title">${esc(L('section.rescue'))}</h2>
    <div class="rescue__summary">
      <div class="kv"><span class="kv__k">${esc(L('rescue.checkpoint'))}</span><span class="kv__v">${esc(plan.checkpoint ? L('rescue.checkpoint.task', { task: plan.checkpoint }) : L('rescue.checkpoint.none'))}</span></div>
      <div class="kv"><span class="kv__k">${esc(L('rescue.remaining'))}</span><span class="kv__v">${esc(plan.remaining.join(', '))}</span></div>
    </div>
    <h3 class="sub-title">${esc(L('rescue.steps'))}</h3>
    <ol class="steps">
      ${plan.steps.map((s) => `
      <li class="step">
        ${chip(ACTION_COLOR[s.action] || 'grey', L(`rescue.action.${s.action}`))}
        <span class="step__title">${s.task}. ${esc(title2(s.title))}</span>
        <span class="step__check muted small">${esc(L('rescue.check', { file: s.file, condition: describeCheck(state.lang, s.check) }))}</span>
        ${s.action === 'confirm' ? confirmBox(taskById(s.task)) : ''}
      </li>`).join('')}
    </ol>
    ${confirmOnly ? `<p class="muted">${esc(L('rescue.confirm-only'))}</p>` : `
    <h3 class="sub-title">${esc(L('rescue.instruction'))}</h3>
    <pre class="instruction" id="rescue-text" tabindex="0">${esc(plan.instruction[state.lang])}</pre>
    <div class="actions">
      <button class="btn" data-action="copy">${esc(copyLabel)}</button>
      <span class="muted small">${esc(L('rescue.handover'))}</span>
    </div>`}
  </section>`;
}

function renderDemo(report) {
  if (report.demo !== 'weekly-report') return '';
  if (state.sourceKind === 'samples') {
    return `
  <section class="panel demo" aria-label="${esc(L('section.demo'))}">
    <h2 class="section-title">${esc(L('section.demo'))}</h2>
    <div class="demo__row">
      <button class="btn btn--primary" data-action="run-agent" ${state.agentRunning ? 'disabled' : ''}>${esc(state.agentRunning ? L('btn.running-agent') : L('btn.run-agent'))}</button>
      <p class="muted small">${esc(L('demo.agent.note'))}</p>
    </div>
    ${state.agentSteps.length ? `<ol class="agent-log" aria-live="polite">${state.agentSteps.map((s) => `<li>${esc(t(state.lang, s.key, s))}</li>`).join('')}</ol>` : ''}
    <div class="demo__row">
      <button class="btn" data-action="honesty" ${state.agentRunning ? 'disabled' : ''}>${esc(L('btn.honesty'))}</button>
      <p class="muted small">${esc(L('demo.honesty.note'))}</p>
    </div>
    <div class="demo__row">
      <button class="btn btn--ghost" data-action="reset-samples" ${state.agentRunning ? 'disabled' : ''}>${esc(L('btn.reset-samples'))}</button>
      <p class="muted small">${esc(L('demo.reset.note'))}</p>
    </div>
  </section>`;
  }
  if (state.sourceKind === 'local') {
    const folder = `missions/${report.dir}`;
    return `
  <section class="panel demo" aria-label="${esc(L('section.demo'))}">
    <h2 class="section-title">${esc(L('section.demo'))}</h2>
    <p>${esc(L('demo.local.note'))}</p>
    <pre class="cmd">node tools/mission-rescue.mjs demo-agent ${esc(folder)} --delay 1500</pre>
    <p>${esc(L('demo.local.honesty'))}</p>
    <pre class="cmd">node tools/mission-rescue.mjs honesty-test ${esc(folder)}</pre>
    <p>${esc(L('demo.local.reset'))}</p>
    <pre class="cmd">node tools/mission-rescue.mjs demo-reset</pre>
  </section>`;
  }
  return '';
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
      <button class="btn btn--primary" data-action="recheck" ${state.busy || state.agentRunning ? 'disabled' : ''}>${esc(L('btn.recheck'))}</button>
    </div>
    ${state.notice ? `<p class="notice" role="status">${esc(state.notice)}</p>` : ''}
    ${report.ok ? renderRescue(report) : ''}
    ${renderDemo(report)}
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
      <div class="limit__meta"><span>${esc(String(e.usedPercent))}%</span>${e.resetsAt ? ` · <span>${esc(L('limit.resets', { at: `${fmtTime(e.resetsAt, state.lang, now)} (${fmtRelative(e.resetsAt, state.lang, now)})` }))}</span>` : ''}${e.capturedAt && e.source !== 'manual' && e.staleReason !== 'old-capture' ? ` · <span class="muted">${esc(L('limit.captured', { at: fmtRelative(e.capturedAt, state.lang, now) }))}</span>` : ''}${e.source === 'manual' ? ` <button class="btn btn--ghost btn--small" data-action="remove-limit" data-index="${e.manualIndex}" aria-label="${esc(L('limit.manual.remove', { plan: e.plan, window: e.window }))}">${esc(L('btn.remove'))}</button>` : ''}</div>
    </li>`).join('');
  return `
  <section class="panel limits" aria-label="${esc(L('section.limits'))}">
    <h2 class="section-title">${esc(L('section.limits'))}</h2>
    ${rows ? `<ul class="limits__list">${rows}</ul>` : `<p class="muted">${esc(L('limit.empty'))}</p>`}
    ${state.limitFormOpen ? limitForm() : `<div class="actions"><button class="btn" data-action="limit-form">${esc(L('btn.add-limit'))}</button></div>`}
    <p class="muted small">${esc(L('limit.note'))}</p>
  </section>`;
}

const KNOWN_PLANS = ['Claude Pro', 'Claude Max', 'ChatGPT Plus', 'ChatGPT Pro', 'Google AI Pro'];
const WINDOWS = ['5h', '24h', '7d', '30d'];

function limitForm() {
  const plans = new Set(KNOWN_PLANS);
  for (const m of (state.result && state.result.missions) || []) if (m.plan) plans.add(m.plan);
  return `
    <form class="limit-form" data-form="limit" novalidate>
      <h3 class="sub-title">${esc(L('limit.form.title'))}</h3>
      <p class="muted small">${esc(L('limit.form.hint'))}</p>
      <div class="limit-form__grid">
        <label>${esc(L('limit.form.plan'))}<input name="plan" list="plan-names" maxlength="40" autocomplete="off" required></label>
        <label>${esc(L('limit.form.window'))}<select name="window">${WINDOWS.map((w) => `<option value="${w}">${w}</option>`).join('')}</select></label>
        <label>${esc(L('limit.form.used'))}<input name="used" type="number" min="0" max="100" step="1" inputmode="numeric" required></label>
        <label>${esc(L('limit.form.reset'))}<input name="reset" type="datetime-local"></label>
      </div>
      <datalist id="plan-names">${[...plans].map((p) => `<option value="${esc(p)}"></option>`).join('')}</datalist>
      ${state.limitFormError ? `<p class="form-error" role="alert">${esc(state.limitFormError)}</p>` : ''}
      <div class="actions">
        <button class="btn btn--primary" type="submit">${esc(L('btn.save'))}</button>
        <button class="btn btn--ghost" type="button" data-action="limit-form-cancel">${esc(L('btn.cancel'))}</button>
      </div>
    </form>`;
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
  } else if (action === 'pick-folder') {
    pickFolder();
  } else if (action === 'source') {
    const kind = target.dataset.kind;
    if (kind === 'folder' && !state.sources.folder) {
      pickFolder(); // must start inside the click: browsers only open pickers for a user action
      return;
    }
    if (kind === state.sourceKind) return;
    state.sourceKind = kind;
    if (kind === 'local' && !state.sources.local) state.sources.local = createHttpWorkspaceSource();
    location.hash = '#/';
    await refresh();
  } else if (action === 'recheck') {
    state.notice = null;
    state.copyState = null;
    await refresh();
  } else if (action === 'copy') {
    const pre = document.getElementById('rescue-text');
    const text = pre ? pre.textContent : '';
    try {
      await navigator.clipboard.writeText(text);
      state.copyState = 'ok';
      render();
    } catch {
      state.copyState = 'failed';
      render();
      const again = document.getElementById('rescue-text');
      if (again) {
        const range = document.createRange();
        range.selectNodeContents(again);
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
      }
    }
  } else if (action === 'run-agent') {
    const dir = route().mission;
    state.agentRunning = true;
    state.agentSteps = [];
    state.notice = null;
    render();
    try {
      await runSampleAgent(subSource(state.sources.samples, dir), {
        delayMs: 600,
        limits: state.result ? state.result.limits.entries : [],
        onStep: (step) => {
          state.agentSteps.push(step);
          render();
        },
      });
    } catch (error) {
      state.notice = error && error.message ? error.message : String(error);
    }
    state.agentRunning = false;
    render();
  } else if (action === 'honesty') {
    const dir = route().mission;
    await tamperSample(subSource(state.sources.samples, dir));
    state.notice = L('demo.honesty.done');
    render();
  } else if (action === 'confirm-effect' || action === 'unconfirm-effect') {
    const report = currentReport();
    const task = report && report.tasks.find((x) => x.id === Number(target.dataset.task));
    if (!report || !task) return;
    const others = state.confirmations.filter((c) => !(c.mission === report.key && c.task === task.id));
    state.confirmations = action === 'confirm-effect' && task.artifact.actualSha
      ? [...others, { mission: report.key, task: task.id, sha256: task.artifact.actualSha, at: new Date().toISOString() }].slice(-200)
      : others;
    save('mr.confirmations', state.confirmations);
    await refresh();
  } else if (action === 'limit-form') {
    state.limitFormOpen = true;
    state.limitFormError = null;
    render();
    const first = app.querySelector('.limit-form input[name="plan"]');
    if (first) first.focus();
  } else if (action === 'limit-form-cancel') {
    state.limitFormOpen = false;
    state.limitFormError = null;
    render();
  } else if (action === 'remove-limit') {
    const index = Number(target.dataset.index);
    state.manualLimits = state.manualLimits.filter((_, i) => i !== index);
    save('mr.manualLimits', state.manualLimits);
    await refresh();
  } else if (action === 'reset-samples') {
    state.sources.samples = await buildSampleWorkspace({ now: Date.now() });
    state.agentSteps = [];
    state.notice = null;
    state.copyState = null;
    await refresh();
  }
});

app.addEventListener('submit', async (event) => {
  const form = event.target;
  if (!form || form.dataset.form !== 'limit') return;
  event.preventDefault();
  const data = new FormData(form);
  const plan = String(data.get('plan') || '').trim();
  const used = Number(data.get('used'));
  const resetText = String(data.get('reset') || '');
  const resetMs = resetText ? new Date(resetText).getTime() : NaN;
  if (!plan || data.get('used') === '' || !Number.isFinite(used) || used < 0 || used > 100) {
    state.limitFormError = L('limit.form.error');
    render();
    return;
  }
  state.manualLimits = [...state.manualLimits, {
    plan,
    window: String(data.get('window') || '5h'),
    usedPercent: used,
    resetsAt: Number.isFinite(resetMs) ? new Date(resetMs).toISOString() : null,
    enteredAt: new Date().toISOString(),
  }].slice(-50);
  save('mr.manualLimits', state.manualLimits);
  state.limitFormOpen = false;
  state.limitFormError = null;
  await refresh();
});

function currentReport() {
  const dir = route().mission;
  return (state.result && state.result.missions.find((m) => m.dir === dir)) || null;
}

// Picking a folder: the File System Access API where it exists (re-read on every check),
// otherwise the folder input (a snapshot). Read-only either way; nothing leaves the browser.
async function useFolder(source) {
  state.sources.folder = source;
  state.sourceKind = 'folder';
  state.notice = null;
  if (location.hash !== '#/') location.hash = '#/';
  await refresh();
}

function openFolderInput() {
  const input = document.getElementById('folder-input');
  if (!input) return;
  input.value = '';
  input.click();
}

async function pickFolder() {
  if (state.folderSupport === 'handle') {
    try {
      const handle = await window.showDirectoryPicker({ id: 'mission-rescue', mode: 'read' });
      await useFolder(createHandleSource(handle));
    } catch (error) {
      if (error && error.name === 'AbortError') return;
      openFolderInput();
    }
  } else if (state.folderSupport === 'input') {
    openFolderInput();
  }
}

const folderInput = document.getElementById('folder-input');
if (folderInput) {
  folderInput.addEventListener('change', () => {
    if (folderInput.files && folderInput.files.length) useFolder(createFileListSource(folderInput.files));
  });
}

window.addEventListener('hashchange', () => {
  render();
  window.scrollTo({ top: 0 });
});

async function boot() {
  state.folderSupport = folderPickerSupport();
  state.sources.samples = await buildSampleWorkspace({ now: Date.now() });
  state.localAvailable = await localProgramAvailable();
  if (state.localAvailable) {
    state.sources.local = createHttpWorkspaceSource();
    state.sourceKind = 'local';
  }
  await refresh();
}

boot();
