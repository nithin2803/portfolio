# Blog posts

One post = one `.mdx` file in this folder. The file name is the URL slug:
`content/blog/scaling-inference-queues.mdx` → `/blog/scaling-inference-queues`.
Slugs must be kebab-case (`a-z`, `0-9`, `-`).

## Adding a post

Copy `_template.mdx` to `<slug>.mdx` and edit. Every post exports `meta` at the top:

```mdx
export const meta = {
  title: 'Scaling inference queues without losing sleep', // required
  date: '2026-09-30',                                    // required, YYYY-MM-DD
  summary: 'One or two plain sentences.',                // required, used on /blog, RSS and link previews
  tags: ['infra', 'ai'],                                 // optional
  cover: '/blog/scaling-inference-queues/cover.jpg',     // optional, path in /public
  draft: true,                                           // optional, defaults to false
};

Post body in Markdown. JSX works too.
```

A bad or missing `meta` fails loudly with the file name and field.

## Drafts

`draft: true` posts show up in `bun run dev` (with a red "Draft" tag) and are left out of
production builds, the RSS feed and the sitemap.

## Covers

Leave `cover` out and the post gets a generated cover: a duotone, ordered-dither image seeded
by the slug, so it never changes unless you rename the file. To use your own image, put it in
`public/` and set `cover` to its path (16:10 crops best).

Images in the body (`![alt](/path.png "optional caption")`) go through `next/image` when the
path starts with `/`.

## Notes

- Files starting with `_` are ignored. Keep `_template.mdx`: it also keeps the posts import
  map non-empty, so the site builds with zero posts.
- Posts are sorted by `date`, newest first. Reading time is estimated from the word count.
- Styling for headings, lists, code, quotes, links and images lives in `src/features/blog/mdx/`.
