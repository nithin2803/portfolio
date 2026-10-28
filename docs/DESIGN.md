# Design

The rules for anything a visitor sees: colour, type, motion, copy. Read this before UI or visual work. These are
rules, not suggestions; if one is wrong, change it here first.

## The look

The site is dark, quiet and a little arcade. Its one visual idea is the hero N: a dot matrix that glitches with
horizontal slices and a red/blue channel split. Everything new borrows from that idea or stays plain. Don't
introduce a second motif.

Subtle beats loud. No flat "light source" gradients, no plain-black voids, nothing that reads as a placeholder or
a template. If an effect is the first thing you notice about a section, it's too strong.

## Colour

- Dark only. The page is `bg-black`; there is no light mode.
- Text uses the `fg` ladder, brightest to dimmest: `fg`, `fg-soft`, `fg-muted`, `fg-faint`, `fg-ghost`. Pick the
  step by importance, never by mixing your own opacity.
- The only accent is the signal ramp: `signal-red`, `signal-violet`, `signal-blue`, `signal-ice`. No other hues.
  Accents mark state or emphasis (focus, selection, the caret, glows), never large fills.
- Hairlines are `line`, or `line-strong` when they need to read. Overlays are `glass-panel`.
- Never write a raw colour, size or easing in a component. If a token is missing, add it to `styles/tokens.css`.
  The only exception is pixel and canvas art palettes, which keep their colours next to the art.

## Type

- Inter for everything (`font-sans`). `font-code` for code. `font-arcade` only inside the game.
- Use the scale in `tokens.css`: `text-small`, `text-chat`, `text-body`, `text-prose`, `text-display`,
  `text-hero`, `text-jumbo`. Each sets its own line height and tracking; don't override them.
- Labels and HUD readouts are `text-small uppercase`.
- Blog prose stays in the `article` container so lines hold about 75 characters.

## Space and shape

- Page gutters are `px-edge`. Content widths are the `reading`, `article` and `page` containers.
- Corners are near-square: 2–3px. Round fully only for avatars. Never use large radii or pill buttons.
- Borders are 1px. Shadows are rare: `shadow-bubble` for floating things, nothing else.
- No arbitrary Tailwind values (`p-[13px]`). Use the scale or add a token.

## Motion

- Interface transitions take 150–350ms with `ease-out-quint`. Playful moments (a lifting icon, a pressed key)
  use `ease-pop` or `ease-spring`. Reveals can take up to 700ms.
- Glitches go through `lib/useGlitch.ts` and `components/ui/ChannelSplit.tsx`. Never hand-roll one. Hover and
  focus set a glitch off; only marks of the N glitch on their own.
- With `prefers-reduced-motion`, ambient loops stop entirely. Effects the visitor triggers still respond.
- To match an existing effect, read how the original works and copy its numbers (the N's are in
  `features/n-glyph/scene/config.ts`), then compare them side by side in the browser.

## Interaction

- Every link is `TextLink` or `AppLink`. Links in text are `INLINE_LINK` (near-white, faint underline); interface
  links are `QUIET_LINK` (grey, white on hover, no underline). Don't invent a third style.
- Keyboard shortcuts are shown with `Keycap`, and every keycap is clickable.
- Focus is always visible: the default is a 1px `signal-blue` outline. If you remove it, replace it.
- Hover and focus always do the same thing.

## Copy

- Copy lives in data: `lib/site.ts`, each feature's `content.ts`, and `content/`. Never inline strings in JSX.
- Sentence case for interface text ("New chat", "Contact me"). Title Case only in the game, where it's part of the
  arcade feel.
- Write like a person: first person, contractions, short. A little playful ("Ask me almost anything!"), never
  cute or salesy.
- Alt text describes what's in the image, specifically.

## Checking your work

Look at it on the dev server (:3000), at desktop and phone widths, with reduced motion on if it animates. Compare
against the reference when there is one. When tuning a look, build a throwaway dial or comparison page instead of
guessing numbers, and don't commit it.
