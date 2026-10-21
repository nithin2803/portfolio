<p align="center">
  <img src="docs/n-glyph.png" alt="The site's 3D N, drawn as a matrix of dots with a red and blue chromatic split" width="300">
</p>

<h1 align="center">Nithin's Portfolio</h1>

<p align="center">
  The personal site of Nithin, a software engineer in Seattle.
</p>

---

- **The N.** A 3D letter rendered as a dot matrix that glitches, scatters into a tornado when you click it, and
  turns as you drag. Press <kbd>Space</kbd> for its telemetry.
- **Ask me anything.** The About section is a chat that answers as me, from answers I wrote, next to live
  panels for the model behind it: its activations, its KV cache, its speed.
- **Blog.** Notes on whatever I'm figuring out, with a hover preview of every page it links to.
- **Contact.** Seattle at night in pixel art, seen from Kerry Park. Press <kbd>Space</kbd> there for a game.

## Built with

Next.js 16 · React 19 · TypeScript · Tailwind CSS v4 · Three.js · MDX, run with [bun](https://bun.sh). The chat
streams GLM-5.3 Flash through OpenRouter.

```sh
bun install
bun run dev        # http://localhost:3000
```

Set `OPENROUTER_API_KEY` in `.env.local` to turn the chat on (see `.env.example`).

## Find your way around

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md): the map and the rules that hold everywhere
- [content/blog](content/blog/README.md): writing a post
- [content/chat](content/chat/README.md): what the chat knows
