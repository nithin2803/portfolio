<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# nithin-site

Nithin's personal site: a 3D hero, a chat that answers as him, a blog, and a contact section with a game. Solo
project, and Nithin is often editing the working tree while you work.

[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) is the codemap and the rules that hold everywhere. Read it before
adding a module, moving code between features, changing the chat's server side, or touching anything visual.

## Commands

bun only, never npm, yarn or pnpm.

```sh
bun run dev                    # :3000. Usually already running: reuse it, never start a second one
bunx tsc --noEmit              # typecheck (there's no script for it; `next build` also typechecks)
bun run lint
bun test                       # bun's runner; test/mdx.ts stubs .mdx bodies, so tests see a post's meta only
bunx prettier --write <files>  # formatting; prettier and eslint win every style argument
bun run build
bun run icons                  # after editing content/icons.yaml; regenerates src/lib/glossary.generated.json
bun run evals                  # asks evals/cases.yaml through the real chat agent (paid), saves to evals/runs/
bun run evals:grade            # grading page on :3002 for those runs
bun run facets                 # how the chat splits content/chat/me.md into sections and facets
```

`bun run icons --suggest` calls a paid model and rewrites files in `content/`, and `bun run evals` makes one or more
paid calls per case. Ask before running either.

## Done means

- Typecheck, lint and tests pass.
- Visual work was looked at in the browser on :3000, not just read as code, and compared with the reference when
  there is one. If it animates, also check it with reduced motion on.

## Rules the code won't tell you

- Before any UI or visual work, read [docs/DESIGN.md](docs/DESIGN.md). It sets the colours, type, motion, copy and
  interaction rules, and they're strict.
- Server-only modules are marked by a `// Server-only` first-line comment, not by the `server-only` package
  (only `lib/build-info.ts` imports it). Never import one from a `'use client'` file; only `next build` will
  catch it.
- If a server route reads `content/`, list it under `outputFileTracingIncludes` in `next.config.ts`, or it works
  in dev and finds nothing in production.
- Never hand-edit `src/lib/glossary.generated.json`. Edit `content/icons.yaml`, then `bun run icons`.
- Never print or commit `.env.local`.
- New content for the chat goes in `content/chat/me.md`, in Nithin's own words and in the section and facet
  structure `content/chat/README.md` describes. Run `bun run facets` afterwards.

## Code

- `type`, never `interface`. No `enum`, no `any`, no `React.FC`.
- Components are `export function Name(props: NameProps)`, one per file, file named after it. Named exports only;
  default exports are for Next's route files.
- Import a feature through its `index.ts`, and use the `@/` alias rather than long relative paths.
- Merge classes with `cn()` from `lib/cn.ts`.
- Tuning numbers are `SCREAMING_CASE` constants at the top of the file, with the unit in the name (`_MS`, `_S`)
  or in a comment ("as a share of the height").
- Keep `'use client'` on the smallest component that needs it.
- Add a dependency only when a few lines of code can't do the job, and ask first.
- Comments explain why, not what, in one short line. Delete dead code instead of commenting it out.

## Working with Nithin

- Ask before deleting a feature or someone's art.
- Never revert, reformat or "clean up" edits Nithin is making in the working tree.
- Throwaway tuning tools (comparison pages, slider dials) are welcome; never commit them.

## Git

- History is a few story commits, rewritten freely (there's no upstream). Messages are one line: `feat: …`,
  `fix: …` or `chore: …`.
- Every commit builds: typecheck, lint, tests and `next build` pass on each one.
- Fold a change into the commit it belongs to (`git commit --fixup <sha>`, then
  `git rebase --autosquash <base>`, no `-i` so no editor opens) rather than adding a commit on top.
