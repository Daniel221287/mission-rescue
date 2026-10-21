---
doc: prd
status: draft
---

# Mission Rescue — Product Requirements

Mission Rescue (Czytnik Roboty Agentów) is a Polish command center for one person who runs AI agents. It reads an agent's mission and work log from local files, shows what was really done with proof, catches a mission that stopped and explains why, and gives a safe plan to resume it until every task is green with proof.
Source: `scope.md > The Unique Kernel`, `scope.md > The Core Loop`.

## The Core Journey

Develops `scope.md > The Core Loop` and `scope.md > What "Working" Looks Like`.

1. Daniel starts Mission Rescue on his computer and it opens in the browser.
2. The first screen lists the missions it found in his missions folder (the sample mission is there from the start). Each mission is a small card with its status colour and progress.
3. He opens a mission. The command center shows the mission card: a status colour and a plain-Polish verdict, the progress counted only from proven tasks ("3 z 7 potwierdzone"), the time of the last real progress and of the last sign of life, and the list of tasks with their proof.
4. The sample mission stopped after three tasks. The card is red: "Misja stanęła w połowie". It says why: task 4 was started, nothing was delivered, and the agent went silent without saying what it waits for (a likely failure). It also shows the evidence: three tasks proven by real files, task 4 only started.
5. He opens the rescue plan: the last confirmed checkpoint (task 3), the missing tasks (4–7), task 4 marked "check its effects before repeating it" with the exact check, and a ready resume instruction with a Copy button.
6. The agent receives the instruction and delivers. In the demo, a sample agent really does tasks 4–7: it checks task 4's effects first, produces the results and records each one with its proof.
7. He presses "Sprawdź ponownie" (check again). Mission Rescue re-reads the files and verifies every new result. When all 7 tasks have verified proof, the card turns green: "Misja zakończona i potwierdzona dowodami".
8. All along, the Limit Guardian panel shows each plan's limits and reset times, labelled by where the numbers come from: manual, demo, or automatically verified.

## Screens and Layout

One page with two views.

- **Missions list (start):** a header with the name and the PL/EN switch; one card per mission (title, agent, status colour, "X z Y potwierdzone", last progress); the Limit Guardian panel. If no missions are found, a short guide says where to put a mission folder.
- **Mission view (after opening a card):** a back link; the mission card with the status beacon, verdict and plain-language explanation ("Co się stało" / "Co zrobić"); the task list (number, title, state, proof line, time; each row expands to show the proof details); the rescue panel (shown whenever the mission is not complete); the Limit Guardian panel; a "Sprawdź ponownie" button.

## Look and Feel

From `scope.md > Inspiration & Identity` and Daniel's words:
- "Clear status cards, an attractive look, subtle 3D accents and an explanation of every problem in plain language."
- "Simple to use, attractive"; "a nice, clear app"; "in our modern style" (the team's 3D demo websites).
- Status colours carry the meaning: green = proven, yellow = waiting or unproven, red = stopped or proof failed, blue-teal = waiting for you. Text labels always accompany the colour.
- Subtle 3D: one status beacon in the mission card that glows the mission's colour (assumption A5). Readability first; the 3D never covers text.
- Polish by default, English switch for the jury (assumption A3). Plain words, short bold labels, no walls of text.
- Built in this order: working flow and tests first, the look and the 3D accent after (Daniel's rule).

## Features and Behavior

### Mission Tracker

Implements `scope.md > The POC Boundary` item 1.

Reads a mission folder: the mission file (the tasks from A to Z and what counts as proof for each task) and the agent's work log (one line per event: started, progress, done, waiting, error, heartbeat, note). Shows completed steps, remaining tasks and the proof of execution.

- [ ] Opening the sample mission shows 7 tasks: tasks 1–3 proven, task 4 started without a result, tasks 5–7 not started; progress reads "3 z 7 potwierdzone".
- [ ] Each task row shows its state and, for proven tasks, the proof file and the check that passed.
- [ ] A mission folder with a missing or broken mission file shows a clear Polish message naming the file and the problem; other missions still work.

### Proof Engine

Implements `scope.md > The POC Boundary` item 2 and Daniel's rule "green only with proof".

For every task, the mission defines its proof: an output file plus a check (for example: it contains a given text, a JSON value equals what is expected, or the file is not empty). When the agent reports "done", it declares the file and its fingerprint (SHA-256). A task is green only if the file exists, its fingerprint matches the declaration, and the mission's check passes.

- [ ] A task declared done without a proof shows yellow "Zgłoszone bez dowodu", never green.
- [ ] If a proven output file is changed afterwards, the next check shows that task red "Dowód się nie zgadza" (fingerprint mismatch).
- [ ] If the proof file is missing, the task shows red "Brak pliku dowodu".
- [ ] If the file exists but fails the mission's check, the task shows red "Wynik nie przechodzi sprawdzenia", with the reason.
- [ ] The mission is green only when every task is proven.

### Stall Detector

Implements `scope.md > The POC Boundary` item 3.

Progress means a new proven result, not just log activity: heartbeats, notes and "I'm working on it" messages do not count. The detector looks at the current task (the first one not yet proven) and the latest events, and gives one verdict:

- **Prawdopodobna awaria** (likely failure, red): the last event is an error, or a task was started and the agent went silent longer than the mission's stall time without saying what it waits for.
- **Brak postępu** (no progress, red): the agent keeps sending signs of life, but nothing new has been proven for longer than the stall time.
- **Czeka na limit** (waiting for a limit, yellow): the agent said it waits for a usage limit; the reset time is shown (from the agent's entry or from the Limit Guardian).
- **Czeka na Ciebie** (waiting for a person, blue-teal): the agent asked a question; the question is shown.
- **Pracuje** (working, yellow): recent progress within the stall time.
- **Zakończona** (complete, green): every task proven.

- [ ] The sample mission shows "Prawdopodobna awaria": task 4 started, silence for longer than the stall time, no stated reason.
- [ ] A log whose last entry says the agent waits for a limit shows "Czeka na limit" with the reset time, not a failure.
- [ ] A log whose last entry is a question to the human shows "Czeka na Ciebie" with the question.
- [ ] A log with only heartbeats after the last proven task, for longer than the stall time, shows "Brak postępu".

### Mission Rescue

Implements `scope.md > The POC Boundary` item 4.

Whenever a mission is not complete, the rescue panel shows:
- the last confirmed checkpoint (the last task such that all tasks up to it are proven);
- the missing tasks;
- the uncertain tasks (started, or declared done without valid proof), each marked "Sprawdź skutki przed ponowieniem" with the exact check: which file to look for and what it must pass;
- a ready resume instruction in plain Polish (English when the switch is on) with a Copy button. It says which tasks not to repeat, which effects to check first, which tasks to do next, and that each completion must be logged with its proof.

Mission Rescue never runs anything itself and never edits the mission files.

- [ ] For the sample mission the panel shows: checkpoint = task 3; missing = 4, 5, 6, 7; task 4 marked "Sprawdź skutki przed ponowieniem" with its expected file and check.
- [ ] The Copy button copies exactly the instruction shown.
- [ ] Following the instruction (the sample agent does it for real) and pressing "Sprawdź ponownie" turns all 7 tasks and the mission green.

### Limit Guardian

Implements `scope.md > The POC Boundary` item 5.

Shows each plan's usage limits (for example the 5-hour and 7-day windows): percent used, reset time, and where the numbers come from, always labelled:
- **DEMO:** sample numbers shipped with the app.
- **RĘCZNE (manual):** typed by Daniel in the app.
- **ZWERYFIKOWANE AUTOMATYCZNIE (automatically verified):** written by a small script fed by the official Claude Code status line, recently captured. Older automatic numbers show their age and lose the "verified" label.

Mission Rescue never logs in to chat websites to read limits.

- [ ] The sample shows two plans labelled DEMO.
- [ ] Feeding the status-line script a sample status-line input writes the limits file, and the panel then shows those numbers labelled ZWERYFIKOWANE AUTOMATYCZNIE with the capture time.
- [ ] A value typed in the panel appears labelled RĘCZNE.

### Polish Command Center

Implements `scope.md > The POC Boundary` item 6.

Every state and problem has a one-line verdict and a plain-language "Co się stało" and "Co zrobić". The interface is in Polish, with an English switch.

- [ ] Every mission and task state shown in the demo has a Polish explanation of what happened and what to do.
- [ ] The English switch changes the interface text (sample task titles stay as written in the mission file, unless the file gives English titles).
- [ ] The status beacon shows the mission's colour and never covers text.

## States and Boundaries

- **First use:** the missions list shows the sample mission; if the missions folder is empty, a short guide says where to put a mission folder.
- **Mission not started:** grey "Nie rozpoczęta"; the rescue panel offers the start instruction.
- **Working, stopped, waiting, proof failed, complete:** as defined in Stall Detector and Proof Engine.
- **Broken input:** missing or invalid mission file or work log lines are reported with the file name and line number; valid parts still show.
- **What persists:** nothing about missions is stored by the app; every check re-reads the files. Manually typed limits stay in this browser only.
- **Privacy and boundaries:** runs on the user's own computer, reads only the missions folder, sends nothing out, needs no logins, never edits mission files, never runs agents.

## Product Decisions

Daniel's choices (scope chat and his written concept, 21 Oct 2026):
- Name: Mission Rescue (Agent Proof & Recovery), keeping "Czytnik Roboty Agentów" — he extended the approved idea instead of starting over.
- Green only after a verified result — his main rule.
- Detect a lack of progress, not just silence; tell a failure from waiting for a limit or a person.
- Rescue writes a concrete resume instruction and never repeats uncertain operations without checking their effects.
- Limits are always labelled manual, demo, or automatically verified.
- The jury demo: 7 tasks, 3 done, a stop, red, evidence, rescue plan, verified delivery, green, and it must really work, not be an animation.
- No automation of private chats through disallowed workarounds.
- Working flow and tests first, the look and extras after.
- Simple to use, attractive, Polish, subtle 3D, in the team's modern style.

Assumptions, waiting for Daniel's confirmation:
- **A1:** The first screen is the missions list, with the sample mission already there.
- **A2:** Several missions can be listed; the demo focuses on one.
- **A3:** A PL/EN switch, so the jury can read the interface (the rules require English or a translation).
- **A4:** Default stall time: 30 minutes without progress; a mission file can set its own.
- **A5:** The 3D accent is one status beacon that glows the mission's colour.
- **A6:** Manually typed limits stay in this browser only.
- **A7:** Re-checking happens when he presses "Sprawdź ponownie" (no automatic refresh yet).

## What We're Building

- The missions list and the mission view described above.
- Mission Tracker, Proof Engine, Stall Detector, Mission Rescue, Limit Guardian, with every acceptance criterion above checkable on screen and by automated tests.
- A real sample mission (7 tasks, fictional data, stopped after task 3) and a sample agent that really completes tasks 4–7 with proofs, plus a reset to the stopped state.
- A small status-line script for automatically verified Claude Code limits.
- A short guide for agents: how to write the mission file and the work log so Mission Rescue can check them.
- Tests for the whole red-to-green flow.

## Deferred From the POC

- Reading his team's native agent logs and other tools' formats: needs an adapter per format; the kernel is proven with one clear format first.
- Automatic refresh and phone notifications: polish, not needed to prove the kernel.
- Picking a mission folder anywhere on the disk from the browser: missions live in one missions folder for now.
- Polish summaries of English notes: needs an AI model and an allowed free route.
- Accounts, sharing and paid use: far beyond a proof of concept.

## Possible Later Enhancements

- An "agent protocol" kit his own agents can follow by default.
- A phone view of the missions list.
- History of rescues per mission.

## Non-Goals

- Logging in to chat websites or automating private chats: forbidden by their terms.
- Steering, restarting or running agents: Mission Rescue shows the truth and writes the instruction; a person hands it over.
- Cloud storage or any upload of mission data.
- Paid APIs.
- Reusing old GnyPcior code.

## Open Questions

- Assumptions A1–A7 above: confirm before `4-spec` is approved (a single "OK" covers them).
