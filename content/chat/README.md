# nythos-6 knowledge

The About chat is a real model (GLM-5.3 Flash via OpenRouter) that answers **as Nithin**.

**`me.md` is everything it knows about Nithin**, in his own words. It goes into the system prompt verbatim as both
the model's facts and its voice, so write it the way you'd want the chat to sound. Add sections whenever; any
Markdown works, and it needs no frontmatter.

## How `me.md` is structured

The chat reads `me.md` as **sections and facets**, and every edit should keep to this:

- **Each heading names a section** (`## Orbi`, `## Why SF`). A heading with nothing directly under it, like
  `# Projects`, only groups the sections below it. Section names must be unique.
- **Each paragraph or bullet under a heading is one facet:** one answerable thing, like what Orbi was, or why it
  ended. The model sees each facet with its id in front (`[Orbi #2] …`); you never write the ids.
- **Every answer names the facets it drew on, and every follow-up names the facet that would answer it.** The server
  keeps a follow-up only if that facet is in the same section as the answer and hasn't been covered yet in the
  conversation. So follow-ups stay on topic and never repeat, however they're worded. And a section with one facet
  gets no follow-ups once it's been answered.
- **So split by question, not by length.** If a paragraph answers two different questions ("what is it" and "why
  did it end"), make it two paragraphs. Covering one facet uses up the whole facet.
- **Hold back what shouldn't lead.** Facets after a `<!-- more -->` line in a section are held back: the model sees
  only their first few words, so it never opens with them. It can offer them as follow-ups, and a tapped follow-up
  brings the facet in. A question typed about one makes the model call `read_more` (a "notes" label shows over the
  answer while it reads). Use it for depth worth having but not leading with. Its first sentence doubles as the
  teaser, so make it say what the facet is about.
- **Only Nithin's words.** Adding his new content means placing his sentences under the right heading, splitting
  them into facets, and fixing typos. It never means rewording, summarizing or filling gaps yourself.

`bun run facets` prints every section with its facets. It flags sections with only one facet, which run out of
follow-ups after one answer, and very long facets that probably mix several questions. Run it after every edit,
and use it to spot gaps before visitors do.

The chips under an answer (Resume, LinkedIn, Email me, GitHub, Play the game, one per blog post) are picked by the
model from a fixed set, `chipsFor` in `src/features/chat/knowledge.ts`, zero to two per answer. A partial answer
always gets `not-written`'s chips instead.

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
