---
doc: spec
status: draft
---

# Mission Rescue — Technical Spec

## How This Works, In Plain Language

Mission Rescue is a small program that runs on Daniel's own computer and shows its screen in the browser.

- **The missions folder** is where agents keep their missions. One mission is one folder: the mission file (the list of tasks from A to Z and, for each task, what counts as proof), the work log (one line for each thing the agent reports: started, done, waiting, error...), and the result files the agent produced.
- **The engine** reads those files and does the checking. For every task it looks for the result file, takes its fingerprint (SHA-256, a code that changes completely if even one letter of the file changes), compares it with the fingerprint the agent declared, and runs the mission's check (for example "the file must contain this text"). Only a task that passes all of that is green. Then it decides what is happening with the mission (working, stopped, waiting for a limit, waiting for Daniel) and writes the rescue plan.
- **The local server** is a tiny program that waits on Daniel's computer, asks the engine for the answer whenever the screen asks, and serves the screen itself. It only reads files. It never sends anything to the internet and never runs agents.
- **The screen (command center)** shows the missions list and one mission in detail, in Polish (English on a switch), with a glowing 3D status beacon.
- **The sample mission and the sample agent** make the jury demo real: the sample agent really computes the results of tasks 4–7 from fictional data and logs them with real fingerprints, so the red-to-green change happens because the files really changed and really passed the checks.

Why this shape: everything stays on Daniel's computer, needs nothing installed besides Node.js (which he already has), no accounts, no internet and no paid services. Every check happens again from the files each time he presses "Sprawdź ponownie", so the screen can never show an old, made-up state.

## The Core Journey Through the System

PRD ref: `prd.md > The Core Journey`.

1. Daniel double-clicks `START.cmd` (or runs `node src/server.mjs`) → the Local Server starts on his computer and the browser opens `http://127.0.0.1:4317`.
2. The screen asks the server for the missions list → the server asks the Mission Analyzer to look into every folder in `missions/` → he sees one card per mission with its colour and "X z Y potwierdzone".
3. He opens the sample mission → the server reads `mission.json`, `worklog.jsonl` and the result files → the Proof Engine checks every task → the Stall Detector gives the verdict → the Rescue Planner writes the plan → the screen shows it all.
4. The sample is red: tasks 1–3 proven (files exist, fingerprints match, checks pass), task 4 only "started", and the last sign of life is older than the stall time → "Prawdopodobna awaria".
5. He copies the resume instruction (the screen's Copy button).
6. The sample agent (`node scripts/demo-agent.mjs`) plays the agent: it reads the same rescue plan, checks task 4's effects first, computes tasks 4–7 from the fictional data, writes the result files and appends "done" lines with their fingerprints to the work log.
7. He presses "Sprawdź ponownie" → the screen asks the server again → everything is re-read and re-checked → 7 of 7 proven → green "Misja zakończona i potwierdzona dowodami".
8. Limit Guardian: the screen asks the server for limits → the server reads the demo limits file and, if present, the file written by the status-line script → each number comes back with its source label; numbers typed by hand are added by the screen from the browser's own storage.

## Stack

Recommended by the agent, waiting for Daniel's OK (one "OK" covers it):

- **Node.js 20 or newer** (his computer has v24.19.0), using only built-in parts: `node:http` for the local server, `node:fs` for reading files, `node:crypto` for SHA-256 fingerprints, `node:test` for tests. No packages to install, so nothing can break during installation. Docs: https://nodejs.org/docs/latest-v24.x/api/ (http, fs, crypto, test).
- **Plain HTML, CSS and JavaScript modules** for the screen, without a framework or a build step: simpler to read and to run.
- **three.js 0.160.0** (MIT license) for the single 3D status beacon, saved inside the project (`web/vendor/`), so it works without internet. Docs: https://threejs.org/docs/ . Tradeoff: about 0.7 MB in the repository.
- **Claude Code status line** (official feature) as the only automatic source of limits: a small script receives the 5-hour and 7-day usage percentages and reset times from Claude Code and saves them to a file. Docs: https://code.claude.com/docs/en/statusline . The fields exist only for Pro and Max subscribers and only after the first answer in a session.

Nothing in the stack needs a key, an account or money.

## Where It Runs and How Someone Tries It

- **Runs on:** Daniel's computer (KompDaniela, Windows 11) or any computer with Node.js 20+. Browser: any current browser; the 3D beacon needs WebGL and falls back to a flat lamp without it.
- **Start:** double-click `START.cmd` (Windows), or run `node src/server.mjs` in the project folder, then open `http://127.0.0.1:4317`. Options: `--port 4318`, `--missions <folder>`.
- **Demo for the video (the jury flow):**
  1. `node scripts/demo-reset.mjs` (puts the sample missions into `missions/` in their stopped state, with timestamps relative to now).
  2. Start the app and open "Raport tygodniowy" → red, 3 of 7, rescue plan.
  3. Copy the instruction, then run `node scripts/demo-agent.mjs weekly-report --delay 1500`.
  4. Press "Sprawdź ponownie" → green, 7 of 7.
- **Tests:** `node --test` in the project folder.
- **Submission:** a short demo video recorded on his computer, uploaded publicly to YouTube, and a public GitHub repository with an MIT license. No deployment (optional, not chosen): the app reads local files by design.

## Look and Feel

Carried from `prd.md > Look and Feel` and `scope.md > Inspiration & Identity`.

- **Character:** a calm command center, clear first, attractive second: cards with generous spacing, big status words, short bold labels, no walls of text.
- **Colour:** status colours carry meaning and always come with a text label: green = proven, yellow = waiting or unproven, red = stopped or proof failed, teal = waiting for you, grey = not started. Neutrals with a slight blue-grey bias. Light and dark themes follow the system setting.
- **Type:** a characterful display face for big status words (Bricolage Grotesque), a highly legible body face with full Polish characters (IBM Plex Sans), a monospace face for fingerprints and file names (IBM Plex Mono). Fonts are saved inside the project so the app works offline; system fonts are the fallback.
- **3D:** one status beacon in the mission card (a short signal-tower lamp) that glows the mission's colour and turns slowly. It sits beside the text, never on top of it, and stops moving when the system asks for reduced motion.
- **Copy:** plain Polish, second person ("Co się stało", "Co zrobić"). English on the switch.

## Components

### Mission Reader

Reads and validates `mission.json`: format `mission-rescue/1`, a title, optional English title, the agent's name, an optional stall time in minutes, and the tasks (unique numbers, titles, and a proof definition: a result file path inside the mission folder plus one check). Problems are reported with the file name and what is wrong.
File: `src/engine/mission.mjs`.
PRD ref: `prd.md > Mission Tracker`.

### Work Log Reader

Reads `worklog.jsonl`, one JSON object per line: `at` (ISO time), `event` (`started`, `progress`, `done`, `waiting`, `error`, `heartbeat`, `note`), optional `task`, and event details (`proof` for done, `reason`/`until`/`question` for waiting, `message` for error). Broken lines are skipped and reported with their line number; valid lines still count.
File: `src/engine/worklog.mjs`.
PRD ref: `prd.md > Mission Tracker`, `prd.md > States and Boundaries`.

### Proof Engine

For each task, finds the latest "done" event and checks it: the declared file must be the mission's proof file, the file must exist, its SHA-256 must equal the declared one, and the mission's check must pass. Checks: `contains` (the file contains a text), `json` (a value at a path equals what is expected), `nonEmpty`. Task states: `verified`, `claimed-no-proof`, `proof-missing`, `proof-mismatch`, `check-failed`, `in-progress`, `failed`, `not-started`. It never runs commands; it only reads files.
File: `src/engine/proof.mjs`.
PRD ref: `prd.md > Proof Engine`.

### Stall Detector

Gives one verdict per mission from the task states, the events and the current time. Progress = the time of the latest proven task (or the first start, if nothing is proven yet). Activity = the time of the latest event of any kind. In order:
1. every task verified → `complete` (green);
2. any task with a proof problem → `proof-problem` (red);
3. no events → `not-started` (grey);
4. last event is an error → `likely-failure` (red), with the message;
5. last event is waiting for a limit → `waiting-limit` (yellow), with the reset time; if the reset time passed longer ago than the stall time → `likely-failure` ("the limit came back, the agent did not");
6. last event is waiting for a person → `waiting-human` (teal), with the question;
7. no progress for longer than the stall time: if there was activity within the stall time → `no-progress` (red), otherwise → `likely-failure` (red: started task, silence, no reason);
8. otherwise → `working` (yellow).
Stall time: the mission's `stallMinutes`, default 30.
File: `src/engine/stall.mjs`.
PRD ref: `prd.md > Stall Detector`.

### Rescue Planner

Builds the plan whenever the mission is not complete: checkpoint (the highest task number such that every task up to it is verified), missing tasks, uncertain tasks (in progress, claimed without proof, proof problems) with the exact check to run before repeating them (file to look for, check to pass), and the resume instruction in Polish and English. The instruction lists: what not to repeat, what to check first and how, what to do next in order, and the logging rule (each finished task gets a "done" line with its file and SHA-256).
File: `src/engine/rescue.mjs`.
PRD ref: `prd.md > Mission Rescue`.

### Limit Guardian

Reads `data/limits.demo.json` (label DEMO) and `data/limits.auto.json` (written by the status-line script; label ZWERYFIKOWANE AUTOMATYCZNIE while younger than 30 minutes, then NIEAKTUALNE with its age). The screen adds limits typed by hand from the browser's storage (label RĘCZNE). Each entry: plan name, window (5h, 7d), percent used, reset time, source, capture time.
The status-line script `tools/claude-statusline.mjs` reads Claude Code's status-line JSON from its input, takes `rate_limits.five_hour` and `rate_limits.seven_day` (`used_percentage`, `resets_at`), writes `data/limits.auto.json`, and prints a one-line status. Without those fields it writes nothing.
Files: `src/engine/limits.mjs`, `tools/claude-statusline.mjs`.
PRD ref: `prd.md > Limit Guardian`.

### Mission Analyzer

Puts it together for one mission folder (reader → log → proofs → verdict → rescue) and for the list (a short summary per folder). A folder that cannot be read becomes a card with the problem; it never breaks the list.
File: `src/engine/analyze.mjs`.
PRD ref: `prd.md > The Core Journey`, `prd.md > States and Boundaries`.

### Local Server

`node:http` on `127.0.0.1:4317` (only this computer can connect). Routes: `GET /` and the screen's files from `web/`; `GET /api/missions`; `GET /api/missions/<id>`; `GET /api/limits`. Read-only, JSON with `Cache-Control: no-store`, mission ids limited to folder names inside the missions folder (no `..`), unknown paths → 404.
File: `src/server.mjs`.
PRD ref: `prd.md > States and Boundaries` (privacy and boundaries).

### Command Center Screen

`web/index.html`, `web/app.mjs` (asks the server, draws the missions list and the mission view, `#/m/<id>` in the address for the open mission), `web/i18n.mjs` (all Polish and English texts, including every verdict's "Co się stało" and "Co zrobić"), `web/styles.css`, `web/beacon.mjs` (the 3D beacon, loaded after the first draw, with a flat fallback). Buttons: open mission, back, "Sprawdź ponownie", Copy (clipboard, with a select-the-text fallback), PL/EN, add a manual limit.
PRD ref: `prd.md > Screens and Layout`, `prd.md > Polish Command Center`, `prd.md > Look and Feel`.

### Sample Missions and the Sample Agent

- `samples/weekly-report/`: the jury mission "Raport tygodniowy z danych testowych" (fictional orders of a fictional shop) with 7 tasks: read the data, validate it, compute totals, write the summary, prepare chart data, self-check the results, write the final report. Each task's result is computed by `src/demo/tasks.mjs` from the fictional input, and each has a real check.
- Small extra samples for the other verdicts: waiting for a limit, waiting for you, no progress.
- `scripts/demo-reset.mjs`: rebuilds `missions/` from the samples: runs tasks 1–3 for real, writes their files and "done" lines with real fingerprints, then a "started" line for task 4, with times relative to now (silence of about two hours).
- `scripts/demo-agent.mjs <mission> [--delay ms]`: reads the mission's rescue plan through the engine, checks the uncertain task's effects first (if the file is there and passes, it only logs it; otherwise it redoes the task), then computes the missing tasks in order and logs each with its fingerprint. Labelled everywhere as a sample agent.
PRD ref: `prd.md > What We're Building`, `prd.md > Mission Rescue`.

### Agent Protocol Guide

`docs/AGENT_PROTOCOL.md` (English and Polish): how any agent writes the mission file and the work log so Mission Rescue can check it, with a copy-paste example.
PRD ref: `prd.md > What We're Building`.

## Data Model

| Data | Where it lives | Updated by | When Daniel comes back |
|---|---|---|---|
| Mission (tasks, proofs) | `missions/<id>/mission.json` | the agent (or demo-reset) | re-read on every check |
| Work log | `missions/<id>/worklog.jsonl` | the agent appends lines | re-read on every check |
| Results (proof files) | `missions/<id>/out/…` | the agent | re-read and re-fingerprinted on every check |
| Fictional input data | `missions/<id>/input/…` | demo-reset | unchanged |
| Demo limits | `data/limits.demo.json` | shipped with the app | unchanged |
| Automatic limits | `data/limits.auto.json` | the status-line script | re-read; label depends on age |
| Manual limits | browser storage (`mr.manualLimits`) | the screen's form | stays in this browser only |

Mission Rescue itself writes nothing about missions. `missions/` and `data/limits.auto.json` are kept out of git; samples are in git.

## File Structure

```
mission-rescue/                (project folder: 05-basics-learn-ai)
├── START.cmd                  # Windows: start the server and open the browser
├── package.json               # name, Node version, npm scripts (no dependencies)
├── README.md                  # English + Polish: what it is, how to run, how to demo
├── LICENSE                    # MIT
├── src/
│   ├── server.mjs             # Local Server
│   ├── engine/
│   │   ├── mission.mjs        # Mission Reader
│   │   ├── worklog.mjs        # Work Log Reader
│   │   ├── proof.mjs          # Proof Engine
│   │   ├── stall.mjs          # Stall Detector
│   │   ├── rescue.mjs         # Rescue Planner
│   │   ├── limits.mjs         # Limit Guardian (reading)
│   │   ├── analyze.mjs        # Mission Analyzer
│   │   └── files.mjs          # safe file access inside a mission folder
│   └── demo/
│       └── tasks.mjs          # the 7 sample tasks' real computations
├── web/
│   ├── index.html
│   ├── app.mjs                # Command Center Screen
│   ├── i18n.mjs               # Polish and English texts
│   ├── styles.css
│   ├── beacon.mjs             # 3D status beacon + fallback
│   ├── fonts/                 # Bricolage Grotesque, IBM Plex Sans, IBM Plex Mono (OFL)
│   └── vendor/three.module.min.js   # three.js 0.160.0 (MIT)
├── samples/                   # sample missions (fictional data)
├── missions/                  # working missions (created by demo-reset; not in git)
├── data/limits.demo.json      # demo limits (limits.auto.json is not in git)
├── scripts/
│   ├── demo-reset.mjs
│   └── demo-agent.mjs
├── tools/claude-statusline.mjs
├── docs/AGENT_PROTOCOL.md
├── test/                      # node --test
└── devpost/                   # Devpost learning workspace (scope, prd, spec, checklist, app map)
```

## External Services and Dependencies

- **None at runtime.** No network calls, no keys, no accounts, no cost.
- **three.js 0.160.0**, vendored file, MIT: https://github.com/mrdoob/three.js/blob/dev/LICENSE . Downloaded once from the npm registry during the build.
- **Fonts** (SIL Open Font License), vendored: Bricolage Grotesque, IBM Plex Sans, IBM Plex Mono (Google Fonts sources).
- **Claude Code status line** (optional, local): Claude Code runs our script with JSON on its input; documented fields `rate_limits.five_hour.used_percentage`, `rate_limits.five_hour.resets_at`, `rate_limits.seven_day.used_percentage`, `rate_limits.seven_day.resets_at` (reset times in Unix seconds). https://code.claude.com/docs/en/statusline

## Important Failure Modes

- **Broken mission file** → that mission's card says "Nie mogę przeczytać misji" with the file name and the reason; the other missions still work.
- **Broken lines in the work log** → skipped and listed with line numbers under the mission; the verdict uses the valid lines.
- **No WebGL** → a flat glowing lamp in the same colour instead of the 3D beacon.
- **Clipboard blocked** → the instruction text gets selected so it can be copied by hand.
- **Port 4317 busy** → the server says so in plain words and how to start it on another port.

## What Was Simplified and Why

- **One missions folder** instead of picking any folder in the browser: a browser cannot hand a folder path to a local program; a fixed folder keeps it simple. Picking any folder would need a folder-access permission flow per browser.
- **"Sprawdź ponownie" button** instead of watching files live: same result, visible timing, no background process.
- **Fingerprints and simple checks** instead of running test commands: Mission Rescue never executes anything, which is safer and matches "never repeat uncertain operations blindly". Running real test suites would need sandboxing.
- **Manual limits in the browser** instead of a settings file: no write access needed on the computer.
- **One sample domain** (a fictional weekly report): enough to prove the kernel; real agent formats come later through adapters.

## Decisions and Open Issues

Daniel's decisions (from `prd.md > Product Decisions`): green only with verified proof; detect lack of progress, not silence; tell failure from waiting; rescue writes instructions and never repeats uncertain operations blindly; limits always labelled; real red-to-green flow, not an animation; no chat automation; function and tests before looks.

Agent recommendations waiting for Daniel's OK: local Node.js app with zero packages; one missions folder; three.js saved in the project for the beacon; port 4317; stall time 30 minutes by default; automatic limits count as verified for 30 minutes.

The useful unknown (Daniel's own question, 21 Oct): "Can it show my limits without me typing them and without logging in to my accounts?" Clarified: logging in to chat sites is out (terms), but Claude Code's official status line passes the 5-hour and 7-day percentages to a script; Mission Rescue saves and labels them. Check during the build: the script is tested with the documented status-line input. Using it with his real Claude Code changes his Claude Code settings, so it is done only if he agrees.

Open issues: none blocking. PRD assumptions A1–A7 are confirmed together with this spec.
