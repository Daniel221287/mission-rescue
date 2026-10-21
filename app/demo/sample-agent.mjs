// The sample agent: plays the agent in the demo. It reads the same rescue plan the user
// sees, checks uncertain tasks before repeating them, really computes the remaining
// results from the fictional data, writes them and logs each one with its SHA-256.
// Works on any writable source (the page's memory folder, or a folder on disk).
// spec.md > Sample Builder and Sample Agent · prd.md > Demo and Self-Check

import { analyzeMission } from '../engine/analyze.mjs';
import { runCheck } from '../engine/proof.mjs';
import { sha256Hex } from '../engine/hash.mjs';
import { LOG_FILE } from '../engine/worklog.mjs';
import { weeklyTask } from './weekly-report.mjs';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export async function runSampleAgent(source, { clock = () => Date.now(), delayMs = 0, onStep = () => {}, limits = [] } = {}) {
  if (!source.writable) throw new Error('The sample agent needs a writable mission folder.');
  const report = await analyzeMission(source, { now: clock(), limits });
  if (!report.ok || report.demo !== 'weekly-report') {
    throw new Error('The sample agent only works on the sample mission "weekly-report".');
  }
  const plan = report.rescue;
  const log = (entry) => source.append(LOG_FILE, `${JSON.stringify({ at: new Date(clock()).toISOString(), ...entry })}\n`);
  const read = (path) => source.readText(path);
  const done = [];

  for (const step of plan.steps) {
    if (step.action === 'confirm') continue; // outside effects are confirmed by a person
    const task = weeklyTask(step.task);
    if (!task) continue;
    if (step.action === 'check-first') {
      onStep({ key: 'demo.agent.step.check', task: step.task });
      const existing = await source.readBytes(task.artifact.file);
      if (existing && runCheck(task.artifact.check, existing).ok) {
        await log({ event: 'done', task: step.task, artifact: { file: task.artifact.file, sha256: await sha256Hex(existing) }, message: 'checked first: the result was already there' });
        onStep({ key: 'demo.agent.step.reuse', task: step.task });
        done.push(step.task);
        continue;
      }
      onStep({ key: 'demo.agent.step.redo', task: step.task });
    } else if (step.action === 'redo') {
      onStep({ key: 'demo.agent.step.changed', task: step.task });
    } else {
      onStep({ key: 'demo.agent.step.do', task: step.task });
    }
    await log({ event: 'started', task: step.task });
    if (delayMs) await sleep(delayMs);
    const content = await task.run(read);
    await source.write(task.artifact.file, content);
    await log({ event: 'done', task: step.task, artifact: { file: task.artifact.file, sha256: await sha256Hex(content) } });
    onStep({ key: 'demo.agent.step.done', task: step.task });
    done.push(step.task);
  }
  onStep({ key: 'demo.agent.finished' });
  return { done };
}

// The honesty test: silently change one proven result (a daily total in task 3's file).
// The condition still passes; only the fingerprint can catch it.
export async function tamperSample(source) {
  if (!source.writable) throw new Error('The honesty test needs a writable mission folder.');
  let mission = null;
  try {
    mission = JSON.parse(await source.readText('mission.json'));
  } catch {
    mission = null;
  }
  if (!mission || mission.demo !== 'weekly-report') {
    throw new Error('The honesty test only works on the sample mission "weekly-report".');
  }
  const file = weeklyTask(3).artifact.file;
  const text = await source.readText(file);
  if (text == null) throw new Error(`missing ${file}`);
  const changed = text.replace(/"total": "(\d+)\.(\d\d)"/, (_, whole, cents) => `"total": "${Number(whole) + 100}.${cents}"`);
  await source.write(file, changed);
  return { task: 3, file };
}
