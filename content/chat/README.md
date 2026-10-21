# nythos-6 knowledge

The About chat is a real model (GLM-5.3 Flash via OpenRouter) that answers **as Nithin**.
Every file here is one Q&A in Nithin's own words. Together they are the model's facts _and_ its voice
examples: they go into the system prompt verbatim, so write them exactly how you'd want it to sound.

```md
---
question: 'What do you work on?' # the question this answers
describe: "Nithin's job: what he does…" # what it covers (one line)
followUps: [eval-infra, inference] # ids of entries to suggest next (the model picks its own when it answers)
actions: ['[LinkedIn](contact:linkedin)'] # links shown as chips under any answer that uses this entry
notes: Facts the model may use in its own words but never quotes. # optional
live: true # optional: always answer through the model, never word for word (e.g. it should mention the blog's state)
---

Plain text. Blank lines start a new paragraph.
```

How answers are put together:

- **Asked word for word** (a follow-up chip, the opener, or typed exactly): the entry is shown as written, with its
  `followUps` and `actions`. No model call, so it's free and can't drift. Entries that still have `[placeholders]`
  skip this and go to the model, which says that part isn't written yet.
- **The blog** isn't an entry: the prompt is told which posts exist (or that none do yet) on every deploy, and links
  to `/blog` are blocked until the first post is up.
- **Anything else** goes to the model. It first names the entries it's answering from (by file name); those entries'
  `actions` become the chips under the answer. If none of them has actions, `contact`'s are used, so every answer
  has something to click. If it can't name any entry, the visitor gets `not-written` instead of a made-up answer.

Icons come from `content/icons.yaml`, not from markup: the first mention of each name there (Amazon, Iceland,
Fjaðrárgljúfur, glacier hiking) gets its logo, emoji or map pin in every answer and blog post. Write names plainly.
After adding content, run `bun run icons --suggest` to have a model propose icons for new names, review the diff,
and it also marks mentions of ambiguous names in your content as `[Go](@go)` where they mean the brand.
`bun test` checks nothing was missed. `bun run icons` alone just recompiles the file.

Inline syntax (the site renders it; the model is told to write names plainly):

| Write                                 | Renders                                                               |
| ------------------------------------- | --------------------------------------------------------------------- |
| `Amazon`                              | **Amazon** + logo, linked (any name in `content/icons.yaml`)          |
| `[Go](@go)`                           | Go + its logo: for names that are also ordinary words (`auto: false`) |
| `[Sure](@-)`                          | keeps one mention plain                                               |
| `[my GitHub](https://github.com/you)` | an inline link; its icon comes from `content/icons.yaml`              |
| `[GitHub](contact:github)`            | the link from `CONTACT_LINKS` in `src/lib/site.ts`                    |
| `[](/blog/some-post)`                 | a blog link titled with the post's title                              |

The model can only link to an allowlist: contact links, site sections, blog posts, and any URL used in these files.
Anything else it writes renders as plain text.

Anything in `[square brackets]` is a placeholder: the model sees it as "(not written yet)" and says so.

Reserved files (shown as-is, never sent through the model): `about-me` (its question is the prefilled opener),
`cant-answer` (the flat refusal for anything out of scope), `slow-down` (rate limited),
`out-of-tokens` (daily budget used), `offline` (no `OPENROUTER_API_KEY`),
`photo` (the reply when someone clicks the empty-chat photo; its question is what they "send"),
`not-written` (in scope, but no entry covers it).
