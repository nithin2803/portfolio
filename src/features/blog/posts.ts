// Server-only (node:fs).
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { cache } from 'react';
import type { MDXContent } from 'mdx/types';
import type { Post, PostMeta, PostSummary } from './types';

const POSTS_DIR = path.join(process.cwd(), 'content', 'blog');
const WORDS_PER_MINUTE = 220;
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

type PostModule = { default: MDXContent; meta?: unknown };

const showDrafts = process.env.NODE_ENV !== 'production';

async function readSlugs(): Promise<string[]> {
  let files: string[];
  try {
    files = await readdir(POSTS_DIR);
  } catch {
    return [];
  }
  return files
    .filter((f) => f.endsWith('.mdx') && !f.startsWith('_')) // _template.mdx must exist so Turbopack can resolve the dynamic import; _files aren't posts
    .map((f) => f.slice(0, -'.mdx'.length))
    .filter((slug) => {
      if (SLUG.test(slug)) return true;
      console.warn(`[blog] skipping "${slug}.mdx": file names must be kebab-case (a-z, 0-9, -)`);
      return false;
    });
}

function fail(slug: string, msg: string): never {
  throw new Error(`[blog] content/blog/${slug}.mdx: ${msg}`);
}

function parseMeta(slug: string, raw: unknown): PostMeta {
  if (!raw || typeof raw !== 'object') fail(slug, 'missing `export const meta = { title, date, summary }`');
  const m = raw as Record<string, unknown>;
  const str = (k: string) => {
    if (typeof m[k] !== 'string' || !(m[k] as string).trim())
      fail(slug, `meta.${k} must be a non-empty string`);
    return (m[k] as string).trim();
  };
  const date = str('date');
  if (!DATE.test(date) || Number.isNaN(Date.parse(date))) fail(slug, 'meta.date must be YYYY-MM-DD');
  if (m.tags !== undefined && !(Array.isArray(m.tags) && m.tags.every((t) => typeof t === 'string')))
    fail(slug, 'meta.tags must be a string[]');
  if (m.cover !== undefined && typeof m.cover !== 'string') fail(slug, 'meta.cover must be an image path');
  if (m.draft !== undefined && typeof m.draft !== 'boolean') fail(slug, 'meta.draft must be a boolean');
  return {
    title: str('title'),
    date,
    summary: str('summary'),
    tags: m.tags as string[] | undefined,
    cover: m.cover as string | undefined,
    draft: (m.draft as boolean | undefined) ?? false,
  };
}

async function prose(slug: string): Promise<string> {
  const src = await readFile(path.join(POSTS_DIR, `${slug}.mdx`), 'utf8');
  return src
    .replace(/export const meta\s*=\s*\{[\s\S]*?\n\};?/, '')
    .replace(/^(import|export) .*$/gm, '')
    .replace(/<[^>]+>/g, ' ');
}

async function readingTime(slug: string): Promise<number> {
  const words = (await prose(slug)).split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / WORDS_PER_MINUTE));
}

const loadPost = cache(async (slug: string): Promise<Post> => {
  const mod = (await import(`../../../content/blog/${slug}.mdx`)) as PostModule;
  const meta = parseMeta(slug, mod.meta);
  return { ...meta, slug, readingTime: await readingTime(slug), Content: mod.default };
});

export const getPosts = cache(async (): Promise<PostSummary[]> => {
  const posts = await Promise.all((await readSlugs()).map(loadPost));
  return posts
    .filter((p) => showDrafts || !p.draft)
    .sort((a, b) => b.date.localeCompare(a.date))
    .map((p): PostSummary => {
      const summary: Partial<Post> = { ...p };
      delete summary.Content;
      return summary as PostSummary;
    });
});

export async function getPost(slug: string): Promise<Post | null> {
  if (!(await getPosts()).some((p) => p.slug === slug)) return null;
  return loadPost(slug);
}

export async function getPostText(slug: string, maxChars = 8000): Promise<string | null> {
  if (!(await getPosts()).some((p) => p.slug === slug)) return null;
  return (await prose(slug))
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, maxChars);
}
