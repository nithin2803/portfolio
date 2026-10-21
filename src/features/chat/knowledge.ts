// Server-only (node:fs).
import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import { cache } from 'react';
import { getPosts } from '@/features/blog';
import { CONTACT_LINKS, NAV_LINKS } from '@/lib/site';
import { iconFor } from '@/lib/brands';
import { glossary } from '@/lib/glossary';
import type { LinkCatalog } from './markdown';
import { RESERVED_IDS, type ReservedId } from './types';

const DIR = path.join(process.cwd(), 'content/chat');
const LINK = /\[([^\]]*)\]\(([^)\s]+)\)/g;
const ACTION = /^\[([^\]]+)\]\(([^)\s]+)\)$/;
// a [placeholder] Nithin hasn't filled in yet: square brackets that aren't a link
export const PLACEHOLDER = /\[[^\]]*\](?!\()/g;

// what a visitor can ask: every entry with a question except the reserved replies (the opener is one)
export const askable = (e: Entry) =>
  Boolean(e.question) && (e.id === 'about-me' || !(RESERVED_IDS as readonly string[]).includes(e.id));

const normalize = (q: string) =>
  q
    .toLowerCase()
    .replace(/[’']/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();

// a question asked word for word (a follow-up chip, or typed) gets the entry itself, no model needed.
// entries with placeholders still go to the model, which knows to say they aren't written yet.
export function entryFor(k: Knowledge, question: string): Entry | undefined {
  const q = normalize(question);
  return k.entries.find(
    (e) => askable(e) && !e.live && normalize(e.question) === q && !e.body.match(PLACEHOLDER),
  );
}

export const isAsked = (history: readonly string[]) => {
  const asked = new Set(history.map(normalize));
  return (question: string) => asked.has(normalize(question));
};

export type Action = { label: string; href: string };
export type Entry = {
  id: string;
  question: string;
  describe: string;
  body: string;
  // facts the model may draw on but not quote; the body stays the voice example
  notes: string;
  followUps: string[];
  actions: Action[];
  // always answered by the model, never replayed word for word (its answer depends on live state, like the blog)
  live: boolean;
};
export type Canned = { question: string; text: string; followUps: string[]; actions: Action[] };

export type Knowledge = {
  entries: Entry[];
  posts: { title: string; href: string }[];
  byId: Record<string, Entry>;
  reserved: Record<ReservedId, Canned>;
  links: LinkCatalog;
  opener: string;
};

function fail(id: string, why: string): never {
  throw new Error(`content/chat/${id}.md: ${why}`);
}

function resolveLinks(id: string, body: string, blogTitle: (slug: string) => string | undefined) {
  return body.replace(LINK, (_, label: string, href: string) => {
    let target = href;
    if (href.startsWith('contact:')) {
      const name = href.slice('contact:'.length).toLowerCase();
      const link = CONTACT_LINKS.find((l) => l.label.toLowerCase() === name);
      if (!link) fail(id, `unknown contact link "${href}" (see CONTACT_LINKS in src/lib/site.ts)`);
      target = link.href;
    }
    let text = label;
    if (!text) {
      const slug = target.match(/^\/blog\/([^/#?]+)/)?.[1];
      text = (slug && blogTitle(slug)) || fail(id, `link to ${target} needs text`);
    }
    return `[${text}](${target})`;
  });
}

export const getKnowledge = cache(async (): Promise<Knowledge> => {
  const posts = await getPosts();
  const blogTitle = (slug: string) => posts.find((p) => p.slug === slug)?.title;

  const raw: Entry[] = [];
  for (const file of fs.readdirSync(DIR)) {
    if (!file.endsWith('.md') || file === 'README.md') continue;
    const id = file.slice(0, -3);
    const { data, content } = matter(fs.readFileSync(path.join(DIR, file), 'utf8'));
    if (typeof data.question !== 'string') fail(id, '`question` must be a string');
    if (typeof data.describe !== 'string' || !data.describe) fail(id, '`describe` is required');
    const followUps = data.followUps ?? [];
    if (!Array.isArray(followUps)) fail(id, '`followUps` must be a list of ids');
    if (data.notes !== undefined && typeof data.notes !== 'string') fail(id, '`notes` must be text');
    const actions = data.actions ?? [];
    if (!Array.isArray(actions)) fail(id, '`actions` must be a list of [label](href) links');
    raw.push({
      id,
      question: data.question,
      describe: data.describe,
      body: resolveLinks(id, content.trim(), blogTitle),
      notes: resolveLinks(id, (data.notes ?? '').trim(), blogTitle),
      followUps: followUps.map(String),
      live: data.live === true,
      actions: actions.map((a) => {
        const m = typeof a === 'string' && resolveLinks(id, a.trim(), blogTitle).match(ACTION);
        return m
          ? { label: m[1], href: m[2] }
          : fail(id, `action ${JSON.stringify(a)} isn't a [label](href) link`);
      }),
    });
  }

  const byId = new Map(raw.map((e) => [e.id, e]));
  for (const id of RESERVED_IDS) if (!byId.has(id)) fail(id, 'this reserved answer is missing');
  const questionOf = (owner: string, id: string) => {
    const q = byId.get(id)?.question;
    if (!q) fail(owner, `followUp "${id}" doesn't exist or has no question`);
    return q;
  };
  const entries = raw.map((e) => ({ ...e, followUps: e.followUps.map((f) => questionOf(e.id, f)) }));
  const reserved = Object.fromEntries(
    RESERVED_IDS.map((id) => {
      const e = entries.find((x) => x.id === id)!;
      return [id, { question: e.question, text: e.body, followUps: e.followUps, actions: e.actions }];
    }),
  ) as Record<ReservedId, Canned>;

  const hrefs = new Set<string>([
    ...CONTACT_LINKS.map((l) => l.href),
    // not the nav's same-page #contact: answers link to /#contact
    ...NAV_LINKS.flatMap((l) => (l.href.startsWith('/') ? l.href : [])),
    '/',
    '/rss.xml',
    ...posts.map((p) => `/blog/${p.slug}`),
    ...glossary.terms.flatMap((t) => t.href ?? []),
  ]);
  for (const e of entries) {
    for (const m of `${e.body}\n${e.notes}`.matchAll(LINK)) hrefs.add(m[2]);
    for (const a of e.actions) hrefs.add(a.href);
  }
  // nothing to link to until the first post is up
  if (!posts.length) for (const href of ['/blog', '/rss.xml']) hrefs.delete(href);
  const links = { hrefs: Object.fromEntries([...hrefs].map((h) => [h, iconFor(h)])), terms: glossary.terms };

  return {
    entries,
    posts: posts.map((p) => ({ title: p.title, href: `/blog/${p.slug}` })),
    byId: Object.fromEntries(entries.map((e) => [e.id, e])),
    reserved,
    links,
    opener: byId.get('about-me')!.question,
  };
});
