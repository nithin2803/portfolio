# Architecture

A map, not an atlas: where things live and the rules that hold everywhere. Read the code for the rest.

Next.js 16 (App Router, Turbopack) · React 19 · TypeScript · Tailwind v4 · Three.js · MDX · bun.

## Map

```
src/
  app/                  routes only: pages, layouts, API handlers, icons. They compose features.
  components/ui/        shared primitives (AppLink, TextLink, GlitchText, GlitchNMark, NMark, Keycap, …)
  components/layout/    site chrome: Nav, Footer
  features/<name>/      one folder per feature; index.ts is its public surface
    hero/               the headline and its place/time
    n-glyph/            the 3D N: Three.js scene in plain TS (scene/), React wrapper + stats HUD
    about/              the chat UI and its model panels (client)
    chat/               the chat's server side: knowledge, agent, guards
    blog/               posts, MDX components, link previews
    contact/            pixel Seattle skyline and the Asteroids game
  lib/                  framework-free helpers (site constants, glitch engine, glossary, link icons, caches)
  styles/               tokens.css (the design system) and effects.css (shared treatments)
content/
  blog/*.mdx            posts (see content/blog/README.md)
  chat/*.md             the chat's knowledge, one answer per file (see content/chat/README.md)
  icons.yaml            names that get logos/emoji; compiled by `bun run icons`
scripts/                the glossary compiler (icons.yaml → src/lib/glossary.generated.json)
```

## Routes

| Route                                                       | What                                                              |
| ----------------------------------------------------------- | ----------------------------------------------------------------- |
| `/`                                                         | hero, About chat, latest posts                                    |
| `/blog`, `/blog/[slug]`                                     | posts (static)                                                    |
| `/rss.xml`, `/sitemap.xml`                                  | feeds (static)                                                    |
| `/api/chat`                                                 | the chat, streamed as server-sent events                          |
| `/api/favicon/[site]`, `/api/preview`, `/api/preview/image` | link icons and blog link previews, fetched server-side and cached |

Every page ends with the Contact section and Footer (from `app/layout.tsx`).

## Invariants

**Design**

- Colours, type, spacing and easing are tokens in `styles/tokens.css`. Components use the utilities, not raw
  values; the only exceptions are pixel and canvas art palettes.
- One visual language: the hero N's dot matrix and its glitch (horizontal slices plus a red/green/blue channel
  split). Anything that glitches uses `lib/useGlitch.ts` and `components/ui/ChannelSplit.tsx`.
- Copy lives in data: site identity and links in `lib/site.ts`, feature copy in each feature's `content.ts`.
- Respect `prefers-reduced-motion`: ambient loops (the N's idle glitch and bob, the skyline, the Contact mark's
  bursts) stop; hover effects still respond.

**Code**

- Pages stay server components; `'use client'` only on the leaves that need it.
- Modules that touch `node:fs`, `sharp` or secrets are server-only (`chat/knowledge`, `blog/posts`, `lib/brands`,
  `lib/favicons`, `lib/link*`, `lib/luminance`, `lib/blogLinks`).
- Imperative graphics (Three.js, canvas, WebGL) live in plain TS modules with a thin React wrapper that mounts
  and disposes them.
- Links go through `AppLink`/`TextLink`: on-site pages route client-side, other sites and files open in a new tab.

**Safety**

- Server routes only fetch what the content links to: favicons for linked sites, previews for links in posts.
- The chat answers only from `content/chat`, links only to an allowlist, and is rate limited with a daily spend
  ceiling. A question asked word for word replays its entry with no model call.
- `src/lib/glossary.generated.json` is generated; a test fails if it drifts from `content/icons.yaml`.

**Cross-feature contracts**

- `#headline` (hero) glides into the About lead as you scroll (`about/useHeroJoin.ts`).
- `#about` and `#contact` are section anchors the nav highlights while they're on screen.
- `/#play` + the `site:play-game` event start the game; the ship launches from `#contact-ship`.

## Working

- `bun run dev` (one shared server on :3000), `bun run lint`, `bun test`, `bun run build`.
- Env: `OPENROUTER_API_KEY` (chat; without it the chat says it's offline), `MICROLINK_API_KEY` (optional, more
  link screenshots).
