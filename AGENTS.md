<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# How Nithin builds this site

Read [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) first: it's the map and the invariants.

## Code

- As simple as possible. Clean Next.js and TypeScript, clear separation of concerns, reuse before inventing.
- Comments only where the code isn't obvious, and short: a line, not a paragraph.
- Well-named variables over explanations. Delete dead code rather than keeping it around.
- Match the surrounding code's style. Prettier and ESLint are the formatting authority.

## Design

- Everything speaks the hero N's language: its dot matrix, its slice glitch, its red/green/blue channel split.
  When matching an effect, copy how the original actually works, then compare side by side.
- Subtle beats loud: no flat "light source" gradients, no plain-black voids, nothing that reads as a placeholder.
- Interactions are consistent site-wide: the same link styles, the same hover behaviour, the same nav rules.

## Workflow

- Check visual work in the browser on the dev server already running on :3000 (don't start a second one), and
  look at it, not just at the code. Compare against the reference when there is one.
- Throwaway tools (comparison pages, slider dials) are welcome for tuning; never commit them.
- Ask before deleting a feature or someone's art. Never revert edits Nithin is making in the working tree.

## Git

- History is a few story commits, rewritten freely (there's no upstream). Messages: `feat: …`, `fix: …` or
  `chore: …`, one line.
- Every commit builds: typecheck, lint, tests and `next build` pass on each one.
- Fold a change into the commit it belongs to (`git commit --fixup` + `git rebase --autosquash`) rather than
  adding a commit on top.
