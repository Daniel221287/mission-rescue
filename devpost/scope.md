---
doc: scope
status: approved
---

# Czytnik Roboty Agentów (Agent Work Reader)

A nice, clear app: Daniel plugs in his AI agents and sees, in one list like the one his team already keeps, what each agent did, which one stopped halfway, and how much of his plan limits is left, with nothing to type and no logins.

## The Unique Kernel

In his words: "What annoys me most is when it stops working although it had a mission from A to Z: it finishes only part of it, and then waits for who knows what."

So the heart of the reader is catching agents that stopped halfway. When an agent had a mission from A to Z, finished only part of it and went quiet without saying what it is waiting for, the reader shows it at once, in red: how far it got and how long it has been silent.

All of it the way he wants it: "simple to use and attractive" (his words), in Polish, for someone who does not program. The tools we came across for watching agents and limits (status-line scripts, command-line usage trackers) are built for programmers, in English, and they count usage, not unfinished missions.

## Who It's For

Daniel. He runs several AI agents on his regular subscriptions (Claude, ChatGPT and others) and hands them tasks for the team in the evening: writing software, searching, checking. They leave a lot of files behind ("we have a ton of that"), mostly in English, which he does not read comfortably. Today he finds out what happened by asking the agents or digging through those files, and he checks his plan limits by hand.

Later: other people who run several AI agents.

## The Core Loop

1. He opens the app.
2. He plugs in his agents once, by pointing it at the files where they record their work.
3. He sees one list: each agent, what it did, what is done, in progress, waiting for him, and which agent stopped halfway without saying why. Beside it: how much of each plan's limit is used and when it resets.
4. He comes back whenever the agents have worked on his tasks: one glance shows what happened and what to hand out next.

## Inspiration & Identity

- "A nice, clear app" and "simple to use, attractive" (his words).
- A list "like the ones we have at home": the agent and task lists that Daniel and his AI agents already keep.
- Polish everywhere.
- Scannable at a glance: green, yellow and red, numbers, short bold labels, no walls of text. Daniel reads visually.
- "In our modern style" (his words, 21 Oct). The agent reads this as the style of the team's 3D demo websites (Ciao Bella, BRYŁA); Daniel to confirm. How much 3D fits into a 2-4 hour proof of concept without hiding the list is a PRD decision. The style is rebuilt from scratch: old code cannot be reused here, while public libraries (for example three.js) are fine.
- References: the team's 3D demo websites named above; links to be added in the PRD.

## Why This Matters to the Learner

In his words: reading the workspaces, "we have a ton of that". He has been building his agent system, GnyPcior, for more than two months and works with agents every day. What annoys him most is an agent that stops halfway through a mission and then waits for who knows what. He wants the information to be there "normally", by itself, and the agents' work comes first: "The agents' work, of course."

## What "Working" Looks Like

In his words: "We open a nice, clear app, I plug in the agents… it has to be some kind of list, like the ones we have at home."

The moment: he plugs in the agents and their work appears at once as a clear list in Polish (green, yellow, red). One agent glows red: it stopped halfway through its mission (for example 3 of 7 steps) and has been silent for two hours without saying what it is waiting for. The limits panel shows how much is left. It can be shown in about a minute, in a short demo video.

## The POC Boundary

- One page in Polish that opens in the browser on his own computer. Nothing is sent anywhere; no logins.
- Plug in an agent: pick the file or folder where that agent records its work. The agent appears in the list.
- The list: each agent with its mission and tasks, coloured by status (done, in progress, waiting for you), with a "waiting for you" group on top.
- Stall catcher (the heart): an agent whose mission is not finished, and which has been silent longer than a set time without saying what it waits for, turns red, showing how far it got (steps done out of all) and how long it has been silent.
- Limits panel: percent used and reset time for each plan, read from a small limits file (the numbers Claude Code's status line provides), or typed by hand when there is no file.
- Fictional sample agents and files in the repository, so anyone can try it in a minute.

## Later

- A ready-made status-line script that writes the limits file automatically; reading Codex's local logs.
- Refreshing by itself when the files change.
- A phone view.
- A phone notification when an agent stalls.
- More agents and tools (Gemini, Grok and others).
- Short Polish summaries of notes written in English (needs an AI model; first find an allowed, free route).
- Sharing with other people: a free period first, then paid use (his idea from the start).

## Explicitly Cut

- Logging in to claude.ai, chatgpt.com or other chat sites to read data: their terms forbid automated access.
- Steering the agents or sending them tasks (the earlier "super agent" idea), including restarting a stalled agent: the same terms problem for chat apps, and far bigger than a 2-4 hour proof of concept.
- Real logs, personal data or secrets in the public repository: fictional samples only.
- Paid APIs: Daniel's rule is subscriptions only.
- Old GnyPcior code: this hackathon needs new code from an empty folder (the idea can be old).
