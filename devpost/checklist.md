---
doc: checklist
status: draft
---

# Build Checklist

Build mode: [to be chosen by Daniel: learn or fast]

## Slices

- [ ] **1. The sample mission tells the truth: red, 3 of 7 proven**
  Becomes usable: Start the app and see the missions list; open "Raport tygodniowy": 7 tasks, tasks 1–3 proven with their files and checks, task 4 only started, and a red "Prawdopodobna awaria" verdict with a plain explanation.
  Why now: The kernel first (proof and stall detection on a real mission), and it bootstraps everything else: the engine, the local server, the sample mission and a first screen.
  PRD ref: `prd.md > The Core Journey` (steps 1–4), `prd.md > Mission Tracker`, `prd.md > Proof Engine`, `prd.md > Stall Detector`
  Spec ref: `spec.md > Mission Reader`, `spec.md > Work Log Reader`, `spec.md > Proof Engine`, `spec.md > Stall Detector`, `spec.md > Mission Analyzer`, `spec.md > Local Server`, `spec.md > Command Center Screen`, `spec.md > Sample Missions and the Sample Agent`, `spec.md > File Structure`
  Build: Scaffold per the file structure (package.json, START.cmd, folders); write the mission and work-log readers, the Proof Engine and the Stall Detector; the sample tasks and demo-reset; the analyzer and the read-only server; a first plain screen with the list and the mission view; tests for proof states and the stall verdicts.
  Verify (mechanical): `node --test` passes (verified, claimed without proof, missing, mismatch, check failed; likely failure for the sample); after `node scripts/demo-reset.mjs` and starting the server, `GET /api/missions/weekly-report` returns 3 of 7 verified and `likely-failure`; a headless browser check shows "3 z 7" and the red verdict.
  Learner check: Double-click START.cmd, open "Raport tygodniowy" and say whether you can tell at a glance what was really done and why it stopped.
  Commit: `Show the sample mission with proofs and a red stall verdict`

- [ ] **2. Rescue plan and a real red-to-green finish**
  Becomes usable: The rescue panel shows checkpoint 3, missing 4–7, task 4 "Sprawdź skutki przed ponowieniem" and a resume instruction with Copy; after the sample agent runs and "Sprawdź ponownie" is pressed, the mission is green 7 of 7; changing a proven file afterwards turns it red again.
  Why now: This completes the jury demo end to end while everything is still plain, so any problem in the flow shows up before styling.
  PRD ref: `prd.md > The Core Journey` (steps 5–7), `prd.md > Mission Rescue`, `prd.md > Proof Engine`
  Spec ref: `spec.md > Rescue Planner`, `spec.md > Sample Missions and the Sample Agent`, `spec.md > Command Center Screen`
  Build: The Rescue Planner and its Polish/English instruction; the sample agent (checks task 4's effects first, then computes tasks 4–7 and logs real fingerprints); the rescue panel, Copy and "Sprawdź ponownie" on the screen; an end-to-end test of red → agent → green → tampered file → red.
  Verify (mechanical): `node --test` passes including the end-to-end flow on a temporary copy; on the running app the API goes from `likely-failure` 3/7 to `complete` 7/7 after `node scripts/demo-agent.mjs weekly-report`; a headless browser check sees red, then green after re-check.
  Learner check: Open the sample, press Copy and paste the plan somewhere to read it, run the sample agent, press "Sprawdź ponownie" and watch it turn green.
  Commit: `Add the rescue plan and a verified red-to-green finish`

- [ ] **3. Every kind of stop explained, every limit labelled**
  Becomes usable: Extra sample missions show "Czeka na limit" with the reset time, "Czeka na Ciebie" with the agent's question, and "Brak postępu"; the limits panel shows DEMO numbers, numbers from the status-line script labelled ZWERYFIKOWANE AUTOMATYCZNIE, and numbers typed by hand labelled RĘCZNE.
  Why now: The detector's distinctions and the honest limit labels are part of the kernel; they come before the look.
  PRD ref: `prd.md > Stall Detector`, `prd.md > Limit Guardian`
  Spec ref: `spec.md > Stall Detector`, `spec.md > Limit Guardian`, `spec.md > Sample Missions and the Sample Agent`
  Build: Extra samples for limit, human and no-progress; the limits reader and the status-line script; the limits panel with labels and the manual form; tests for every verdict and every label (fresh and old automatic data).
  Verify (mechanical): `node --test` passes; feeding the documented status-line sample JSON to `tools/claude-statusline.mjs` writes `data/limits.auto.json` and `GET /api/limits` returns it labelled verified; a headless browser check sees all three labels and the three extra verdicts.
  Learner check: Open the three extra missions and say whether each explanation is clear; look at the limits panel and add one limit by hand.
  Commit: `Explain every stop and label every limit source`

- [ ] **4. The Polish command center: look, English switch, 3D beacon**
  Becomes usable: The finished look: clear cards, big status words, "Co się stało" and "Co zrobić" for every state, light and dark themes, the PL/EN switch, and the 3D status beacon glowing the mission's colour (flat lamp without WebGL).
  Why now: Daniel's rule: working flow and tests first, the look after; the screens it styles are now final.
  PRD ref: `prd.md > Look and Feel`, `prd.md > Polish Command Center`, `prd.md > Screens and Layout`
  Spec ref: `spec.md > Look and Feel`, `spec.md > Command Center Screen`
  Build: Styles and saved fonts; complete Polish and English texts; the beacon with three.js saved in the project and the fallback; reduced-motion handling.
  Verify (mechanical): Headless browser screenshots at desktop and phone width in light and dark show no overflow and no console errors; the EN switch changes the interface texts; with WebGL disabled the flat lamp appears; `node --test` still passes.
  Learner check: Look at the app and say what you would change to make it simpler or more attractive.
  Commit: `Style the command center with PL/EN and a 3D status beacon`

- [ ] **5. Ready for others to try**
  Becomes usable: Someone else can clone the repository, read the README (English and Polish), run START.cmd or `node src/server.mjs`, replay the demo, and teach their own agent the work-log format from the protocol guide.
  Why now: The proof of concept must stand on its own before shipping; this is the last usable increment.
  PRD ref: `prd.md > What We're Building`
  Spec ref: `spec.md > Agent Protocol Guide`, `spec.md > Where It Runs and How Someone Tries It`
  Build: README, docs/AGENT_PROTOCOL.md, LICENSE (MIT), final START.cmd, package.json scripts; a fresh-copy run of the whole demo.
  Verify (mechanical): In a fresh copy of the repository: `node --test` passes, demo-reset → red, demo-agent → green through the API; README commands run as written.
  Learner check: Follow the README's "try it" steps yourself and say if any step was unclear.
  Commit: `Add README, agent protocol guide and license`

## Hands-on Checkpoints

- [ ] Early usable behavior explored — after slice 2 (the full red-to-green flow on the plain screen)
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

