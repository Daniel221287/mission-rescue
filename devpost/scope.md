---
doc: scope
status: draft
---

# Mission Rescue: Agent Proof & Recovery (Czytnik Roboty Agentów)

A Polish command center that shows the truth about an AI agent's work: what was really done (with proof), where and why the agent stopped, and how to safely resume the mission until it is confirmed complete.

Revision history:
- 21 Oct 2026, 14:53: first version approved by Daniel ("Plan lux"), as "Czytnik Roboty Agentów" (agent work reader + AI limit guard).
- 21 Oct 2026, 15:04: Daniel extended it into "MISSION RESCUE — Agent Proof & Recovery" in his own written concept. The approved kernel stays; this revision adds proof checking and mission recovery.

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

1. **Mission Tracker:** reads a local mission file and work log; shows completed steps, remaining tasks and proof of execution.
2. **Proof Engine:** compares what the agent declared with the actual results; nothing turns green without proof.
3. **Stall Detector:** detects a lack of progress, not just silence; tells a likely failure from waiting for a limit or a person.
4. **Mission Rescue:** shows the last confirmed checkpoint and the missing steps, and generates a concrete instruction for resuming safely. Uncertain operations are not repeated before their effects are checked.
5. **Limit Guardian:** shows limits and reset times, and clearly labels data as manual, demo, or automatically verified.
6. **Polish command center:** clear status cards, an attractive look, subtle 3D accents, and every problem explained in plain language.

Plus: a real sample mission (7 tasks, stopped after 3) and a sample agent that really delivers the remaining results, so the red-to-green flow runs for real. Working end to end with tests first; the look and extras after.

## Later

- Reading the native logs of his own agent team and other tools.
- Refreshing by itself when the files change; a phone view; a phone notification when a mission stalls.
- Several missions and agents side by side.
- Short Polish summaries of notes written in English (needs an AI model; first find an allowed, free route).
- Sharing with other people: a free period first, then paid use (his idea from the start).

## Explicitly Cut

- Logging in to claude.ai, chatgpt.com or other chat sites, or automating private chats: their terms forbid automated access ("no disallowed workarounds", his words).
- Steering or restarting agents automatically: Mission Rescue only shows the truth and writes the resume instruction; a person hands it to the agent.
- Real logs, personal data or secrets in the public repository: fictional samples only.
- Paid APIs: Daniel's rule is subscriptions only.
- Old GnyPcior code: this hackathon needs new code from an empty folder (the idea can be old).
