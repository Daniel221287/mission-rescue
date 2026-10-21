---
doc: spec
status: approved
---

# Mission Rescue — Technical Spec

Approval: 21 Oct 2026, 15:23. Daniel asked for real local reading (a picked folder or a read-only local program), a product the jury can run and check, PL/EN, zero spend, and to carry on through the build himself. This version applies that to the first spec draft (same day), which recommended a local Node.js app with no packages; that recommendation stays, and a browser version of the same engine is added so the jury can run it without installing anything.

## How This Works, In Plain Language

- **A mission is a folder.** Inside: the mission file (the tasks from A to Z; for each task the result file and the condition it must pass; optionally an outside effect), the work log (one line for each thing the agent reports: started, done, waiting, error, heartbeat...), and the result files the agent produced.
- **The engine** reads those files and checks them, the same way everywhere. For each task it checks the four proof levels: did the agent declare it done, does the result file exist, does the file's fingerprint (SHA-256: a code that changes completely if one letter of the file changes) match what the agent declared and does the file pass the mission's condition, and, for outside effects, has a person confirmed it. Then it diagnoses the mission (with a reason, the facts and how sure it is) and writes the rescue plan.
- **The engine runs inside the page.** The page can read missions from three places, always on your own device: the built-in sample missions, the missions folder on your computer through the small local program, or a folder you pick in the browser. Nothing is uploaded; the page is not allowed to send data anywhere.
- **The small local program** (Node.js, which you already have) only shows the page and lets it read the missions folder on your computer. It cannot change anything.
- **The sample agent** plays the agent in the demo. It reads the same rescue plan, really computes the missing results from fictional data and writes them with their fingerprints, so the change from red to green happens only because real files really passed the checks.
- **The public demo address** (GitHub Pages, free) shows the same page with the built-in samples, so the jury can try the whole flow on a computer or phone without installing anything.

Why this shape: one engine for the page, the command line and the tests, so what the jury clicks is exactly what the tests check; no accounts, no servers that hold data, no packages to install, no cost.

## The Core Journey Through the System

PRD ref: `prd.md > The Core Journey`.

1. Daniel opens the page: `START.cmd` starts the Local Program and opens `http://127.0.0.1:4317/app/`, or he opens the public demo address. The Command Center Screen loads the engine.
2. He chooses a source in the Source Picker: built-in samples (Sample Builder creates the sample folders in memory from fictional data, with times relative to now), "this computer" (the Local Program's read-only missions folder), or "pick a folder" (the browser's folder picker).
3. The Mission Analyzer lists the missions in the source and analyzes each one → the missions list shows the cards.
4. He opens "Raport tygodniowy" → Mission Reader and Work Log Reader read the files → Proof Engine checks each task's four levels (tasks 1–3 proven; task 4's file exists but fails its condition and was never declared: uncertain effect) → Stall Detector gives "likely failure" with facts and high confidence → Rescue Planner writes the plan → the screen shows it all.
5. He copies the instruction (Copy button).
6. The Sample Agent (in the page for the built-in sample, or `node tools/mission-rescue.mjs demo-agent <folder>` for a folder on disk) follows the plan: checks task 4 first, redoes it because the file is incomplete, computes 5–7, writes files, appends "done" lines with SHA-256.
7. "Sprawdź ponownie" → everything is read and checked again → 7 of 7 → green.
8. "Test uczciwości" (built-in sample) changes a proven file → the next check finds the fingerprint mismatch → red.
9. Limit Guardian reads the source's `limits/` files and the browser's manual entries → labelled numbers on screen.

## Stack

- **Node.js 20+** (his computer has v24.19.0) with built-in modules only: `node:http` (Local Program), `node:fs` (reading folders), `node:test` (tests). No packages to install. Docs: https://nodejs.org/docs/latest-v24.x/api/
- **Web Crypto** (`crypto.subtle.digest("SHA-256")`) for fingerprints, available in browsers (secure pages: `http://127.0.0.1` and `https://` count) and in Node 20+. Docs: https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/digest
- **Plain HTML, CSS and JavaScript modules**, no framework, no build step.
- **File System Access API** (`showDirectoryPicker`) for picking a folder in Chrome and Edge on desktop, with the `<input type="file" webkitdirectory>` fallback for other desktop browsers. Phones use the built-in samples. Docs: https://developer.mozilla.org/en-US/docs/Web/API/Window/showDirectoryPicker
- **three.js 0.160.0** (MIT) for the single 3D beacon, saved in the project. Docs: https://threejs.org/docs/
- **Fonts saved in the project** (SIL Open Font License): Barlow Semi Condensed, IBM Plex Sans and IBM Plex Mono from the Fontsource npm packages (5.3.0).
- **Claude Code status line** (official) as the only automatic source of limits. Docs: https://code.claude.com/docs/en/statusline
- **GitHub Pages** (free for public repositories) for the public demo address. Docs: https://docs.github.com/en/pages

## Where It Runs and How Someone Tries It

- **Public demo (no installation):** the GitHub Pages address of the repository, path `/app/`. Built-in samples, sample agent and "Test uczciwości" all run in the page. Works on desktop and phone browsers.
- **On a computer with Node.js 20+:** double-click `START.cmd` (Windows) or run `node tools/server.mjs`, then open `http://127.0.0.1:4317/app/`. The "this computer" source reads `missions/` (or `--workspace <folder>`).
- **Disk demo:** `node tools/mission-rescue.mjs demo-reset` (writes the samples to `missions/` in their stopped state), open the page, choose "this computer", open "Raport tygodniowy", then `node tools/mission-rescue.mjs demo-agent missions/weekly-report --delay 1500`, then "Sprawdź ponownie".
- **Command-line check:** `node tools/mission-rescue.mjs check <mission folder> [--lang en] [--json]`.
- **Tests:** `node --test`.
- **Submission:** a demo video under 3 minutes recorded on his computer and uploaded publicly to YouTube, the public GitHub repository with an MIT license (shown in the About section), and the public demo address as an extra.

## Look and Feel

Carried from `prd.md > Look and Feel`.

- **Character:** a calm, modern command center; clear first, attractive second. Generous spacing, rounded cards with soft depth only where they mark a separate object, big status words, short bold labels.
- **Colour:** steel and graphite neutrals; colour is reserved for status, as on a factory signal tower (andon): green proven, amber waiting/uncertain, red stopped/failed, blue waiting for you (the andon "operator needed" colour; the code calls it teal), slate grey not started/undetermined, always with text labels; light and dark themes from the system setting. Primary buttons are ink-coloured so that no button competes with a status.
- **Type:** Barlow Semi Condensed (signage-like, for status words and headings), IBM Plex Sans (body, full Polish characters), IBM Plex Mono (fingerprints, file names, the resume instruction); Latin and Latin Extended subsets saved in the project, with system fallbacks.
- **3D:** one status beacon beside the verdict: a small industrial signal tower (stack light) with four segments (red, amber, green, blue) where only the segment for the mission's status glows and pulses, the light casting onto the verdict panel; it turns slowly. three.js is loaded only on the mission view, after the page is shown; a flat CSS tower of the same colours is shown first and stays without WebGL (or with data saving on); everything stands still for reduced motion. The mission list shows the same signal as a lamp strip on each card, and a proof strip with one cell per task.
- **Phone first:** one column under 640 px, large tap targets, sticky actions, no sideways scrolling.
- **Copy:** plain Polish, second person; English on the switch.

## Components

### Mission Reader

Reads `mission.json`: `format` = `mission-rescue/1`, `id`, `title` (`{pl, en}`), `agent` (text or `{pl, en}`), optional `plan` (the subscription the agent uses), optional `stallMinutes` (default 30), `tasks[]` with `id` (unique positive integers), `title` (`{pl, en}`), optional `expectedMinutes`, `artifact` (`file`: a relative path inside the mission folder; `check`: `{type: "contains", text}` | `{type: "json", path, equals}` | `{type: "nonEmpty"}`), optional `effect` (`{kind: "external", where: {pl, en}}`, where `where` reads naturally after "w" / "in", e.g. "folderze „Wysłane” w poczcie" / "the mail \"Sent\" folder"). Reports problems with the file name, and for broken JSON the line where the text stops being valid (found by the engine itself, the same in every browser and in Node.js).
File: `app/engine/mission.mjs`. PRD ref: `prd.md > Mission Tracker`.

### Work Log Reader

Reads `worklog.jsonl`: one JSON object per line with `at` (ISO time), `event` (`started`, `progress`, `done`, `waiting`, `error`, `heartbeat`, `note`), optional `task`; `done` carries `artifact: {file, sha256}`; `waiting` carries `reason` (`limit`, `human`, `other`), optional `until` and `question`; `error` carries `message`; any event may carry a `message`. `question` and `message` are plain text or the same text in both languages (`{"pl": …, "en": …}`), shown in the screen's language. Broken lines are reported with their line numbers and skipped.
File: `app/engine/worklog.mjs`. PRD ref: `prd.md > Mission Tracker`, `prd.md > States and Boundaries`.

### Proof Engine

For each task: level 1 (latest `done` with artifact info), level 2 (the mission's artifact file exists), level 3 (SHA-256 equals the declared one, the declared file is the mission's file, and the check passes), level 4 (only with `effect`: a human confirmation for this mission, task and exact SHA-256). Task states: `proven`, `declared-no-artifact-info`, `artifact-missing`, `hash-mismatch`, `wrong-result`, `undeclared-result`, `effect-unconfirmed`, `in-progress`, `failed`, `not-started`. Never runs commands; only reads.
File: `app/engine/proof.mjs` (fingerprints: `app/engine/hash.mjs`). PRD ref: `prd.md > Proof Engine`.

### Stall Detector

Inputs: task results, events, now, the mission's stall time, the current task's expected time, limits. The current task is the first task that is neither proven nor only waiting for a person's confirmation. Waiting time T = max(stallMinutes, 1.5 × expectedMinutes of the current task). Progress time = the latest verified result's `done` (a proven task, or a verified file whose outside effect is not confirmed yet), or the first event. Activity time = the latest event of any kind. First matching rule wins:
1. all tasks green → `complete`;
2. a declared task fails its proof → `proof-problem` (high);
2a. every unfinished task only waits for a person to confirm its outside effect → `needs-confirmation` (high; added during the build so a finished agent is not shown as "working" or "stalled" while the person has to look at the outside world);
3. no events → `not-started`;
4. latest meaningful event is `error` → `likely-failure` (high);
5. latest meaningful event is `waiting` for a person → `waiting-human` (high);
6. latest meaningful event is `waiting` for a limit: reset in the future → `waiting-limit` (high if the limits agree, else medium); reset passed more than T ago with no activity since → `likely-failure` (medium); otherwise `waiting-limit` (medium);
7. no progress for longer than T and activity within T (heartbeats only) → `no-progress` (high if longer than 2T, else medium);
8. silence longer than T: the plan's limit is used up (≥ 95 %) with a future reset → `waiting-limit` (medium, inferred); silence longer than 3T → `likely-failure` (high if the current task left an incomplete result file, else medium); otherwise → `undetermined` (low);
9. otherwise → `working` (medium).
Each verdict carries facts (last proven task and time, last signal and time, silence length, waiting time T, limit state, incomplete file, where to check an outside effect) for the screen. Limits used here are never out of date; when several numbers describe the same plan and window, the most trusted one wins (verified automatically, then manual, then demo). The mission list puts what needs attention first (proof problem, likely failure, unreadable, no progress, needs confirmation, waiting for a person, waiting for a limit, undetermined, working, not started, complete).
File: `app/engine/stall.mjs`. PRD ref: `prd.md > Stall Detector`.

### Rescue Planner

When not complete: checkpoint (highest task with every task up to it green), remaining tasks with actions `check-first` (in progress, undeclared result, failed proof, unconfirmed or claimed outside effect), `do` (not started), `confirm` (outside effect waiting for a person), each with exact checks and per-outcome steps; plus the resume instruction text in Polish and English (what not to repeat, what to check first, what to do next, how to log results with SHA-256, how to log waiting). Also the machine-readable plan used by the Sample Agent.
File: `app/engine/rescue.mjs`. PRD ref: `prd.md > Mission Rescue`.

### Limit Guardian

Reads `limits/*.json` in the source (each: `source` = `demo` or `auto`, `capturedAt`, `plans[]` with `plan`, `window`, `usedPercent`, `resetsAt`), and manual entries from the page. Labels: DEMO, RĘCZNE, ZWERYFIKOWANE AUTOMATYCZNIE (auto, captured ≤ 30 minutes ago), NIEAKTUALNE (auto older than 30 minutes, or any entry whose reset time has passed). Options of the script: `--plan` (the name used in `mission.json`, default "Claude"), `--workspace`, `--silent`, `--lang`; it never fails the status line (bad input prints a plain line and writes nothing). The status-line script `tools/claude-statusline.mjs` reads Claude Code's status-line JSON on its input and writes `limits/limits.auto.json` from `rate_limits.five_hour` and `rate_limits.seven_day` (`used_percentage`, `resets_at` in Unix seconds); without those fields it writes nothing.
Files: `app/engine/limits.mjs`, `tools/claude-statusline.mjs`. PRD ref: `prd.md > Limit Guardian`.

### Mission Analyzer

Lists the missions of a source (folders with `mission.json`, or the source itself if it is one mission) and analyzes one mission end to end. A mission that cannot be read becomes a card with its problems; it never breaks the list.
File: `app/engine/analyze.mjs`. PRD ref: `prd.md > The Core Journey`, `prd.md > States and Boundaries`.

### Sources

One small interface (`list`, `readBytes`, `readText`, plus `write` for the sample agent where allowed): memory folder (built-in samples, tests) `app/engine/memory-source.mjs`; browser sources (Local Program over HTTP, picked folder via File System Access or `webkitdirectory`) `app/sources-browser.mjs`; disk folder for Node `tools/fs-source.mjs`. Paths are checked to stay inside the source (`app/engine/paths.mjs`).
PRD ref: `prd.md > Mission Tracker`.

### Sample Builder and Sample Agent

`app/demo/weekly-report.mjs`: fictional orders of a fictional shop and the 7 tasks' real computations (load, validate, daily totals, summary, chart data, self-test, final report with all fingerprints). `app/demo/samples.mjs` with `app/demo/extra-samples.mjs`: builds the sample workspace (the jury mission stopped after task 3 with an incomplete task-4 file; normal work; waiting for a limit; waiting for you; no progress; undetermined; an outside effect waiting for a person's confirmation; a broken mission file; demo limits) with times relative to now; every reported result is a real file with its real SHA-256. `app/demo/sample-agent.mjs`: follows the rescue plan through the engine and writes results and log lines. Used by the page, by `demo-reset` and `demo-agent`, and by the tests.
PRD ref: `prd.md > Demo and Self-Check`.

### Command Center Screen

`app/index.html`, `app/main.mjs` (source switch, missions list, mission view, re-check, Copy with fallback, sample buttons, manual limits, human confirmation of outside effects, PL/EN, `#/m/<id>` routing), `app/i18n.mjs` (all texts in Polish and English, also used by the command line), `app/styles.css`, `app/beacon.mjs`. A Content Security Policy allows the page to load only its own files and to connect only to its own address.
PRD ref: `prd.md > Screens and Layout`, `prd.md > Polish Command Center`, `prd.md > Look and Feel`.

### Local Program

`tools/server.mjs`: `node:http` on `127.0.0.1:4317`; serves the repository's `index.html` and `app/`, and the workspace read-only under `/workspace/` with `/workspace/index.json` listing its folders and files; `Cache-Control: no-store`; refuses paths outside, hidden files and anything but GET/HEAD.
PRD ref: `prd.md > Mission Tracker`, `prd.md > States and Boundaries`.

### Command-Line Tool

`tools/mission-rescue.mjs`: `check <folder>` (verdict, levels, rescue instruction; `--json`, `--lang`), `demo-reset [--workspace]`, `demo-agent <folder> [--delay ms]`. Exit code 0 when complete, 1 when not complete, 2 on input errors.
PRD ref: `prd.md > Demo and Self-Check`.

### Agent Protocol Guide

`docs/AGENT_PROTOCOL.md` (English and Polish): how any agent writes the mission file and the work log, with examples.
PRD ref: `prd.md > What We're Building`.

## Data Model

| Data | Where it lives | Updated by | When Daniel comes back |
|---|---|---|---|
| Mission | `<mission>/mission.json` | the agent (or demo-reset) | read again on every check |
| Work log | `<mission>/worklog.jsonl` | the agent appends lines | read again on every check |
| Results | `<mission>/out/…` | the agent | read and fingerprinted again on every check |
| Limits | `<workspace>/limits/*.json` | shipped demo file; status-line script | read again; label depends on age |
| Manual limits | browser storage `mr.manualLimits` | the page | that browser only |
| Human confirmations | browser storage `mr.confirmations` (mission, task, SHA-256, time) | the page | that browser only; void if the file changes |
| Built-in samples | page memory | the page and the sample agent | rebuilt on reload or "Przywróć przykład" |

`missions/` and `limits.auto.json` are not committed.

## File Structure

```
mission-rescue/
├── index.html                  # GitHub Pages entry: forwards to app/
├── .nojekyll                   # GitHub Pages serves files as they are
├── START.cmd                   # Windows: start the Local Program and open the page
├── package.json                # scripts only, no dependencies
├── README.md                   # English and Polish
├── LICENSE                     # MIT
├── app/
│   ├── index.html              # Command Center Screen
│   ├── main.mjs                # screen logic
│   ├── i18n.mjs                # Polish and English texts
│   ├── styles.css
│   ├── beacon.mjs              # 3D beacon + flat fallback
│   ├── sources-browser.mjs     # Local Program / picked folder sources
│   ├── engine/                 # the shared engine (page, command line, tests)
│   │   ├── paths.mjs  hash.mjs  memory-source.mjs
│   │   ├── mission.mjs  worklog.mjs  proof.mjs
│   │   ├── stall.mjs  rescue.mjs  limits.mjs  analyze.mjs
│   ├── demo/
│   │   ├── weekly-report.mjs   # fictional data + the 7 tasks
│   │   ├── samples.mjs         # sample workspace builder
│   │   ├── extra-samples.mjs   # one sample for every other kind of stop
│   │   └── sample-agent.mjs    # follows the rescue plan
│   ├── fonts/                  # woff2 + fonts.css + OFL licences
│   └── vendor/                 # three.module.min.js + three.LICENSE.txt
├── tools/
│   ├── server.mjs              # Local Program (read-only)
│   ├── fs-source.mjs           # disk source for Node
│   ├── mission-rescue.mjs      # check / demo-reset / demo-agent / honesty-test
│   └── claude-statusline.mjs   # Claude Code status line → limits file
├── docs/
│   ├── AGENT_PROTOCOL.md       # mission format, agent instruction (EN/PL), SHA-256, limits
│   └── img/                    # README screenshots
├── test/                       # node --test
├── missions/                   # local workspace (demo-reset; not committed)
└── devpost/                    # scope, prd, spec, checklist, HTML companions, app map
```

## External Services and Dependencies

- **Runtime network calls: none.** The page loads only its own files; the Content Security Policy blocks connections to other addresses.
- **GitHub Pages** hosts the public copy of the static page (free for public repositories). It never receives mission files: those are read inside the visitor's browser.
- **three.js 0.160.0** (MIT, https://github.com/mrdoob/three.js/blob/dev/LICENSE) and **fonts** (OFL), downloaded once from the npm registry and committed.
- **Claude Code status line** (optional, local): fields `rate_limits.five_hour.used_percentage`, `rate_limits.five_hour.resets_at`, `rate_limits.seven_day.used_percentage`, `rate_limits.seven_day.resets_at`; present only for Pro and Max subscribers after the first response in a session. https://code.claude.com/docs/en/statusline

## Important Failure Modes

- **Broken mission file or log lines** → the card lists the problems with file name and line number; the rest still works.
- **Folder picker not available** (Firefox, Safari, phones) → the `webkitdirectory` fallback on desktop; on phones only the built-in samples, with a short explanation.
- **No WebGL** → a flat lamp in the same colour.
- **Clipboard blocked** → the instruction text is selected for manual copying.
- **Port 4317 busy** → the Local Program says so and how to use `--port`.

## What Was Simplified and Why

- **Human confirmation for outside effects** instead of checking outside systems: independent checks need a connection per provider; the confirmation is labelled and tied to the exact file fingerprint.
- **"Sprawdź ponownie" button** instead of live watching: same result, no background work.
- **Fingerprints and simple conditions** instead of running test commands: Mission Rescue never executes anything, so it is safe to point at any folder.
- **Browser storage for manual limits and confirmations** instead of writing to disk: the page never needs write access.
- **One sample domain** (a fictional weekly report): enough to prove the kernel; real agent formats come later through adapters.

## Decisions and Open Issues

Daniel's decisions are listed in `prd.md > Product Decisions` (four proof levels; smarter stall detection with confidence; check before repeating; real end-to-end demo with failure tests; real local reading without uploads; a product the jury can run; PL/EN, subtle 3D, phone-first; zero spend).

Technical choices: the first draft's recommendation (local Node.js app, no packages) was kept; the browser-side engine, the folder picker, the Local Program's read-only workspace and the free GitHub Pages copy follow Daniel's 15:23 requirements (real local reading, nothing uploaded, the jury can run it). Implementation details derived from that: port 4317; waiting time T as defined in the Stall Detector; automatic limits fresh for 30 minutes.

The useful unknown (Daniel's own question, 21 Oct): "Can it show my limits without me typing them and without logging in to my accounts?" Clarified: logging in to chat sites is out (their terms), but Claude Code's official status line passes the 5-hour and 7-day percentages to a script; Mission Rescue saves and labels them. Checked during the build with the documented sample input. Connecting it to his real Claude Code changes its settings, so that is done only with his agreement.

Open issues: none blocking.
