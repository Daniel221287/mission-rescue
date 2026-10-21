# Agent protocol: let Mission Rescue check your agent's mission

Mission Rescue never talks to your agent. It reads two small files the agent keeps next to its results, checks every result itself, and tells you the truth. This page shows the format, a ready instruction to paste into your agent (English and Polish), and how to compute a SHA-256 fingerprint.

## 1. The mission folder

```
missions/                  ← the folder you open in Mission Rescue (any name)
  my-mission/
    mission.json           ← the plan: tasks, result files, conditions (written before the work starts)
    worklog.jsonl          ← the agent appends one line per event
    out/…                  ← the result files named in mission.json
  another-mission/
  limits/                  ← optional: usage limits (see section 6)
```

You can also open a single mission folder (one with `mission.json` inside).

## 2. mission.json

```json
{
  "format": "mission-rescue/1",
  "id": "client-offer",
  "title": { "pl": "Oferta dla klienta", "en": "A client offer" },
  "agent": "Claude Code",
  "plan": "Claude Max",
  "stallMinutes": 30,
  "tasks": [
    {
      "id": 1,
      "title": { "pl": "Przygotuj ofertę", "en": "Prepare the offer" },
      "expectedMinutes": 10,
      "artifact": { "file": "out/1-offer.md", "check": { "type": "contains", "text": "## Offer" } }
    },
    {
      "id": 2,
      "title": "Check prices",
      "expectedMinutes": 5,
      "artifact": { "file": "out/2-check.json", "check": { "type": "json", "path": "failed", "equals": 0 } }
    },
    {
      "id": 3,
      "title": { "pl": "Wyślij ofertę", "en": "Send the offer" },
      "expectedMinutes": 5,
      "artifact": { "file": "out/3-sent.json", "check": { "type": "json", "path": "status", "equals": "sent" } },
      "effect": { "kind": "external", "where": { "pl": "folderze „Wysłane” w poczcie", "en": "the mail \"Sent\" folder" } }
    }
  ]
}
```

| Field | Meaning |
|---|---|
| `format` | Always `mission-rescue/1`. |
| `id` | Optional stable name; human confirmations are stored under it. |
| `title`, task `title`, `agent` | Text, or the same text in Polish and English: `{ "pl": …, "en": … }`. |
| `plan` | Optional: the subscription the agent uses, written exactly as in your limits (for example `Claude Max`). |
| `stallMinutes` | Optional, default 30: the shortest silence that may look suspicious. |
| `tasks[].id` | Unique positive whole numbers, in the order of the work. |
| `tasks[].expectedMinutes` | Optional: how long the task usually takes. The silence threshold is the longer of `stallMinutes` and 1.5 × this. |
| `tasks[].artifact.file` | The result file, a path inside the mission folder (no `..`, no absolute paths, no hidden folders whose name starts with a dot). |
| `tasks[].artifact.check` | `{"type":"contains","text":…}`, `{"type":"json","path":"a.b","equals":…}` (compared as JSON values, so the order of keys does not matter) or `{"type":"nonEmpty"}`. |
| `tasks[].effect` | Only for tasks that change something outside the computer (send, pay, publish). `kind` may be left out (the only kind is `external`). `where` should read naturally after "in" / "w". A person confirms it in the page; no file can prove it. |

## 3. worklog.jsonl

One JSON object per line, appended, never rewritten. `at` is an ISO 8601 time with its time zone (`2026-10-21T14:05:00+02:00` or `…Z`). A time without a zone is read as the local time of the computer that checks it, and the page reports it; a time more than 5 minutes ahead of that computer's clock makes the diagnosis "undetermined", because the agent then writes the wrong time zone.

```json
{"at":"2026-10-21T14:00:00+02:00","event":"started","task":1}
{"at":"2026-10-21T14:08:00+02:00","event":"done","task":1,"artifact":{"file":"out/1-offer.md","sha256":"9f2c…(64 hex characters)"}}
{"at":"2026-10-21T14:09:00+02:00","event":"started","task":2}
{"at":"2026-10-21T14:10:00+02:00","event":"progress","task":2,"message":"2 of 4 prices checked"}
{"at":"2026-10-21T14:12:00+02:00","event":"waiting","task":2,"reason":"human","question":{"pl":"Który rabat?","en":"Which discount?"}}
{"at":"2026-10-21T14:30:00+02:00","event":"waiting","task":2,"reason":"limit","until":"2026-10-21T16:00:00+02:00"}
{"at":"2026-10-21T16:05:00+02:00","event":"error","task":2,"message":"price list not found"}
{"at":"2026-10-21T16:06:00+02:00","event":"heartbeat","task":2}
{"at":"2026-10-21T16:07:00+02:00","event":"note","message":"retrying with the cached list"}
```

| Event | When | Extra fields |
|---|---|---|
| `started` | before a task, and again when the task is retried or resumed | `task` |
| `progress` | optional, during a task | `task`, `message` |
| `done` | after a task, when its file is written | `task`, `artifact: {file, sha256}` (required for a proof) |
| `waiting` | when the agent must stop | `reason`: `limit`, `human` or `other`; optional `until`, `question`, `message` |
| `error` | when something failed | `task`, `message` |
| `heartbeat`, `note` | optional signs of life | not progress |

What makes a task green: the latest `done` names the task's file, the file exists, its SHA-256 equals the declared one, the condition passes, and (for an outside effect) a person confirmed it. A result file that exists but was never declared is an uncertain effect: the rescue plan tells the agent to check it, not to repeat the task blindly. Broken lines are listed with their line numbers and skipped.

## 4. SHA-256 of a file

Write only the 64 hex characters. If a tool prints the file name after the hash (as `shasum` and `sha256sum` do), Mission Rescue ignores the name.

| System | Command |
|---|---|
| Windows (PowerShell) | `(Get-FileHash -Algorithm SHA256 out\1-offer.md).Hash.ToLower()` |
| macOS | `shasum -a 256 out/1-offer.md` |
| Linux | `sha256sum out/1-offer.md` |
| Node.js (any system) | `node -e "console.log(require('crypto').createHash('sha256').update(require('fs').readFileSync(process.argv[1])).digest('hex'))" out/1-offer.md` |

## 5. The instruction to paste into your agent

Add this to the agent's task or system instructions, with your folder name.

**English**

```
This mission is tracked by Mission Rescue in the folder <FOLDER>.
1. Read <FOLDER>/mission.json. Do the tasks in order. Each task must write exactly the result
   file named in it, and the file must meet the task's condition.
2. Before a task (also when you retry or resume it), append one line to <FOLDER>/worklog.jsonl:
   {"at":"<now, ISO 8601 with time zone>","event":"started","task":<N>}
3. After a task, compute the SHA-256 of its result file and append:
   {"at":"<now>","event":"done","task":<N>,"artifact":{"file":"<file>","sha256":"<SHA-256>"}}
   Never report "done" without the file. If you change a reported file, report it again.
4. If you must stop, say why: {"at":"<now>","event":"waiting","task":<N>,"reason":"limit" or "human",
   "until":"<when you expect to continue>","question":"<your question>"}
5. If something fails: {"at":"<now>","event":"error","task":<N>,"message":"<what failed>"}
6. For anything outside this computer (sending, paying, publishing): first check whether it
   already happened; never repeat it blindly.
7. Append only; never edit or delete earlier lines.
```

**Polski**

```
Tę misję sprawdza Mission Rescue w folderze <FOLDER>.
1. Przeczytaj <FOLDER>/mission.json. Rób zadania po kolei. Każde zadanie zapisuje dokładnie
   plik wyniku podany w misji, a plik musi spełniać warunek zadania.
2. Przed zadaniem (także gdy je ponawiasz albo wznawiasz) dopisz jedną linię do <FOLDER>/worklog.jsonl:
   {"at":"<teraz, ISO 8601 ze strefą czasu>","event":"started","task":<N>}
3. Po zadaniu policz SHA-256 pliku wyniku i dopisz:
   {"at":"<teraz>","event":"done","task":<N>,"artifact":{"file":"<plik>","sha256":"<SHA-256>"}}
   Nigdy nie zgłaszaj „done” bez pliku. Jeśli zmienisz zgłoszony plik, zgłoś go ponownie.
4. Jeśli musisz przerwać, napisz dlaczego: {"at":"<teraz>","event":"waiting","task":<N>,
   "reason":"limit" albo "human","until":"<kiedy wrócisz>","question":"<Twoje pytanie>"}
5. Jeśli coś się nie uda: {"at":"<teraz>","event":"error","task":<N>,"message":"<co nie wyszło>"}
6. Przy wszystkim poza tym komputerem (wysyłka, płatność, publikacja) najpierw sprawdź, czy to
   już się wykonało; nigdy nie powtarzaj tego na ślepo.
7. Tylko dopisuj; nie zmieniaj i nie usuwaj wcześniejszych linii.
```

When the mission stops, open it in Mission Rescue and give the agent the **rescue plan** instead (it already lists what not to repeat, what to check first and what to do next).

## 6. Usage limits (optional)

Mission Rescue never logs in to chat sites. It shows limits from three places, each labelled:

- **Typed in the page** ("Add a limit by hand"): saved only in that browser, labelled MANUAL.
- **Claude Code's status line**: Claude Code passes the 5-hour and 7-day usage of Pro and Max plans to a status-line command. Add this to `~/.claude/settings.json` (use your own path and your plan's name as written in `mission.json`):

  ```json
  { "statusLine": { "type": "command", "command": "node /path/to/mission-rescue/tools/claude-statusline.mjs --plan \"Claude Max\"" } }
  ```

  It writes `missions/limits/limits.auto.json` (labelled AUTOMATICALLY VERIFIED for 30 minutes, then OUT OF DATE) and prints a short status line. Options: `--workspace <missions folder>`, `--silent`, `--lang en`. It reads only what Claude Code passes to it and never contacts any service.
- **`limits/*.json` files** in the missions folder: `{"source":"auto" or "demo","capturedAt":"…","plans":[{"plan":"Claude Max","window":"5h","usedPercent":42,"resetsAt":"…"}]}`.

When several numbers describe the same plan and window, the most trusted one is used (automatically verified, then manual, then demo); out-of-date numbers are never used for a diagnosis. Demo numbers (written with the built-in samples) are used only for the sample missions, never for your own.

## 7. In scripts and CI

```
node tools/mission-rescue.mjs check path/to/my-mission            # exit 0 complete, 1 not complete, 2 unreadable
node tools/mission-rescue.mjs check path/to/my-mission --json     # the full report as JSON
```
