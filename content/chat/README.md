# nythos-6 knowledge

The About chat is a real model (GLM-5.3 Flash via OpenRouter) that answers **as Nithin**.

**`me.md` is everything it knows about Nithin**, in his own words. It goes into the system prompt verbatim as both
the model's facts and its voice, so write it the way you'd want the chat to sound. Add sections whenever; any
Markdown works. Its frontmatter sets the chips shown under a normal answer:

```md
---
actions: ['[LinkedIn](contact:linkedin)', '[Resume](contact:resume)']
followUps: # the only follow-up questions the chat can suggest; keep each answerable from me.md
  - What was Orbi?
---
```

How answers are put together:

- **The opener** ("Who are you?", asked word for word) is `about-me`, shown as written. No model call.
- **The blog** isn't in `me.md`: the prompt is told which posts exist on every deploy, and the model reads them with
  its tools. Links to `/blog` are blocked until the first post is up.
- **Anything else** goes to the model, which answers only from `me.md` and the blog and writes its own follow-up
  questions. If `me.md` covers only part of a question, it answers that part and says it'd love to chat about the
  rest, with `not-written`'s chips (Email, LinkedIn). If it covers none of it, the visitor gets `not-written`
  instead of a made-up answer.

Icons come from `content/icons.yaml`, not from markup: the first mention of each name there (Amazon, Iceland,
Fjaðrárgljúfur) gets its logo, emoji or map pin in every answer and blog post. Write names plainly.
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

The model can only link to an allowlist: contact links, site sections, the game, blog posts, and any URL used in
these files. Anything else it writes renders as plain text.

Every other file is a reserved reply, shown as-is and never sent through the model. Their `followUps` are the
questions offered as chips after them, and `actions` their chips:
`about-me` (its question is the prefilled opener), `cant-answer` (the flat refusal for anything out of scope),
`slow-down` (rate limited), `out-of-tokens` (daily budget used), `offline` (no `OPENROUTER_API_KEY`),
`photo` (the reply when someone clicks the empty-chat photo; its question is what they "send"),
`not-written` (in scope, but `me.md` doesn't cover it). Any other file here is an error.
