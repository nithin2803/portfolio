// The model replies in JSON held to replySchema by the provider. Fields are written in schema order, so the
// answer streams: `refused` and `sources` decide whether it's shown at all, then `messages` streams as it's written.

// sources: Nithin's writing, a blog post read with the tools, an answer that only covers part of the question
export const ME = 'me';
export const BLOG = 'blog';
export const PARTIAL = 'partial';

// follow-ups can only be questions from `questions` (me.md's list), so they're always ones Nithin's writing answers
export function replySchema(questions: readonly string[]) {
  return {
    type: 'object',
    properties: {
      refused: { type: 'boolean' },
      sources: { type: 'array', items: { type: 'string', enum: [ME, BLOG, PARTIAL] } },
      messages: { type: 'array', items: { type: 'string' } },
      followUps: { type: 'array', items: { type: 'string', enum: questions } },
    },
    required: ['refused', 'sources', 'messages', 'followUps'],
    additionalProperties: false,
  };
}

export type Verdict = {
  refused: boolean;
  // [] when nothing Nithin wrote covers the question
  sources: string[];
  followUps: string[];
};

const REFUSED = /"refused"\s*:\s*(true|false)/;
const SOURCES = /"sources"\s*:\s*(\[[^\]]*\])/;
const MESSAGES = /"messages"\s*:\s*\[/;
const MAX_FOLLOW_UPS = 3;

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

  constructor(private readonly emit: (text: string) => void) {}

  push(delta: string) {
    this.raw += delta;
    if (this.raw.match(REFUSED)?.[1] !== 'false') return;
    const sources = this.raw.match(SOURCES)?.[1];
    if (!sources || /^\[\s*\]$/.test(sources)) return;
    this.show(asText(partialMessages(this.raw)));
  }

  private show(text: string) {
    if (text.length <= this.shown.length || !text.startsWith(this.shown)) return;
    this.emit(text.slice(this.shown.length));
    this.shown = text;
  }

  finish(): Verdict {
    let reply: { refused?: unknown; sources?: unknown; messages?: unknown; followUps?: unknown } = {};
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
      followUps: strings(reply.followUps)
        .map((q) => q.trim())
        .filter(Boolean)
        .slice(0, MAX_FOLLOW_UPS),
    };
  }
}
