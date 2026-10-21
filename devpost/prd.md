---
doc: prd
status: approved
---

# Mission Rescue — Product Requirements

Mission Rescue (Czytnik Roboty Agentów) is a Polish command center for one person who runs AI agents. It really reads an agent's mission and work log from local files, shows what was really done and how well it is proven, catches a mission that stopped and explains why (with how sure it is), and gives a safe plan to resume it until every task is green with proof.
Source: `scope.md > The Unique Kernel`, `scope.md > The Core Loop`.

Approval: 21 Oct 2026, 15:23. Daniel reviewed the plan ("the direction is very good"), asked for five improvements (real mission reading, four proof levels, a smarter stall detector with confidence, safe rescue, a real end-to-end demo with failure tests), which this version applies, and asked to carry out the next stages on his own authority. The first version (same day) listed assumptions A1–A7; they are resolved under Product Decisions.

## The Core Journey

Develops `scope.md > The Core Loop` and `scope.md > What "Working" Looks Like`.

1. Daniel opens Mission Rescue: on his computer through the small local program (start file), or in the browser at the public demo address. The jury can do the same without installing anything.
2. He chooses where the missions come from: the built-in sample missions, the missions folder on his computer (through the local program), or a folder he picks in the browser. In every case the files are read on his own device; nothing is uploaded.
3. The missions list shows a card per mission: colour, verdict and "X z Y potwierdzone".
4. He opens the jury mission "Raport tygodniowy" (7 tasks). Mission Rescue reads the real mission file, the real work log and the real result files. Tasks 1–3 are proven (declared, file present, file verified). Task 4 was started; its result file exists but is incomplete, and the agent never reported it done: its effect is uncertain. Tasks 5–7 were not started.
5. The verdict is red, "Prawdopodobna awaria", with the concrete reason, the facts behind it and the confidence of the diagnosis.
6. The rescue panel shows the last confirmed checkpoint (task 3), the remaining tasks (4–7), "first check whether task 4 already happened" with the exact check, and a ready resume instruction with a Copy button.
7. The agent receives the instruction from Daniel and continues. In the demo, the sample agent really does it: it checks task 4's effect first (the file is incomplete, so it redoes task 4), computes tasks 5–7 from the fictional data, writes the result files and logs each one with its SHA-256.
8. He presses "Sprawdź ponownie". Everything is read and checked again: 7 of 7 proven, green "Misja zakończona i potwierdzona dowodami".
9. The honesty test: if a proven file is changed, deleted or replaced with a wrong result, the next check turns that task and the mission red, with the exact reason.
10. All along, the Limit Guardian shows each plan's limits and reset times with their source: demo, manual, automatically verified, or out of date.

## Screens and Layout

One page with two views, built phone-first.

- **Missions list (start):** a header with the name, the source switch (sample missions / this computer's missions folder / pick a folder) and PL/EN; one card per mission; the Limit Guardian panel. Empty or unreadable sources get a short guide.
- **Mission view:** a back link; the mission card with the 3D status beacon, the verdict, the confidence, "Co się stało" and "Co zrobić", and the facts behind the diagnosis; the task list, where each task shows its four proof levels and expands to show file, fingerprints and check; the rescue panel with Copy; the Limit Guardian panel; the "Sprawdź ponownie" button. For the built-in sample missions only: "Uruchom przykładowego agenta", "Test uczciwości" (change a proven file) and "Przywróć przykład".

## Look and Feel

From `scope.md > Inspiration & Identity` and Daniel's words (15:04 and 15:23):
- "Modern, attractive, polished PL/EN interface. A subtle 3D element, beautiful cards, readable statuses, excellent phone use. But the look must not replace real operation."
- "Simple to use, attractive"; "a nice, clear app"; "in our modern style" (the team's 3D demo websites).
- Status colours carry the meaning and always come with a text label: green = proven, yellow = waiting, unproven or uncertain, red = stopped or proof failed, teal = waiting for you, grey = not started or undetermined.
- One subtle 3D status beacon that glows the mission's colour. It never covers text and stops moving for reduced-motion users.
- Polish by default, English on a switch. Plain words, short bold labels, no walls of text.

## Features and Behavior

### Mission Tracker

Implements `scope.md > The POC Boundary` item 1 and Daniel's improvement 1 (real mission reading).

Really reads a mission folder: the mission file (the tasks from A to Z, for each task the result file and the condition it must pass, and optionally an external effect), the agent's work log (one line per event: started, progress, done, waiting, error, heartbeat, note) and the result files. Sources: built-in samples (in the page), the local program's read-only missions folder, or a folder picked in the browser. All reading happens on the user's device; Mission Rescue makes no network requests except to load itself, and never uploads files.

- [ ] The jury sample is read from real files: 7 tasks, 1–3 proven, 4 started with an incomplete file, 5–7 not started, "3 z 7 potwierdzone".
- [ ] The same mission written to a real folder on disk gives the same result through the local program and through a picked folder.
- [ ] A broken mission file gives a clear message with the file name and the problem; broken log lines are listed with their line numbers; the other missions still work.

### Proof Engine

Implements `scope.md > The POC Boundary` item 2 and Daniel's improvement 2.

Each task is judged on four separate levels:
1. **Zgłoszone** (declared): the agent logged "done" for the task, with the result file and its SHA-256.
2. **Plik istnieje** (file exists): the result file is really there.
3. **Artefakt zweryfikowany** (artifact verified): its SHA-256 matches the declared one and the mission's condition passes (the file contains a required text, a JSON value equals the expected one, or the file is not empty).
4. **Efekt zewnętrzny** (external effect): only for tasks whose result is outside the computer (for example "send the offer"). A file's fingerprint cannot prove that; the effect counts only when it is independently confirmed. In this version: a person checks the outside system and confirms it in Mission Rescue (labelled as a human confirmation, tied to that exact file). Otherwise the task stays yellow "Efekt niepotwierdzony".

A task is green only when every level that applies is met. Task states: proven, declared without result info, result file missing, fingerprint mismatch, wrong result (condition failed), result present but not declared (uncertain effect), external effect unconfirmed, in progress, failed, not started.

- [ ] Declared without a result file shows "Brak pliku wyniku" (red).
- [ ] A proven file changed afterwards shows "Odcisk się nie zgadza" (red).
- [ ] A file with the declared fingerprint but a wrong result shows "Wynik nieprawidłowy" with the failed condition (red).
- [ ] A result file present but never declared shows "Efekt niepewny" (yellow), never green.
- [ ] A task with an external effect stays "Efekt niepotwierdzony" until a person confirms it; changing the file afterwards voids the confirmation.
- [ ] The mission is green only when every task is green.

### Stall Detector

Implements `scope.md > The POC Boundary` item 3 and Daniel's improvement 3.

Progress means a new proven result. Heartbeats, notes and "I'm still working" messages are not progress. Thirty minutes of silence is not automatically a failure: the waiting time scales with the task's expected duration, and a short silence is reported as undetermined, not as a failure. Every verdict shows the concrete reason, the facts it used, and a confidence level (wysoka, średnia, niska):

- **Prawdopodobna awaria** (likely failure, red): the agent reported an error; or it went silent mid-task for well past the expected time with no stated reason; or a limit came back and the agent did not.
- **Brak postępu** (no progress, red): the agent keeps sending signs of life, but nothing new has been proven for well past the expected time.
- **Czeka na limit** (waiting for a limit, yellow): the agent said so, or it went silent while its plan's limit is used up with a future reset time; the reset time is shown.
- **Czeka na Ciebie** (waiting for you, teal): the agent asked a question; the question is shown.
- **Pracuje** (working normally, yellow): recent progress or recent activity within the expected time.
- **Stan nieustalony** (undetermined, grey): silence longer than expected but too short to call; Mission Rescue says what to check.
- **Czeka na Twoje potwierdzenie** (waiting for your confirmation, teal; added during the build): the agent's results are verified and only an outside effect is left for a person to confirm, so the agent is neither "working" nor "stalled".
- **Zakończona** (complete, green) and **Problem z dowodem** (proof problem, red) come from the Proof Engine.

The mission list shows what needs attention first; finished missions go to the bottom.

- [ ] The jury sample shows "Prawdopodobna awaria" with the facts (last proven task 3, task 4 started, incomplete file, silence of about two hours, no stated reason) and a high confidence.
- [ ] Silence slightly longer than expected shows "Stan nieustalony" with low confidence, not a failure.
- [ ] Only heartbeats after the last proven task, for well past the expected time, shows "Brak postępu".
- [ ] "Waiting for a limit" in the log shows "Czeka na limit" with the reset time; silence while the plan's limit is used up shows "Czeka na limit" with medium confidence; silence long after the reset shows "Prawdopodobna awaria".
- [ ] A question in the log shows "Czeka na Ciebie" with the question.
- [ ] A finished agent whose last task only needs a person's confirmation shows "Czeka na Twoje potwierdzenie" with where to check.

### Mission Rescue

Implements `scope.md > The POC Boundary` item 4 and Daniel's improvement 4.

Whenever a mission is not complete, the rescue panel shows the last confirmed checkpoint (the highest task such that all tasks up to it are proven), the remaining tasks, and for each remaining task what to do:
- **Najpierw sprawdź, czy już się wykonało** (check first) for every task whose effect is uncertain (started, present but undeclared, declared with a failed proof, or an external effect): the exact check (which file, which condition, or which outside system to look at), and what to do for each outcome. An operation with an unknown effect is never simply repeated.
- **Zrób** (do) for tasks not started, in order.
- **Potwierdź** (confirm) for external effects waiting for a person.
It also gives a ready resume instruction in Polish (English on the switch) with a Copy button, including the rule for logging each result with its fingerprint. In this version Daniel passes the instruction to the agent himself; Mission Rescue never runs agents or edits mission files.

- [ ] For the jury sample: checkpoint task 3; remaining 4–7; task 4 "Najpierw sprawdź" with its file and condition; 5–7 "Zrób".
- [ ] Copy copies exactly the instruction shown.
- [ ] The sample agent follows the same plan and the mission ends 7 of 7 green after "Sprawdź ponownie".

### Limit Guardian

Implements `scope.md > The POC Boundary` item 5.

Shows each plan's limits (for example the 5-hour and 7-day windows): percent used, reset time, and the source, always labelled:
- **DEMO:** sample numbers.
- **RĘCZNE** (manual): typed by Daniel in the app; stay in that browser.
- **ZWERYFIKOWANE AUTOMATYCZNIE** (automatically verified): written by a small script fed by the official Claude Code status line, captured within the last 30 minutes.
- **NIEAKTUALNE** (out of date): automatic numbers older than 30 minutes, or any numbers whose reset time has passed; the age is shown.
Mission Rescue never logs in to chat websites to read limits.

- [ ] The sample shows DEMO numbers.
- [ ] The status-line script, fed the documented sample input, writes the limits file; the panel shows ZWERYFIKOWANE AUTOMATYCZNIE with the capture time.
- [ ] Automatic numbers older than 30 minutes show NIEAKTUALNE with their age.
- [ ] A value typed by hand shows RĘCZNE.

### Polish Command Center

Implements `scope.md > The POC Boundary` item 6.

Every verdict and task state has a one-line Polish verdict plus "Co się stało" and "Co zrobić"; the interface switches to English. Phone-first layout, light and dark themes, a subtle 3D beacon with a flat fallback.

- [ ] Every state shown in the samples has Polish and English explanations.
- [ ] The app works at phone width without sideways scrolling.
- [ ] Without WebGL the beacon becomes a flat lamp of the same colour.

### Demo and Self-Check

Implements `scope.md > What "Working" Looks Like` and Daniel's improvement 5.

- The jury sample and extra samples (waiting for a limit, waiting for you, no progress, undetermined, external effect, a broken mission file) are built from real fictional data by the same code everywhere (in the page and on disk).
- The sample agent really computes tasks 4–7 and logs real fingerprints. It runs in the page for the built-in sample and as a command for a mission on disk.
- "Test uczciwości" (built-in sample only) changes a proven result file, and the next check must catch it.
- A command-line check prints the same verdict and rescue plan for any mission folder, so agents themselves can check their claims.

- [ ] In the browser, with no installation: open the jury sample → red → run the sample agent → "Sprawdź ponownie" → green 7/7 → "Test uczciwości" → red.
- [ ] On disk: reset the samples → red → run the sample agent command → check → green 7/7.
- [ ] Automated tests cover the whole flow and the failure cases: missing file, fingerprint mismatch, wrong result, undeclared result, out-of-date limits.

## States and Boundaries

- **First use:** the built-in sample missions are shown, so the page is useful immediately.
- **Empty or unreadable source:** a short guide on what a mission folder must contain.
- **Broken input:** problems are listed with the file name and line number; valid parts still show.
- **Persistence:** Mission Rescue stores nothing about missions; every check reads the files again. Manual limits and human confirmations stay in that browser only. The built-in sample can be restored at any time.
- **Privacy and safety:** reads only the chosen source on the user's device; no uploads, no logins, no network requests for data; never edits mission files and never runs agents (the sample agent is a separate, clearly labelled demo).

## Product Decisions

Daniel's choices (scope chat, 15:04 concept, 15:23 improvements, 21 Oct 2026):
- Keep the idea and extend it: Mission Rescue (Agent Proof & Recovery), keeping "Czytnik Roboty Agentów".
- Green only after a verified result; four separate proof levels; a file fingerprint alone does not prove an outside effect.
- Detect lack of progress, not silence; 30 minutes of silence is not automatically a failure; show the reason and the confidence; heartbeat is not progress; tell a failure from waiting for a limit or a person, and admit when it is undetermined.
- Rescue: the last confirmed checkpoint, the remaining tasks, an exact resume instruction; an operation with an unknown effect is checked before it is repeated; Daniel passes the instruction to the agent in this version.
- A real end-to-end demo: 7 tasks, 3 proven, task 4 started with an uncertain effect, detection, rescue plan, the sample agent does the rest, real artifacts and proofs, 7/7 on re-check; tests for missing file, wrong fingerprint, wrong result and out-of-date limits.
- Real local reading (picked folder or a read-only local program); no private files sent to any outside server.
- Limits are always labelled demo, manual, automatically verified or out of date.
- A modern, attractive, polished PL/EN interface, subtle 3D, excellent on the phone; the look never replaces real operation.
- The jury must be able to run and check it, not only watch it.
- No chat automation, no bypassing of terms, limits or protections; zero spend.

Resolved assumptions (approved with this version): the first screen is the missions list with the built-in samples (A1); several missions can be listed (A2); PL/EN switch (A3); waiting time scales with the task, short silences are "undetermined" (A4, changed by Daniel); one 3D status beacon (A5); manual limits stay in the browser (A6); re-check by button (A7).

## What We're Building

- The missions list and the mission view described above, phone-first, PL/EN, with the 3D beacon.
- Mission Tracker, Proof Engine (four levels), Stall Detector (with confidence and "undetermined"), Mission Rescue, Limit Guardian.
- Three ways to read missions, all on the user's device: built-in samples, the local read-only program, a picked folder.
- The jury sample and the extra samples, the sample agent (in the page and as a command), "Test uczciwości", and a command-line check.
- The status-line script for automatically verified Claude Code limits.
- A free public demo address (GitHub Pages) so the jury can try it without installing anything.
- A guide for agents on how to write missions and work logs.
- Automated tests for the full flow and the failure cases.

## Deferred From the POC

- Reading his team's native agent logs and other tools' formats: needs an adapter per format.
- Automatic refresh and notifications.
- Independent confirmation of external effects through the outside system's own records (for example a provider receipt): needs per-provider integrations; this version uses a human confirmation.
- Polish summaries of English notes: needs an AI model and an allowed free route.
- Accounts, sharing and paid use.

## Possible Later Enhancements

- An agent kit that writes the work log automatically.
- History of rescues per mission.
- A team view of several agents' missions side by side.

## Non-Goals

- Logging in to chat websites or automating private chats: forbidden by their terms.
- Steering, restarting or running real agents: Mission Rescue shows the truth and writes the instruction; a person hands it over.
- Uploading or storing mission data anywhere.
- Paid APIs or services.
- Reusing old GnyPcior code.

## Open Questions

- None blocking. Whether to connect the status-line script to Daniel's real Claude Code is his decision during the build (it changes his Claude Code settings).
