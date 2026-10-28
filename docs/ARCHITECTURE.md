# Architecture

Read this to find where a change goes and which rules it must keep. It names files instead of linking them:
search for the name. It describes what rarely changes; if it's wrong, fix it in the same commit.

## Bird's eye

A personal site that is almost entirely static: the home page, the blog, feeds. Three things run on the server
at request time: the About chat, and two routes that fetch favicons and link previews for the content.

`content/` is the source of truth and code derives from it. Blog pages, the chat's knowledge, the links the chat
may write, the sites the server may fetch from, and the names that get logos are all read out of `content/`.
Adding content should never need a code change.

Next.js 16 (App Router, Turbopack), React 19, TypeScript, Tailwind v4, Three.js, MDX, bun.

## Codemap

```
src/
  app/                  routes only: pages, layouts, API handlers, icons. They compose features and hold no logic.
  components/ui/        shared primitives: AppLink, TextLink, GlitchText, GlitchNMark, NMark, Keycap, ChannelSplit
  components/layout/    site chrome: Nav, Footer
  features/<name>/      one folder per feature; index.ts is its public surface, import from there
    hero/               the headline, its place and local time
    n-glyph/            the 3D N: Three.js scene in plain TS (scene/), a React wrapper and the stats HUD (hud/)
    about/              the chat UI and its model panels (activations, KV cache, model card); client side
    chat/               the chat's server side: knowledge loading, the agent, prompt, guards
    blog/               post loading, MDX components, generated dither covers, link previews
    contact/            the pixel Seattle skyline and the Asteroids game
  lib/                  framework-free helpers: site constants, glitch engine, glossary, link icons, caches
  styles/               tokens.css (the design system) and effects.css (shared treatments)
  mdx-components.tsx    required by @next/mdx; maps Markdown elements to features/blog/mdx
content/
  blog/*.mdx            posts; how to write one is in content/blog/README.md
  chat/*.md             everything the chat knows; format in content/chat/README.md
  icons.yaml            names that get a logo, emoji or map pin; compiled by `bun run icons`
scripts/                the glossary compiler: content/icons.yaml -> src/lib/glossary.generated.json
test/mdx.ts             bun test preload: .mdx files load as their `meta` with an empty body
docs/                   docs for working on the site (this file) and the README image
```

| Route                                                       | What                                                  |
| ----------------------------------------------------------- | ----------------------------------------------------- |
| `/`                                                         | hero, About chat, latest posts                        |
| `/blog`, `/blog/[slug]`                                     | posts (static)                                        |
| `/rss.xml`, `/sitemap.xml`                                  | feeds (static)                                        |
| `/api/chat`                                                 | the chat, streamed as server-sent events              |
| `/api/favicon/[site]`, `/api/preview`, `/api/preview/image` | link icons and blog link previews, fetched and cached |

Every page ends with the Contact section and the Footer, both rendered by `app/layout.tsx`.

## Boundaries

**Server and client.** Pages are server components; `'use client'` goes only on the leaves that need the
browser. Modules that use `node:fs`, `sharp` or secrets are server-only and say so on their first line
(`// Server-only`). That's a convention: only `lib/build-info.ts` imports the `server-only` package, so
`next build` is the only thing that catches a client importing one.

**Content and code.** Server code reads `content/` from disk at request time. Next only ships files it can trace,
so every route that reads `content/` is listed under `outputFileTracingIncludes` in `next.config.ts`. A route
missing from that list works in dev and finds nothing in production.

**React and imperative graphics.** Three.js, canvas and WebGL code lives in plain TS modules (n-glyph `scene/`,
contact `skyline/` and `asteroids/`). A thin React component mounts it and disposes it; React never drives
frames.

**The chat.** The UI is `features/about`; the server is `app/api/chat/route.ts` plus `features/chat`. In the
UI and the code the model is called nythos-6: GLM-5.3 Flash through OpenRouter, with its real figures in
`chat/nythos.ts`.

- A request clears cheap checks before any model call, in this order: rate limit, an answer that can be served
  without the model (canned or replayed), the daily spend ceiling, the API key being set, the context fitting.
  The checks are in `route.ts`. The spend ceiling is `CHAT_BUDGET` in `chat/nythos.ts`; the rate limits are the
  constants at the top of `chat/guards.ts`.
- The agent (`chat/agent`) runs the model with its tools: list posts, read a post, get contact links, and
  `read_more` for the `me.md` facets held back behind `<!-- more -->`.
- The model replies in JSON held to `replySchema` (`agent/reply.ts`) by the host, so only hosts that enforce
  it are used: `refused`, `sources`, `messages`, `about`, `actions`, `followUps`. `ReplyStream` streams the messages to the visitor
  as they're written and nothing else. `agent/prompt.ts` explains the fields and `reply.ts` defines and parses
  them: change them together.
- Rate limits (a token bucket per visitor) and the day's spend live in Upstash Redis (`chat/guards.ts`, over
  `lib/redis.ts`), so every server instance shares them. One pipelined round trip answers both per message, and
  the spend is recorded with `after()` once the answer has streamed. Without Redis configured, or while it's
  failing, each instance falls back to counting in its own memory.

## Invariants

- The chat answers only from `content/chat/me.md` and blog posts. When nothing there covers a question, the
  visitor gets a fixed reply, never an improvised one.
- The chat links only to an allowlist: contact links, site sections, blog posts and URLs that appear in
  `content/chat`. Any other link it writes renders as plain text.
- Server routes fetch only what the content links to: favicons for sites linked from `content/`
  (`lib/favicons.ts`), previews for links inside blog posts (`lib/blogLinks.ts`). A URL in a request is only
  fetched if it's on one of those lists.
- Nothing outside `content/` holds personal facts or copy. Site identity and links are in `lib/site.ts`; each
  feature's strings are in its `content.ts`.
- `src/lib/glossary.generated.json` is generated. A test fails if it drifts from `content/icons.yaml`.

## Cross-cutting concerns

The design rules themselves (colour, type, motion, copy) are in `docs/DESIGN.md`. This section only says where
they live in the code.

**Design system.** Colours, type, spacing and easing are tokens in `styles/tokens.css`; components use the
Tailwind utilities built from them, never raw values. The one exception is pixel and canvas art palettes.

**One visual language.** Everything borrows from the hero N: its dot matrix and its glitch, which is
horizontal slices plus a red/green/blue channel split. Anything that glitches uses `lib/useGlitch.ts` (timing,
tuned to the N's `scene/config.ts`) and `components/ui/ChannelSplit.tsx` (drawing).

**Motion.** `prefers-reduced-motion` stops every ambient loop: the N's idle glitch and bob, the skyline, the
Contact mark's bursts. Effects a visitor triggers (hover, click) still respond.

**Links.** All links go through `AppLink` or `TextLink`: pages on the site route client-side, other sites and
files open in a new tab.

**Caching.** Fetched favicons and previews are memoized per instance for a day (`lib/cache.ts`, which retries
empty results sooner) and cached by the CDN for longer (`IMAGE_CACHE_CONTROL`).

**Dev and production differ** on purpose: drafts show only in dev, and in dev the link allowlists are
recomputed on every request instead of once.

**Testing.** `bun test`, with tests next to the code as `*.test.ts`. They cover the pure parts: knowledge
parsing, the reply filter, glossary and icon resolution, the remark plugin. Visual work is checked by eye.

**Cross-feature contracts.**

- `#headline` (hero) glides into the About lead as you scroll (`about/useHeroJoin.ts`).
- `#about` and `#contact` are section anchors the nav highlights while they're on screen.
- `/#play` plus the `site:play-game` event (`PLAY_GAME` in `lib/site.ts`) start the game; the ship launches from
  `#contact-ship`.

**Environment.**

| Variable             | Used by                             | Without it                                |
| -------------------- | ----------------------------------- | ----------------------------------------- |
| `OPENROUTER_API_KEY` | the chat, `bun run icons --suggest` | the chat replies that it's offline        |
| `MICROLINK_API_KEY`  | link preview screenshots            | the free tier, about 50 screenshots a day |
| `ICONS_MODEL`        | `bun run icons --suggest`           | a default model set in `scripts/icons.ts` |
