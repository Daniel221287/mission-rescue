---
doc: scope
status: approved
---

# Mission Rescue: Agent Proof & Recovery (Czytnik Roboty Agentów)

A Polish command center that shows the truth about an AI agent's work: what was really done (with proof), where and why the agent stopped, and how to safely resume the mission until it is confirmed complete.

Revision history:
- 21 Oct 2026, 14:53: first version approved by Daniel ("Plan lux"), as "Czytnik Roboty Agentów" (agent work reader + AI limit guard).
- 21 Oct 2026, 15:04: Daniel extended it into "MISSION RESCUE — Agent Proof & Recovery" in his own written concept. The approved kernel stays; this revision adds proof checking and mission recovery.
- 21 Oct 2026, 15:23: Daniel reviewed this revision ("the direction is very good; we don't change the idea"), asked for five technical improvements (real mission reading, four proof levels, a smarter stall detector with a confidence level, safe rescue, a real end-to-end demo with failure tests) and a product the jury can run, and asked to proceed through the build. Approved with those changes.

## The Unique Kernel

In Daniel's words (14:50): "What annoys me most is when it stops working although it had a mission from A to Z: it finishes only part of it, and then waits for who knows what."

And his main rule (15:04): "I don't want another agent that promises to work from A to Z and disappears after the third step. I want a tool that can show the truth about the agents' work, help recover an interrupted mission and bring it to a confirmed completion."

So the heart of Mission Rescue: catch a mission that stopped halfway, prove what was really done, and lead it back to a finish that is confirmed by evidence. Green only with proof.

The tools we came across for watching agents and limits (status-line scripts, command-line usage trackers) are built for programmers, in English, and they count usage, not unfinished missions or proof of work.

## Who It's For

Daniel. He runs several AI agents on his regular subscriptions (Claude, ChatGPT and others) and hands them tasks for the team in the evening: writing software, searching, checking. They leave a lot of files behind ("we have a ton of that"), mostly in English, which he does not read comfortably. Today he finds out what happened by asking the agents or digging through those files, and an agent that says "done" is hard to check.

Later: other people who run several AI agents.

## The Core Loop

1. He opens Mission Rescue and loads a mission: the agent's local mission file and work log.
2. He sees the truth at a glance: which tasks are done with proof, which were only declared, what is left.
3. If the mission stopped, he sees why, in plain Polish: a likely failure, waiting for a limit, waiting for a person, or no progress.
4. He takes the rescue plan (last confirmed checkpoint, missing steps, a ready resume instruction) and gives it to the agent.
5. After the agent delivers, he checks again. The mission turns green only when every task has verified proof.

## Inspiration & Identity

- "A nice, clear app" and "simple to use, attractive" (his words).
- "Clear status cards, an attractive look, subtle 3D accents and an explanation of every problem in plain language" (his words, 15:04).
- "In our modern style" (his words): the team's 3D demo websites (Ciao Bella, BRYŁA). Subtle 3D only, so the status stays readable. The style is rebuilt from scratch: old code cannot be reused here, while public libraries (for example three.js) are fine.
- Polish everywhere, scannable at a glance: green, yellow and red, numbers, short bold labels, no walls of text.
- References: the team's 3D demo websites named above; links to be added in the PRD.

## Why This Matters to the Learner

In his words: reading the workspaces, "we have a ton of that". He has been building his agent system, GnyPcior, for more than two months and works with agents every day. Agents that stop halfway and wait for who knows what cost him the most. He wants the truth about the work and a way back to a confirmed finish.

## What "Working" Looks Like

The jury demo, in Daniel's words (15:04): "The agent has a mission with seven tasks. It completed three and stopped. The program loads a real sample log, detects the break, shows a red status, presents the evidence and generates a resume plan. After the verified results of the remaining tasks are delivered, it shows a green status."

"This whole flow has to really work, not be just an animation."

## The POC Boundary

The six parts of his concept, each kept small but real:

1. **Mission Tracker:** really reads a local mission file and work log (built-in samples, a folder on his computer through a read-only local program, or a folder picked in the browser; nothing is uploaded); shows completed steps, remaining tasks and proof of execution.
2. **Proof Engine:** four separate levels: declared, file exists, artifact verified (SHA-256 and the task's condition), and an external effect only when it is independently confirmed. A file's hash alone does not prove that something happened in the real world. Nothing turns green without proof.
3. **Stall Detector:** detects a lack of progress, not just silence; 30 minutes of silence is not automatically a failure; tells a likely failure from no progress, waiting for a limit, waiting for a person, normal work and an undetermined state, with the concrete reason and a confidence level. A heartbeat is not progress.
4. **Mission Rescue:** shows the last confirmed checkpoint, the remaining tasks and an exact resume instruction. When an operation's effect is unknown, it first checks whether the operation already happened; it never blindly repeats it. In this version the user hands the instruction to the agent.
5. **Limit Guardian:** shows limits and reset times, and clearly labels data as manual, demo, automatically verified, or out of date.
6. **Polish command center:** a modern, attractive PL/EN interface, clear status cards, subtle 3D, excellent on the phone, and every problem explained in plain language. The look never replaces real operation.

Plus: a real sample mission (7 tasks; 1–3 proven; task 4 started with an uncertain effect) and a sample agent that really delivers the remaining results, so the red-to-green flow runs for real; tests for a missing file, a wrong fingerprint, a wrong result and out-of-date limits; and a free public demo address, so the jury can run and check it, not only watch it. Working end to end with tests first; the look and extras after. Zero spend.

## Later

- Reading the native logs of his own agent team and other tools.
- Refreshing by itself when the files change; a phone notification when a mission stalls.
- Several missions and agents side by side.
- Short Polish summaries of notes written in English (needs an AI model; first find an allowed, free route).
- Sharing with other people: a free period first, then paid use (his idea from the start).

## Explicitly Cut

- Logging in to claude.ai, chatgpt.com or other chat sites, or automating private chats: their terms forbid automated access ("no disallowed workarounds", his words).
- Steering or restarting agents automatically: Mission Rescue only shows the truth and writes the resume instruction; a person hands it to the agent.
- Real logs, personal data or secrets in the public repository: fictional samples only.
- Paid APIs: Daniel's rule is subscriptions only.
- Old GnyPcior code: this hackathon needs new code from an empty folder (the idea can be old).
