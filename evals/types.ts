export type Expect = 'answer' | 'partial' | 'not-written' | 'refused';
// the chips a final answer should get: none, or labels it may pick from (any of them, or none)
export type Chips = 'none' | string[];
// a turn written as this taps the first follow-up the previous answer offered
export const TAP = '@follow-up';

export type Check = { name: string; pass: boolean; detail?: string };

export type RunTurn = {
  question: string;
  // the messages joined by blank lines, as the site receives them; a canned reply's own text
  text: string;
  canned: string | null;
  followUps: string[];
  // the chips' labels
  actions?: string[];
  // the me.md facets it drew on
  about?: string[];
  // the facet behind each follow-up
  followUpFacets?: string[];
  // follow-ups the model wrote that the server dropped, and why
  dropped?: { followUp: unknown; why: string }[];
  // the agent's own summary: sources, refused, follow-up and chip counts
  verdict: string;
  ms: number;
  promptTokens: number;
  completionTokens: number;
  costUsd: number;
  checks: Check[];
  error?: string;
};

export type RunCase = {
  id: string;
  group: string;
  good?: string;
  expect?: Expect;
  chips?: Chips;
  turns: RunTurn[];
};

// one grade per turn, keyed `${caseId}/${turnIndex}`; scores are 1–5, unset until graded
export type Grade = {
  accuracy?: number;
  voice?: number;
  focus?: number;
  chips?: number;
  followUps?: (number | undefined)[];
  notes?: string;
};

export type Run = {
  id: string;
  model: string;
  createdAt: string;
  prompt: string;
  cases: RunCase[];
  grades: Record<string, Grade>;
};

const MAX_MESSAGES = 3;
// a long text message, as a share of a phone screen's width this wraps to about three lines
const MAX_MESSAGE_CHARS = 200;
const LINK = /\[[^\]]*\]\(([^)\s]+)\)/g;

export const messagesOf = (text: string) =>
  text
    .split(/\n{2,}/)
    .map((m) => m.trim())
    .filter(Boolean);

function outcome(t: RunTurn): Expect | 'error' {
  if (t.error) return 'error';
  if (t.canned === 'cant-answer' || t.verdict.includes('refused')) return 'refused';
  if (t.canned === 'not-written') return 'not-written';
  return /\bpartial\b/.test(t.verdict) ? 'partial' : 'answer';
}

// `offered`: follow-ups earlier turns in the case offered, lowercased
export function checkTurn(
  t: RunTurn,
  hrefs: Readonly<Record<string, unknown>>,
  offered: ReadonlySet<string>,
  expect?: Expect,
  chips?: Chips,
): Check[] {
  if (t.error) return [{ name: 'no error', pass: false, detail: t.error }];
  const checks: Check[] = [];
  const got = outcome(t);
  if (expect) checks.push({ name: `outcome: ${expect}`, pass: got === expect, detail: `got ${got}` });
  if (t.canned) return checks;
  if (chips) {
    const picked = t.actions ?? [];
    const pass = chips === 'none' ? !picked.length : picked.every((a) => chips.includes(a));
    checks.push({
      name: chips === 'none' ? 'no chips' : `chips from: ${chips.join(', ')}`,
      pass,
      detail: picked.join(', ') || 'none',
    });
  }

  const messages = messagesOf(t.text);
  const dashes = t.text.match(/[—–]/g)?.length ?? 0;
  checks.push({ name: 'no em dashes', pass: dashes === 0, detail: dashes ? `${dashes} found` : undefined });
  checks.push({
    name: `at most ${MAX_MESSAGES} messages`,
    pass: messages.length <= MAX_MESSAGES,
    detail: `${messages.length}`,
  });
  const longest = Math.max(0, ...messages.map((m) => m.length));
  checks.push({
    name: `messages under ${MAX_MESSAGE_CHARS} chars`,
    pass: longest <= MAX_MESSAGE_CHARS,
    detail: `longest ${longest}`,
  });
  const bad = [...t.text.matchAll(LINK)].map((m) => m[1]).filter((h) => !h.startsWith('@') && !(h in hrefs));
  checks.push({ name: 'links allowed', pass: bad.length === 0, detail: bad.join(', ') || undefined });
  checks.push({
    name: 'at most 2 follow-ups',
    pass: t.followUps.length <= 2,
    detail: `${t.followUps.length}`,
  });
  const repeats = t.followUps.filter((q) => offered.has(q.toLowerCase()));
  checks.push({
    name: 'no repeated follow-ups',
    pass: !repeats.length,
    detail: repeats.join(', ') || undefined,
  });
  return checks;
}
