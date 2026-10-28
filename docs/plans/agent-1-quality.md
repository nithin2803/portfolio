# Agent task 1: quality

nythos-6 knows too little about Nithin and doesn't sound like him. Both come from the content model and from
where the voice comes from, not from the plumbing.

## Why it's bad now

- **Content is in units that are too small.** ~20 Q&A entries with 2–3 sentence answers turn him into an FAQ.
  Answers to broad questions ("what's your background?") can only staple snippets together. The entries are
  Claude's compressed summaries of interview answers, so detail and personality were lost.
- **Voice comes from the wrong places:** an adjective list in the prompt ("short, plain, a little dry"), entry
  text in Claude's voice, and replay streaming that text word for word. Models copy examples, not adjectives.
  The real voice (blog draft) is warm, self-deprecating, reaches for CS analogies (MCTS), uses shoutouts,
  parenthetical asides, "Which brings me to…" transitions and em dashes.
- **The model is small.** GLM-5.3 Flash is weak at style transfer. Test before blaming anything else.

## Plan

**Content: a few long first-person docs instead of snippets.** ~5–10k tokens total, all in the prompt: no
retrieval, and the static prompt caches.

| Doc           | For                   | What's in it                                                                     |
| ------------- | --------------------- | -------------------------------------------------------------------------------- |
| `story.md`    | everyone              | Hyderabad → Bellevue → UW → Amazon → SF, as a story                              |
| `work.md`     | recruiters            | each role: the problem, what he built, how he thought, what he learned           |
| `projects.md` | recruiters, engineers | Paxos KV store, the coding-agent knowledge base (and why he killed it), the site |
| `takes.md`    | engineers             | agentic vs. one-shot RAG, LLM-as-judge, sampling with Claude like MCTS           |
| `life.md`     | the curious           | Iceland, photography, hikes, Bon Appetit, bucket list                            |

No numbers or Amazon internals in `work.md`.

**Voice: real samples in two registers.** Blog posts for long answers; casual chat voice ("Honestly…", "Eh it's
fine as is", "lol") for short ones. Best: 15–20 example exchanges Nithin writes (question → how he'd reply in a
DM). Drop the adjective list.

**Process: Nithin writes or dictates, Claude organizes without rewording.** Interview again, keep his
sentences, only arrange them into the docs.

**Plumbing stays:** SSE route and guards, link chips, follow-ups, game button, canned refusals, live blog
state, link allowlist. Two changes:

- SOURCES cites doc sections instead of Q&A ids; chips attach to sections.
- Drop replay except for the opener.

**Trade-off:** long docs give more room to make things up. Keep the strict "only what the docs say" rule; add a
fact-check pass if testing shows drift.

**Gaps hand off to Nithin.** When the docs only partly cover a question, answer what they say, then close with
"I'd love to chat about that" and the Email and LinkedIn chips. Only when something is actually missing, not on
every reply. `not-written.md` (nothing covered) uses the same line and chips.

## How we check it

20 test questions, half recruiter, half curious visitor. Run them on GLM Flash and one or two stronger models
side by side to separate content problems from model problems. Recruiters skim, so the chat should reward the
curious; Resume and LinkedIn chips cover everyone else.

## First step (Nithin)

Send the other blog posts and ~10 DM-style example replies. Claude drafts doc outlines and interview questions
meanwhile.
