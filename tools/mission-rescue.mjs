#!/usr/bin/env node
// Command-line tool: check a mission folder, rebuild the sample missions on disk.
//   node tools/mission-rescue.mjs check <mission folder> [--lang en] [--json]
//   node tools/mission-rescue.mjs demo-reset [--workspace <folder>]
// Exit codes for "check": 0 complete, 1 not complete, 2 unreadable or bad input.
// spec.md > Command-Line Tool

import path from 'node:path';
import { promises as fs } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createFsSource } from './fs-source.mjs';
import { analyzeMission } from '../app/engine/analyze.mjs';
import { readLimits } from '../app/engine/limits.mjs';
import { buildSampleMissions, demoLimitsFile } from '../app/demo/samples.mjs';
import {
  t, describeReason, describeFact, describeProblem, stateText, describeCheck, describeCheckFailure,
} from '../app/i18n.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const DEFAULT_WORKSPACE = path.join(ROOT, 'missions');

function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--json') args.json = true;
    else if (a === '--lang') args.lang = argv[(i += 1)];
    else if (a === '--workspace') args.workspace = argv[(i += 1)];
    else if (a === '--delay') args.delay = Number(argv[(i += 1)]);
    else if (a.startsWith('--')) args[a.slice(2)] = true;
    else args._.push(a);
  }
  return args;
}

const MARK = { green: '[OK]', amber: '[~~]', red: '[!!]', grey: '[  ]', teal: '[??]' };

export function formatReport(report, lang = 'pl', nowMs = Date.now()) {
  const out = [];
  const title = report.title ? report.title[lang] || report.title.pl : report.dir;
  out.push(`MISSION RESCUE · ${title}`);
  out.push(`${t(lang, `verdict.${report.verdict.code}`).toUpperCase()} · ${t(lang, 'conf.label').toLowerCase()}: ${t(lang, `conf.${report.verdict.confidence}`)}`);
  out.push(`${t(lang, 'section.what')}: ${describeReason(lang, report.verdict, nowMs)}`);
  out.push(`${t(lang, 'section.todo')}: ${t(lang, `todo.${report.verdict.code}`)}`);
  if (report.verdict.facts.length) {
    out.push(`${t(lang, 'section.facts')}:`);
    for (const fact of report.verdict.facts) out.push(`  - ${describeFact(lang, fact, nowMs)}`);
  }
  if (report.ok) {
    out.push(`${t(lang, 'section.tasks')}: ${t(lang, 'mission.proven', report.counts)}`);
    for (const task of report.tasks) {
      const name = task.title[lang] || task.title.pl;
      const levels = [
        `${t(lang, 'level.declared')} ${task.levels.declared === 'yes' ? '✔' : task.levels.declared === 'partial' ? '~' : '✘'}`,
        `${t(lang, 'level.exists')} ${task.levels.exists ? '✔' : '✘'}`,
        `${t(lang, 'level.verified')} ${task.levels.verified ? '✔' : '✘'}`,
        `${t(lang, 'level.effect')}: ${task.levels.effect === 'not-applicable' ? t(lang, 'level.na') : task.levels.effect === 'confirmed' ? '✔' : '✘'}`,
      ].join(' · ');
      out.push(`  ${MARK[task.color] || '[  ]'} ${task.id}. ${name}: ${stateText(lang, task.state)}`);
      out.push(`       ${levels}`);
      const check = task.artifact.checkResult;
      out.push(`       ${task.artifact.file} · ${describeCheck(lang, task.artifact.check)}${check && !check.ok ? ` · ${describeCheckFailure(lang, check)}` : ''}`);
    }
  }
  if (report.problems.length) {
    out.push(`${t(lang, 'section.problems')}:`);
    for (const p of report.problems) out.push(`  - ${describeProblem(lang, p)}`);
  }
  return out.join('\n');
}

export async function checkMission(folder, { lang = 'pl', now = Date.now() } = {}) {
  const missionDir = path.resolve(folder);
  const source = createFsSource(missionDir);
  const workspace = createFsSource(path.dirname(missionDir));
  const limits = await readLimits(workspace, { now });
  return analyzeMission(source, { now, limits: limits.entries, dir: path.basename(missionDir), lang });
}

export async function demoReset(workspaceDir = DEFAULT_WORKSPACE, { now = Date.now() } = {}) {
  const root = path.resolve(workspaceDir);
  const missions = await buildSampleMissions({ now });
  await fs.mkdir(root, { recursive: true });
  for (const [dir, files] of Object.entries(missions)) {
    const target = path.join(root, dir);
    await fs.rm(target, { recursive: true, force: true });
    const disk = createFsSource(target, { writable: true });
    for (const [rel, data] of Object.entries(files)) await disk.write(rel, data);
  }
  const limits = createFsSource(path.join(root, 'limits'), { writable: true });
  await limits.write('limits.demo.json', demoLimitsFile({ now }));
  return { root, missions: Object.keys(missions) };
}

async function main(argv) {
  const args = parseArgs(argv);
  const [command, target] = args._;
  const lang = args.lang === 'en' ? 'en' : 'pl';
  if (command === 'check' && target) {
    const report = await checkMission(target, { lang });
    if (args.json) console.log(JSON.stringify(report, null, 2));
    else console.log(formatReport(report, lang));
    return !report.ok ? 2 : report.verdict.code === 'complete' ? 0 : 1;
  }
  if (command === 'demo-reset') {
    const result = await demoReset(args.workspace || DEFAULT_WORKSPACE);
    console.log(`Sample missions written to ${result.root}: ${result.missions.join(', ')}`);
    return 0;
  }
  console.log([
    'Mission Rescue',
    '  node tools/mission-rescue.mjs check <mission folder> [--lang en] [--json]',
    '  node tools/mission-rescue.mjs demo-reset [--workspace <folder>]',
  ].join('\n'));
  return command ? 2 : 0;
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  main(process.argv.slice(2)).then(
    (code) => { process.exitCode = code; },
    (error) => { console.error(error && error.message ? error.message : error); process.exitCode = 2; },
  );
}
