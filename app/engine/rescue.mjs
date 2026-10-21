// Rescue Planner: the last confirmed checkpoint, the remaining tasks, what to do with each
// (check first / do / confirm) and a ready resume instruction in Polish and English.
// An operation with an unknown effect is never simply repeated: it is checked first.
// spec.md > Rescue Planner · prd.md > Mission Rescue

const CHECK_FIRST = new Set([
  'in-progress', 'undeclared-result', 'declared-no-artifact-info', 'artifact-missing', 'failed',
]);
// The file changed after it was proven, or the result is wrong: do not re-declare it as it is.
const REDO_AFTER_CHECK = new Set(['hash-mismatch', 'wrong-result', 'wrong-file']);

function conditionText(check, lang) {
  if (check.type === 'contains') return lang === 'en' ? `contains "${check.text}"` : `zawiera „${check.text}”`;
  if (check.type === 'json') return lang === 'en' ? `has ${check.path} = ${JSON.stringify(check.equals)}` : `ma ${check.path} = ${JSON.stringify(check.equals)}`;
  return lang === 'en' ? 'is not empty' : 'nie jest pusty';
}

function title(task, lang) {
  return (task.title && (task.title[lang] || task.title.pl)) || `#${task.id}`;
}

function list(ids, lang) {
  if (ids.length <= 1) return ids.join('');
  const and = lang === 'en' ? ' and ' : ' i ';
  return `${ids.slice(0, -1).join(', ')}${and}${ids[ids.length - 1]}`;
}

export function planRescue(report) {
  if (!report || !report.ok) return null;
  const tasks = report.tasks;
  const proven = tasks.filter((t) => t.state === 'proven').map((t) => t.id);
  let checkpoint = 0;
  for (const task of tasks) {
    if (task.state !== 'proven') break;
    checkpoint = task.id;
  }
  const steps = [];
  for (const task of tasks) {
    if (task.state === 'proven') continue;
    let action = 'do';
    if (task.state === 'effect-unconfirmed') action = 'confirm';
    else if (REDO_AFTER_CHECK.has(task.state)) action = 'redo';
    else if (CHECK_FIRST.has(task.state)) action = 'check-first';
    steps.push({
      task: task.id,
      title: task.title,
      state: task.state,
      action,
      file: task.artifact.file,
      check: task.artifact.check,
      effect: task.effect ? { where: task.effect.where } : null,
    });
  }
  const plan = {
    needed: steps.length > 0,
    checkpoint,
    proven,
    remaining: steps.map((s) => s.task),
    steps,
  };
  plan.instruction = { pl: instructionText(report, plan, 'pl'), en: instructionText(report, plan, 'en') };
  return plan;
}

function instructionText(report, plan, lang) {
  const en = lang === 'en';
  const missionTitle = report.title ? report.title[lang] || report.title.pl : report.dir;
  const lines = [];
  if (!plan.needed) {
    lines.push(en ? `MISSION: ${missionTitle}` : `MISJA: ${missionTitle}`);
    lines.push(en ? 'All tasks are proven. Nothing to resume.' : 'Wszystkie zadania mają dowody. Nie ma czego wznawiać.');
    return lines.join('\n');
  }
  lines.push(en ? `MISSION: ${missionTitle}` : `MISJA: ${missionTitle}`);
  lines.push(en
    ? `Status: ${report.counts.proven} of ${report.counts.total} tasks proven. Last confirmed checkpoint: ${plan.checkpoint ? `task ${plan.checkpoint}` : 'none'}.`
    : `Stan: ${report.counts.proven} z ${report.counts.total} zadań z dowodem. Ostatni potwierdzony punkt: ${plan.checkpoint ? `zadanie ${plan.checkpoint}` : 'brak'}.`);
  lines.push('');
  let n = 1;
  if (plan.proven.length) {
    lines.push(en
      ? `${n}. DO NOT REPEAT task${plan.proven.length > 1 ? 's' : ''} ${list(plan.proven, lang)}: ${plan.proven.length > 1 ? 'they have' : 'it has'} verified proof.`
      : `${n}. NIE POWTARZAJ zadań ${list(plan.proven, lang)}: mają sprawdzone dowody.`);
    n += 1;
  }
  const checkFirst = plan.steps.filter((s) => s.action === 'check-first' || s.action === 'redo');
  if (checkFirst.length) {
    lines.push(en
      ? `${n}. FIRST CHECK WHETHER IT ALREADY HAPPENED (do not repeat blindly):`
      : `${n}. NAJPIERW SPRAWDŹ, CZY TO JUŻ SIĘ WYKONAŁO (nie powtarzaj na ślepo):`);
    for (const s of checkFirst) {
      const name = `${en ? 'Task' : 'Zadanie'} ${s.task} "${title(s, lang)}"`.replace(/"(.*)"/, en ? '"$1"' : '„$1”');
      if (s.action === 'redo') {
        lines.push(en
          ? `   - ${name}: its file ${s.file} changed after it was reported or holds a wrong result. Find out what changed it, then do the task again and report the new result with its SHA-256. Do not report the changed file as it is.`
          : `   - ${name}: plik ${s.file} zmienił się po zgłoszeniu albo ma zły wynik. Ustal, co go zmieniło, potem wykonaj zadanie ponownie i zgłoś nowy wynik z jego SHA-256. Nie zgłaszaj zmienionego pliku bez sprawdzenia.`);
      } else {
        lines.push(en
          ? `   - ${name}: check whether ${s.file} exists and ${conditionText(s.check, lang)}.`
          : `   - ${name}: sprawdź, czy plik ${s.file} istnieje i ${conditionText(s.check, lang)}.`);
        lines.push(en
          ? '     · If yes: do not do it again; add a "done" line to the work log with the file and its SHA-256.'
          : '     · Jeśli tak: nie wykonuj go ponownie; dopisz w logu wpis „done” z plikiem i jego SHA-256.');
        lines.push(en
          ? '     · If not (missing or failing): do the task again and overwrite the file.'
          : '     · Jeśli nie (brak pliku albo nie przechodzi): wykonaj zadanie od nowa i nadpisz plik.');
      }
      if (s.effect) {
        lines.push(en
          ? `     · Outside effect: first check in ${s.effect.where.en} whether it already happened. Never repeat it blindly (for example, do not send twice).`
          : `     · Efekt zewnętrzny: najpierw sprawdź w ${s.effect.where.pl}, czy już nastąpił. Nigdy nie powtarzaj go na ślepo (np. nie wysyłaj drugi raz).`);
      }
    }
    n += 1;
  }
  const todo = plan.steps.filter((s) => s.action === 'do');
  if (todo.length) {
    lines.push(en ? `${n}. THEN DO, in this order:` : `${n}. POTEM ZRÓB, po kolei:`);
    for (const s of todo) {
      lines.push(en
        ? `   - Task ${s.task} "${title(s, lang)}": result ${s.file}, must ${conditionText(s.check, lang).replace(/^has /, 'have ').replace(/^contains /, 'contain ').replace(/^is not empty$/, 'not be empty')}.`
        : `   - Zadanie ${s.task} „${title(s, lang)}”: wynik ${s.file}, warunek: ${conditionText(s.check, lang)}.`);
      if (s.effect) {
        lines.push(en
          ? `     · Outside effect: after doing it, leave proof that ${s.effect.where.en} shows it; a person will confirm it.`
          : `     · Efekt zewnętrzny: po wykonaniu zostaw dowód, że widać go w ${s.effect.where.pl}; potwierdzi to człowiek.`);
      }
    }
    n += 1;
  }
  const confirm = plan.steps.filter((s) => s.action === 'confirm');
  if (confirm.length) {
    lines.push(en ? `${n}. FOR A PERSON TO CONFIRM (not for the agent):` : `${n}. DO POTWIERDZENIA PRZEZ CZŁOWIEKA (nie dla agenta):`);
    for (const s of confirm) {
      lines.push(en
        ? `   - Task ${s.task} "${title(s, lang)}": check in ${s.effect.where.en} that it really happened, then confirm it in Mission Rescue.`
        : `   - Zadanie ${s.task} „${title(s, lang)}”: sprawdź w ${s.effect.where.pl}, czy to naprawdę nastąpiło, i potwierdź w Mission Rescue.`);
    }
    n += 1;
  }
  lines.push(en
    ? `${n}. AFTER EACH TASK add one line to worklog.jsonl:`
    : `${n}. PO KAŻDYM ZADANIU dopisz jedną linię do worklog.jsonl:`);
  lines.push(en
    ? '   {"at":"<ISO time>","event":"done","task":<N>,"artifact":{"file":"<file>","sha256":"<SHA-256 of the file>"}}'
    : '   {"at":"<czas ISO>","event":"done","task":<N>,"artifact":{"file":"<plik>","sha256":"<SHA-256 pliku>"}}');
  n += 1;
  lines.push(en
    ? `${n}. IF YOU HAVE TO WAIT, say so in the log: {"at":"<ISO time>","event":"waiting","task":<N>,"reason":"limit" or "human","until":"<ISO time>","question":"<question>"}`
    : `${n}. JEŚLI MUSISZ CZEKAĆ, napisz to w logu: {"at":"<czas ISO>","event":"waiting","task":<N>,"reason":"limit" albo "human","until":"<czas ISO>","question":"<pytanie>"}`);
  lines.push('');
  lines.push(en ? 'A task is green only with verified proof.' : 'Zadanie będzie zielone tylko ze sprawdzonym dowodem.');
  return lines.join('\n');
}
