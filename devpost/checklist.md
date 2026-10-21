---
doc: checklist
status: approved
---

# Build Checklist

Build mode: fast (Daniel, 21 Oct 2026, 15:23: "Realizuj kolejne bezpieczne, autoryzowane etapy samodzielnie" — carry out the next safe, authorized stages on your own; he reviews at the hands-on checkpoints)

Approval: the first build order was shown to Daniel at about 15:20; at 15:23 he approved the plan with five improvements, which reshaped slices 1–3 below, and asked to proceed without stopping.

## Slices

- [x] **1. The jury mission tells the truth: real files, red, 3 of 7 proven**
  Becomes usable: Open the page (local program or the built-in samples) and the jury mission "Raport tygodniowy" is read from real files: tasks 1–3 proven on all levels, task 4 started with an incomplete, undeclared result, tasks 5–7 not started, and a red "Prawdopodobna awaria" with its reason, facts and confidence. The command-line check prints the same.
  Why now: The kernel first (real reading, proof levels, stall diagnosis), and it bootstraps the engine, the sample builder, the local program and a first plain page.
  PRD ref: `prd.md > The Core Journey` (steps 1–5), `prd.md > Mission Tracker`, `prd.md > Proof Engine`, `prd.md > Stall Detector`
  Spec ref: `spec.md > Mission Reader`, `spec.md > Work Log Reader`, `spec.md > Proof Engine`, `spec.md > Stall Detector`, `spec.md > Mission Analyzer`, `spec.md > Sources`, `spec.md > Sample Builder and Sample Agent`, `spec.md > Local Program`, `spec.md > Command-Line Tool`, `spec.md > Command Center Screen`, `spec.md > File Structure`
  Build: Scaffold (package.json, START.cmd, folders, root index.html, .nojekyll); engine modules (paths, hash, memory source, mission, worklog, proof, stall, analyze); the weekly-report data and tasks; the sample builder (jury mission); the disk source, demo-reset and check commands; the read-only local program; a first plain page with the built-in samples and the "this computer" source; tests.
  Verify (mechanical): `node --test` passes (proof states including missing file, fingerprint mismatch, wrong result, undeclared result; the jury verdict likely-failure/high); `node tools/mission-rescue.mjs demo-reset` then `check missions/weekly-report` prints 3/7 and likely-failure; the local program serves `/workspace/index.json`; a headless browser shows "3 z 7" and the red verdict for both sources.
  Learner check: Open the page, open "Raport tygodniowy" and say whether you can tell at a glance what was really done, why it stopped, and how sure the diagnosis is.
  Commit: `Read real missions and show proof levels with a stall diagnosis`

- [x] **2. Safe rescue and a real red-to-green finish**
  Becomes usable: The rescue panel (checkpoint 3, remaining 4–7, task 4 "check first", the instruction with Copy); the sample agent finishes the mission for real in the page and on disk; "Sprawdź ponownie" shows 7 of 7 green; "Test uczciwości" turns it red again. The public demo address works for the hands-on check.
  Why now: This completes the jury demo end to end while the page is still plain, so any flaw in the flow shows up before styling.
  PRD ref: `prd.md > The Core Journey` (steps 6–9), `prd.md > Mission Rescue`, `prd.md > Demo and Self-Check`
  Spec ref: `spec.md > Rescue Planner`, `spec.md > Sample Builder and Sample Agent`, `spec.md > Command-Line Tool`, `spec.md > Command Center Screen`
  Build: The Rescue Planner (actions, checks, Polish and English instruction); the sample agent (check first, redo or declare, compute, write, log with SHA-256); the rescue panel, Copy, re-check, sample-agent and honesty-test buttons; the demo-agent command; end-to-end tests on memory and on disk; GitHub Pages switched on.
  Verify (mechanical): `node --test` passes including red → agent → green → tamper → red on memory and on a temporary disk folder; on disk `demo-agent` then `check` gives complete 7/7 and exit code 0; a headless browser on the built-in sample goes red → green → red; the public address answers with the page.
  Learner check: On your phone or computer, open the public demo, open "Raport tygodniowy", read and copy the plan, run the sample agent, press "Sprawdź ponownie", then try "Test uczciwości".
  Commit: `Add safe rescue plans and a verified red-to-green finish`

- [x] **3. Every kind of stop explained, outside effects and limits labelled**
  Becomes usable: Extra samples show "Czeka na limit" (with the reset time), "Czeka na Ciebie" (with the question), "Brak postępu", "Stan nieustalony" (low confidence), an outside effect waiting for a human confirmation, and a broken mission file; the limits panel shows DEMO, RĘCZNE, ZWERYFIKOWANE AUTOMATYCZNIE and NIEAKTUALNE; a picked folder works in Chrome/Edge.
  Why now: The detector's honest distinctions and the labelled data are part of the kernel; they come before the look.
  PRD ref: `prd.md > Stall Detector`, `prd.md > Proof Engine` (level 4), `prd.md > Limit Guardian`, `prd.md > Mission Tracker`
  Spec ref: `spec.md > Stall Detector`, `spec.md > Proof Engine`, `spec.md > Limit Guardian`, `spec.md > Sources`, `spec.md > Sample Builder and Sample Agent`
  Build: Extra samples; limits reading with labels and ages; the status-line script; manual limits and human confirmations in the page; the picked-folder source with the fallback; tests for every verdict, confidence and label (including out-of-date limits and a confirmation voided by a changed file).
  Verify (mechanical): `node --test` passes; the documented status-line sample input written through `tools/claude-statusline.mjs` produces `limits/limits.auto.json` and the panel labels it verified, and an old capture is labelled out of date; a headless browser sees every extra verdict and every label; picking a folder is checked in a headless Chromium with the folder-picker fallback.
  Learner check: Open each extra sample and say whether the reason and the confidence make sense; add a limit by hand; confirm the outside effect in the offer sample.
  Commit: `Explain every stop and label outside effects and limits`

- [x] **4. The Polish command center: modern look, PL/EN, 3D beacon, phone-first**
  Becomes usable: The finished look: beautiful cards, readable statuses, "Co się stało" and "Co zrobić" everywhere, light and dark themes, PL/EN, the 3D beacon glowing the mission's colour (flat lamp without WebGL), and comfortable use on a phone.
  Why now: Daniel's rule: real operation and tests first, the look after; the screens it styles are now final.
  PRD ref: `prd.md > Look and Feel`, `prd.md > Polish Command Center`, `prd.md > Screens and Layout`
  Spec ref: `spec.md > Look and Feel`, `spec.md > Command Center Screen`
  Build: Styles and saved fonts; complete Polish and English texts; the beacon with three.js saved in the project and its fallback; reduced motion; phone layout.
  Verify (mechanical): Headless screenshots at desktop and phone width in light and dark show no overflow and no console errors; the EN switch changes every interface text; with WebGL off the flat lamp shows; `node --test` still passes.
  Learner check: Look at it on your phone and computer and say what you would change to make it simpler or more attractive.
  Commit: `Style the command center with PL/EN, a 3D beacon and a phone layout`

- [ ] **5. Ready for others to run and check**
  Becomes usable: Anyone can open the public demo, or clone the repository and run START.cmd / `node tools/server.mjs`, replay the demo from the README (English and Polish), and teach their own agent the work-log format.
  Why now: The proof of concept must stand on its own before shipping.
  PRD ref: `prd.md > What We're Building`
  Spec ref: `spec.md > Agent Protocol Guide`, `spec.md > Where It Runs and How Someone Tries It`
  Build: README, docs/AGENT_PROTOCOL.md, LICENSE (MIT), final START.cmd and package.json scripts; fresh-clone runs on Linux and on Windows.
  Verify (mechanical): In fresh clones on Linux and on Windows: `node --test` passes, demo-reset → red, demo-agent → green through the command line; README commands run as written; the public demo passes the red → green → red check in a headless browser.
  Learner check: Follow the README's "try it" steps yourself and say if any step was unclear.
  Commit: `Add README, agent protocol guide and license`

## Hands-on Checkpoints

- [ ] Early usable behavior explored — after slice 2 (the full red-to-green flow on the public demo, phone or computer)
- [ ] Final kick-the-tires exploration and feedback completed

## Final Review

- [ ] Final review complete — feedback resolved and learner confirms ready to ship

## Code Tour and App Map

- [ ] Learning activity complete — guided route, focused alternative, prior practice connected, or brief recap
- [ ] Optional edit and transfer reflection addressed — offered/declined/already covered/not applicable as appropriate
- [ ] `devpost/app-map.html` generated from finished code, checked, and shown, including a project-grounded practice to reuse

Activity and evidence: [not started]
Route and stops: [not started]
Edit outcome: [not started]
Reflection: [not started]
Activity mode: [not started]

## Revisions

- Slice 2: GitHub Pages builds for pushes from the cloud workspace started late; a build is now also requested through the GitHub API after each push, and every slice's public check waits for the new files. Deployment detail only.
- Slice 2: the sample agent's message for a changed file ("the file changed after it was reported or holds a wrong result") was split from "the result is incomplete", so the honesty test reads correctly. The silence-threshold fact now names both of its inputs.
- Slice 3: added the verdict "Czeka na Twoje potwierdzenie" (waiting for your confirmation). The build showed that a finished agent whose last task only needs a person's confirmation of an outside effect was otherwise shown as "working". PRD and spec updated; it adds a state and changes nothing Daniel chose.
- Slice 3: the missions list puts what needs attention first; when several limit numbers describe the same plan and window, the most trusted one wins (verified automatically, then manual, then demo). Spec updated.
- Slice 3: agent texts (question, message) and agent names may be given in Polish and English; broken JSON is located by the engine itself, because Node.js gives no line for some errors. The page asks for the local program only when it was opened from this computer (no failed request on the public demo).
- Slice 4: the beacon is an industrial signal tower (stack light) whose status segment glows; "teal" statuses are shown in the signal-tower blue ("operator needed"). Fonts: Barlow Semi Condensed, IBM Plex Sans, IBM Plex Mono. Spec's Look and Feel updated.
- Slice 5: the local program writes the sample missions on its first start when the default missions folder does not exist, so `node tools/server.mjs --open` works right after cloning on any system; LICENSE holds only the MIT text (third-party licences moved to THIRD_PARTY_NOTICES.md) so GitHub recognises it.

