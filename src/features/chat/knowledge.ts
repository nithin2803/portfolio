// Server-only (node:fs).
import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import { cache } from 'react';
import { getPosts } from '@/features/blog';
import { CONTACT_LINKS, NAV_LINKS, PLAY_GAME } from '@/lib/site';
import { iconFor } from '@/lib/brands';
import { glossary } from '@/lib/glossary';
import type { LinkCatalog } from './markdown';
import { RESERVED_IDS, type ReservedId } from './types';

const DIR = path.join(process.cwd(), 'content/chat');
const ME = 'me';
const LINK = /\[([^\]]*)\]\(([^)\s]+)\)/g;
const ACTION = /^\[([^\]]+)\]\(([^)\s]+)\)$/;

const normalize = (q: string) =>
  q
    .toLowerCase()
    .replace(/[’']/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();

// the opener asked word for word (its chip, or typed) is answered as written, no model needed
export function cannedFor(k: Knowledge, question: string): Canned | undefined {
  const opener = k.reserved['about-me'];
  return normalize(opener.question) === normalize(question) ? opener : undefined;
}

export const isAsked = (history: readonly string[]) => {
  const asked = new Set(history.map(normalize));
  return (question: string) => asked.has(normalize(question));
};

// One answerable thing in me.md: a paragraph or a bullet, under the heading that names its section. `more` facets
// come after a <!-- more --> line: the model only sees a teaser of them until a visitor asks
export type Facet = { id: string; section: string; text: string; more: boolean };

const MORE = '<!-- more -->';
// how much of a held-back facet the model sees, enough to know what it's about
const TEASER_WORDS = 8;

// me.md as the model sees it, with each facet's id in front of it, plus the facets. A heading with facets under it
// is a section; one with none (like "# Projects") only groups the sections below it
export function parseFacets(text: string): { prompt: string; facets: Facet[] } {
  const facets: Facet[] = [];
  const out: string[] = [];
  const count = new Map<string, number>();
  let section = '';
  let more = false;
  let current: string[] = [];
  const flush = () => {
    if (!current.length) return;
    if (!section) fail(ME, `"${current[0].slice(0, 40)}…" isn't under a heading`);
    const n = (count.get(section) ?? 0) + 1;
    count.set(section, n);
    const facet = { id: `${section} #${n}`, section, text: current.join(' ').trim(), more };
    facets.push(facet);
    if (!more) out.push(`[${facet.id}] ${facet.text}`);
    else {
      const words = facet.text.split(/\s+/);
      const teaser = words.slice(0, TEASER_WORDS).join(' ') + (words.length > TEASER_WORDS ? '…' : '');
      out.push(`[${facet.id}] (more) ${teaser}`);
    }
    current = [];
  };
  const seen = new Set<string>();
  for (const line of text.split('\n')) {
    const heading = line.match(/^#{1,6}\s+(.+?)\s*$/);
    const item = line.match(/^\s*(?:[-*]|\d+\.)\s+(.+)$/);
    if (heading) {
      flush();
      section = heading[1];
      more = false;
      if (seen.has(section)) fail(ME, `two headings are both "${section}"`);
      seen.add(section);
      out.push('', line);
    } else if (line.trim() === MORE) {
      flush();
      more = true;
    } else if (!line.trim()) flush();
    else if (item) {
      flush();
      current.push(item[1]);
    } else current.push(line.trim());
  }
  flush();
  return { prompt: out.join('\n').trim(), facets };
}

export type Action = { label: string; href: string };

const contact = (label: (typeof CONTACT_LINKS)[number]['label']) =>
  CONTACT_LINKS.find((l) => l.label === label)!.href;

function chipsFor(posts: readonly { slug: string; title: string }[]): Record<string, Action> {
  return {
    email: { label: 'Email me', href: contact('Email') },
    resume: { label: 'Resume', href: contact('Resume') },
    linkedin: { label: 'LinkedIn', href: contact('LinkedIn') },
    github: { label: 'GitHub', href: contact('GitHub') },
    game: { label: 'Play the game', href: PLAY_GAME.href },
    ...Object.fromEntries(posts.map((p) => [`post:${p.slug}`, { label: p.title, href: `/blog/${p.slug}` }])),
  };
}
export type Canned = { question: string; text: string; followUps: string[]; actions: Action[] };

export type Knowledge = {
  // Nithin's own writing: the model's only facts and its voice
  // `text` is me.md with facet ids, for the prompt; answers and follow-ups name facets
  me: { text: string; facets: Facet[] };
  // the chips the model may put under an answer, by id: only these, so it can't get a link wrong
  chips: Record<string, Action>;
  posts: { title: string; href: string }[];
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

  const files = new Map<string, Canned>();
  for (const file of fs.readdirSync(DIR)) {
    if (!file.endsWith('.md') || file === 'README.md') continue;
    const id = file.slice(0, -3);
    if (id !== ME && !(RESERVED_IDS as readonly string[]).includes(id)) {
      fail(id, `not a reserved reply; facts about Nithin go in ${ME}.md`);
    }
    const { data, content } = matter(fs.readFileSync(path.join(DIR, file), 'utf8'));
    const question = data.question ?? '';
    if (typeof question !== 'string') fail(id, '`question` must be a string');
    const followUps = data.followUps ?? [];
    if (!Array.isArray(followUps)) fail(id, '`followUps` must be a list of questions');
    const actions = data.actions ?? [];
    if (!Array.isArray(actions)) fail(id, '`actions` must be a list of [label](href) links');
    files.set(id, {
      question,
      text: resolveLinks(id, content.trim(), blogTitle),
      followUps: followUps.map(String),
      actions: actions.map((a) => {
        const m = typeof a === 'string' && resolveLinks(id, a.trim(), blogTitle).match(ACTION);
        return m
          ? { label: m[1], href: m[2] }
          : fail(id, `action ${JSON.stringify(a)} isn't a [label](href) link`);
      }),
    });
  }

  const me = files.get(ME) ?? fail(ME, 'missing');
  if (!me.text) fail(ME, 'is empty');
  const parsed = parseFacets(me.text);
  const reserved = Object.fromEntries(
    RESERVED_IDS.map((id) => [id, files.get(id) ?? fail(id, 'this reserved answer is missing')]),
  ) as Record<ReservedId, Canned>;

  const hrefs = new Set<string>([
    ...CONTACT_LINKS.map((l) => l.href),
    // not the nav's same-page #contact: answers link to /#contact
    ...NAV_LINKS.flatMap((l) => (l.href.startsWith('/') ? l.href : [])),
    '/',
    '/rss.xml',
    PLAY_GAME.href,
    ...posts.map((p) => `/blog/${p.slug}`),
    ...glossary.terms.flatMap((t) => t.href ?? []),
  ]);
  for (const f of files.values()) {
    for (const m of f.text.matchAll(LINK)) hrefs.add(m[2]);
    for (const a of f.actions) hrefs.add(a.href);
  }
  // nothing to link to until the first post is up
  if (!posts.length) for (const href of ['/blog', '/rss.xml']) hrefs.delete(href);
  const links = { hrefs: Object.fromEntries([...hrefs].map((h) => [h, iconFor(h)])), terms: glossary.terms };

  return {
    me: { text: parsed.prompt, facets: parsed.facets },
    chips: chipsFor(posts),
    posts: posts.map((p) => ({ title: p.title, href: `/blog/${p.slug}` })),
    reserved,
    links,
    opener: reserved['about-me'].question,
  };
});
