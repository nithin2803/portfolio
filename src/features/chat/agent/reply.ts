import type { Turn } from './index';

// The model replies in JSON held to replySchema by the provider. Fields are written in schema order, so the
// answer streams: `refused` and `sources` decide whether it's shown at all, then `messages` streams as it's written.

// sources: Nithin's writing, a blog post read with the tools, an answer that only covers part of the question
export const ME = 'me';
export const BLOG = 'blog';
export const PARTIAL = 'partial';

// `about` names the me.md facets the answer drew on, and each follow-up the facet that would answer it. A follow-up
// is kept only if its facet is in a section the answer was about and hasn't been covered yet in the conversation, so
// the model words them freely but they stay on topic, never repeat, and are always ones Nithin's writing answers.
// `actions` are chip ids from Knowledge.chips, resolved to links by the server
export function replySchema(facets: readonly string[], chips: readonly string[]) {
  return {
    type: 'object',
    properties: {
      refused: { type: 'boolean' },
      sources: { type: 'array', items: { type: 'string', enum: [ME, BLOG, PARTIAL] } },
      messages: { type: 'array', items: { type: 'string' } },
      about: { type: 'array', items: { type: 'string', enum: facets } },
      actions: { type: 'array', items: { type: 'string', enum: chips } },
      followUps: {
        type: 'array',
        items: {
          type: 'object',
          properties: { question: { type: 'string' }, facet: { type: 'string', enum: facets } },
          required: ['question', 'facet'],
          additionalProperties: false,
        },
      },
    },
    required: ['refused', 'sources', 'messages', 'about', 'actions', 'followUps'],
    additionalProperties: false,
  };
}

export type Verdict = {
  refused: boolean;
  // [] when nothing Nithin wrote covers the question
  sources: string[];
  // the me.md facets the answer drew on, so later turns know they're covered
  about: string[];
  // chip ids, unchecked: the server keeps only ones it knows
  actions: string[];
  followUps: FollowUp[];
};

// a follow-up and the facet that answers it, so tapping it can bring that facet in
export type FollowUp = { question: string; facet: string };

const REFUSED = /"refused"\s*:\s*(true|false)/;
const SOURCES = /"sources"\s*:\s*(\[[^\]]*\])/;
const MESSAGES = /"messages"\s*:\s*\[/;
const MAX_FOLLOW_UPS = 3;
const MAX_ABOUT = 3;

// a JSON string's body, cut before an escape that's only half written
function decode(body: string) {
  let end = body.length;
  for (let i = 0; i < body.length; i++) {
    if (body[i] !== '\\') continue;
    const length = body[i + 1] === 'u' ? 6 : 2;
    if (i + length > body.length) {
      end = i;
      break;
    }
    i += length - 1;
  }
  try {
    return JSON.parse(`"${body.slice(0, end)}"`) as string;
  } catch {
    return '';
  }
}

// the `messages` written so far; the last may be unfinished
export function partialMessages(raw: string): string[] {
  const start = raw.search(MESSAGES);
  if (start < 0) return [];
  const messages: string[] = [];
  let i = raw.indexOf('[', start) + 1;
  while (i < raw.length && raw[i] !== ']') {
    if (raw[i] !== '"') {
      i++;
      continue;
    }
    let j = i + 1;
    while (j < raw.length && raw[j] !== '"') j += raw[j] === '\\' ? 2 : 1;
    messages.push(decode(raw.slice(i + 1, Math.min(j, raw.length))));
    i = j + 1;
  }
  return messages;
}

const strings = (value: unknown) =>
  Array.isArray(value) ? value.filter((s): s is string => typeof s === 'string') : [];

function parse(json?: string): unknown {
  try {
    return json && JSON.parse(json);
  } catch {
    return undefined;
  }
}

// Nithin doesn't write em dashes, but the model leans on them however it's asked
const noDashes = (text: string) => text.replace(/\s*[—–]\s*/g, ', ');

const asText = (messages: readonly string[]) =>
  messages
    .map((m) => m.trim())
    .filter(Boolean)
    .join('\n\n');

// streams the messages of an answer through as text (a blank line between messages, so each is its own
// bubble), and nothing of a refusal or an answer with no sources
export class ReplyStream {
  private raw = '';
  private shown = '';

  constructor(
    private readonly emit: (text: string) => void,
    private readonly facets: FacetIndex,
    // facets earlier answers in the conversation already drew on
    private readonly covered: ReadonlySet<string> = new Set(),
  ) {}

  push(delta: string) {
    this.raw += delta;
    if (this.raw.match(REFUSED)?.[1] !== 'false') return;
    const sources = this.raw.match(SOURCES)?.[1];
    if (!sources || /^\[\s*\]$/.test(sources)) return;
    this.show(asText(partialMessages(this.raw)));
  }

  // trailing whitespace is held back so a dash written after it can still become a comma
  private show(raw: string) {
    const text = noDashes(raw).trimEnd();
    if (text.length <= this.shown.length || !text.startsWith(this.shown)) return;
    this.emit(text.slice(this.shown.length));
    this.shown = text;
  }

  finish(): Verdict {
    let reply: {
      refused?: unknown;
      sources?: unknown;
      messages?: unknown;
      about?: unknown;
      actions?: unknown;
      followUps?: unknown;
    } = {};
    try {
      reply = JSON.parse(this.raw);
    } catch {
      // cut off mid-reply: fall back to what streamed
    }
    const sources = strings(reply.sources ?? parse(this.raw.match(SOURCES)?.[1]));
    const refused = reply.refused === true || this.raw.match(REFUSED)?.[1] === 'true';
    if (!refused && sources.length) this.show(asText(strings(reply.messages ?? partialMessages(this.raw))));
    return {
      // sources but nothing to say is as good as a refusal
      refused: refused || (sources.length > 0 && !this.shown),
      sources,
      about: this.about(reply.about).map((f) => f.id),
      actions: strings(reply.actions),
      followUps: this.followUps(reply.followUps, this.about(reply.about)).slice(0, MAX_FOLLOW_UPS),
    };
  }

  // a facet the model named loosely ("orbi #2" for "Orbi #2") still counts: hosts don't all enforce the enum
  private facet(name: unknown) {
    return typeof name === 'string' ? this.facets.get(facetKey(name)) : undefined;
  }

  // capped, since an answer that touched everything would let a follow-up about anything through
  private about(value: unknown) {
    const found = strings(value).flatMap((s) => this.facet(s) ?? []);
    return [...new Map(found.map((f) => [f.id, f])).values()].slice(0, MAX_ABOUT);
  }

  private followUps(value: unknown, about: readonly IndexedFacet[]): FollowUp[] {
    const sections = new Set(about.map((f) => f.section));
    const used = new Set([...this.covered, ...about.map((f) => f.id)]);
    const kept: FollowUp[] = [];
    const dropped: { followUp: unknown; why: string }[] = [];
    for (const f of Array.isArray(value) ? value : []) {
      const question = typeof f?.question === 'string' ? f.question.trim() : '';
      const facet = this.facet(f?.facet);
      const why = !question
        ? 'no question'
        : !facet
          ? 'unknown facet'
          : !sections.has(facet.section)
            ? 'off topic'
            : used.has(facet.id)
              ? 'already covered'
              : '';
      if (why) dropped.push({ followUp: f, why });
      else {
        kept.push({ question, facet: facet!.id });
        used.add(facet!.id);
      }
    }
    if (dropped.length) console.warn(`[chat] dropped follow-ups: ${JSON.stringify(dropped)}`);
    return kept;
  }
}

// each way a facet can be named, to the facet: case and punctuation don't matter
type IndexedFacet = { id: string; section: string };
export type FacetIndex = ReadonlyMap<string, IndexedFacet>;
export function facetIndex(facets: readonly IndexedFacet[]): FacetIndex {
  return new Map(facets.map((f) => [facetKey(f.id), { id: f.id, section: f.section }]));
}
const facetKey = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();

// the held-back facet behind the question just asked, when it's a follow-up the last answer offered
export function tappedFacet<F extends { id: string; more: boolean }>(
  facets: readonly F[],
  history: readonly Turn[],
) {
  const [answer, question] = history.slice(-2);
  if (answer?.role !== 'assistant' || question?.role !== 'user') return undefined;
  const id = answer.offeredFacets?.[answer.offered?.indexOf(question.content) ?? -1];
  return facets.find((f) => f.more && f.id === id);
}
