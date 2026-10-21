import type { Term } from '@/lib/glossary';
import type { LinkIcon } from '@/lib/icons';
import { annotate, markerOf, NO_ICON, termFor } from '@/lib/terms.mjs';
import type { Paragraph, Segment } from './types';

// built on the server: the only hrefs an answer may link to, and the names that get icons (content/icons.yaml)
export type LinkCatalog = {
  hrefs: Readonly<Record<string, LinkIcon | null>>;
  terms: readonly Term[];
};

const LINK = /\[([^\]\n]*)\]\(([^)\s]+)\)/g;

// hide a half-written link or marker at the end of a streaming reply until it closes
export const stableText = (text: string) => text.replace(/\[[^\]\n]*(\]\([^)\n]*)?$/, '');

const tidy = (line: string) =>
  line
    .replace(/^\s{0,3}#{1,6}\s+/, '')
    .replace(/^\s*[-*•]\s+/, '')
    .replace(/\*\*|__|`/g, '');

const named = (highlight: string, term: Term): Segment =>
  term.emoji ? { highlight, emoji: term.emoji } : { highlight, brand: { icon: term.icon!, href: term.href } };

// plain text, with the first mention of each glossary name given its icon
function plain(text: string, terms: readonly Term[], seen: Set<string>): Segment[] {
  return annotate(text, terms, seen).map((s) => {
    const term = s.id && terms.find((t) => t.id === s.id);
    return term ? named(s.text, term) : { text: s.text };
  });
}

// [Name](@id): icons only ever come from the glossary, so an unknown id (or @-) is just the name
function marked(label: string, id: string, terms: readonly Term[], seen: Set<string>): Segment {
  const term = id !== NO_ICON && !seen.has(id) ? terms.find((t) => t.id === id) : undefined;
  if (!term) return { text: label };
  seen.add(term.id);
  return named(label, term);
}

function parseParagraph(text: string, catalog: LinkCatalog, seen: Set<string>): Paragraph {
  const segments: Segment[] = [];
  let at = 0;
  for (const m of text.matchAll(LINK)) {
    if (m.index > at) segments.push(...plain(text.slice(at, m.index), catalog.terms, seen));
    const [, label, href] = m;
    const marker = markerOf(href);
    if (marker !== undefined) {
      segments.push(marked(label, marker, catalog.terms, seen));
    } else {
      // a link already shows its own icon, so the name it labels counts as mentioned
      const id = label && termFor(label, catalog.terms);
      if (id) seen.add(id);
      segments.push(
        href in catalog.hrefs && label ? { link: label, href, icon: catalog.hrefs[href] } : { text: label },
      );
    }
    at = m.index + m[0].length;
  }
  if (at < text.length) segments.push(...plain(text.slice(at), catalog.terms, seen));
  return segments;
}

export function parseReply(text: string, catalog: LinkCatalog): Paragraph[] {
  const seen = new Set<string>();
  return text
    .trim()
    .split(/\n\s*\n/)
    .map((p) => p.split('\n').map(tidy).join(' ').trim())
    .filter(Boolean)
    .map((p) => parseParagraph(p, catalog, seen));
}

export function words(paragraphs: readonly Paragraph[]): string[] {
  const out: string[] = [];
  for (const p of paragraphs) {
    for (const s of p) {
      const text = 'text' in s ? s.text : 'highlight' in s ? s.highlight : s.link;
      out.push(...text.split(/\s+/).filter(Boolean));
    }
  }
  return out;
}
