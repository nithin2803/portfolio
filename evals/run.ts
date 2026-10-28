// bun run evals                     asks every case in evals/cases.yaml through the real agent (paid: one model call
//                                   or more per turn) and saves the answers to evals/runs/ for grading
// bun run evals --model <id>        the same on another OpenRouter model, to tell prompt problems from model ones
// bun run evals --only <id,id>      just these cases
import fs from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';
import type { Turn } from '@/features/chat/agent';
import { checkTurn, TAP, type Chips, type Expect, type Run, type RunCase, type RunTurn } from './types';

const CONCURRENCY = 4;
const TIMEOUT_MS = 60_000;

const ROOT = path.join(process.cwd(), 'evals');
const { values } = parseArgs({ options: { model: { type: 'string' }, only: { type: 'string' } } });
if (values.model) process.env.CHAT_MODEL = values.model;

// imported after CHAT_MODEL is set
const { runAgent } = await import('@/features/chat/agent');
const { getKnowledge } = await import('@/features/chat/knowledge');
const { systemPrompt } = await import('@/features/chat/agent/prompt');
const { NYTHOS } = await import('@/features/chat/nythos');

type CaseDef = { id: string; turns: string[]; good?: string; expect?: Expect; chips?: Chips };

const groups = Bun.YAML.parse(fs.readFileSync(path.join(ROOT, 'cases.yaml'), 'utf8')) as Record<
  string,
  CaseDef[]
>;
const only = values.only?.split(',');
const cases = Object.entries(groups)
  .flatMap(([group, list]) => list.map((c) => ({ ...c, group })))
  .filter((c) => !only || only.includes(c.id));

const k = await getKnowledge();
const held = new Set(k.me.facets.filter((f) => f.more).map((f) => f.id));

// the agent logs its verdict right before it emits `done`, with nothing awaited in between, so the last line seen
// belongs to the turn that's finishing even with cases running side by side
let lastVerdict = '';
// the same holds for the follow-ups the server dropped, logged just before the verdict
let lastDropped: RunTurn['dropped'] = [];
console.warn = (...args: unknown[]) => {
  const line = args.join(' ');
  const prefix = '[chat] dropped follow-ups: ';
  if (line.startsWith(prefix)) lastDropped = JSON.parse(line.slice(prefix.length));
};
console.info = (...args: unknown[]) => {
  const line = args.join(' ');
  if (line.startsWith('[chat] reply:')) lastVerdict = line.slice('[chat] reply: '.length);
};

async function ask(history: Turn[], question: string) {
  const turn: RunTurn = {
    question,
    text: '',
    canned: null,
    followUps: [],
    verdict: '',
    ms: 0,
    promptTokens: 0,
    completionTokens: 0,
    costUsd: 0,
    checks: [],
  };
  const start = performance.now();
  try {
    await runAgent(
      [...history, { role: 'user', content: question }],
      (e) => {
        if (e.type === 'text') turn.text += e.delta;
        else if (e.type === 'canned') turn.canned = e.id;
        else if (e.type === 'done') {
          turn.verdict = lastVerdict;
          turn.dropped = lastDropped;
          lastDropped = [];
          turn.followUps = e.followUps;
          turn.actions = e.actions.map((x) => x.label);
          turn.about = e.about;
          turn.followUpFacets = e.followUpFacets;
          turn.promptTokens = e.promptTokens;
          turn.completionTokens = e.completionTokens;
          turn.costUsd = e.costUsd;
        }
      },
      AbortSignal.timeout(TIMEOUT_MS),
    );
  } catch (err) {
    turn.error = err instanceof Error ? err.message : String(err);
  }
  turn.ms = Math.round(performance.now() - start);
  // only ever set from a reserved id
  if (turn.canned) turn.text = k.reserved[turn.canned as keyof typeof k.reserved].text;
  return turn;
}

async function runCase(c: (typeof cases)[number]): Promise<RunCase> {
  const history: Turn[] = [];
  const turns: RunTurn[] = [];
  for (const [i, typed] of c.turns.entries()) {
    // a visitor tapping the first follow-up the last answer offered
    const question = typed === TAP ? turns.at(-1)?.followUps[0] : typed;
    if (!question) {
      turns.at(-1)?.checks.push({ name: 'a follow-up to tap', pass: false, detail: 'none offered' });
      break;
    }
    const turn = await ask(history, question);
    const last = i === c.turns.length - 1;
    const offered = new Set(turns.flatMap((t) => t.followUps.map((q) => q.toLowerCase())));
    turn.checks = checkTurn(
      turn,
      k.links.hrefs,
      offered,
      last ? c.expect : undefined,
      last ? c.chips : undefined,
    );
    // held-back facets are for follow-ups: an opening answer never leads with one
    if (i === 0 && held.size && !turn.canned) {
      const led = (turn.about ?? []).filter((id) => held.has(id));
      turn.checks.push({
        name: 'leads with nothing held back',
        pass: !led.length,
        detail: led.join(', ') || undefined,
      });
    }
    turns.push(turn);
    // the site leaves a canned reply and its question out of what it sends next, so the evals do too
    if (!turn.canned && !turn.error && turn.text) {
      history.push(
        { role: 'user', content: question },
        {
          role: 'assistant',
          content: turn.text,
          about: turn.about,
          offered: turn.followUps,
          offeredFacets: turn.followUpFacets,
        },
      );
    }
  }
  const failed = turns.flatMap((t) => t.checks).filter((x) => !x.pass).length;
  process.stdout.write(`${failed ? '✗' : '✓'} ${c.id}${failed ? ` (${failed} failed)` : ''}\n`);
  return { id: c.id, group: c.group, good: c.good, expect: c.expect, chips: c.chips, turns };
}

const results: RunCase[] = new Array(cases.length);
let next = 0;
await Promise.all(
  Array.from({ length: Math.min(CONCURRENCY, cases.length) }, async () => {
    while (next < cases.length) {
      const i = next++;
      results[i] = await runCase(cases[i]);
    }
  }),
);

const model = process.env.CHAT_MODEL || NYTHOS.openRouterId;
const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const id = `${stamp}_${model.replace(/[^a-z0-9.-]+/gi, '-')}`;
const run: Run = {
  id,
  model,
  createdAt: new Date().toISOString(),
  // kept with the answers so a grade can always be traced back to the prompt that earned it
  prompt: systemPrompt(k),
  cases: results,
  grades: {},
};
fs.mkdirSync(path.join(ROOT, 'runs'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'runs', `${id}.json`), JSON.stringify(run, null, 2));

const turns = results.flatMap((c) => c.turns);
const checks = turns.flatMap((t) => t.checks);
const cost = turns.reduce((n, t) => n + t.costUsd, 0);
const avgMs = Math.round(turns.reduce((n, t) => n + t.ms, 0) / turns.length);
process.stdout.write(
  `\n${checks.filter((x) => x.pass).length}/${checks.length} checks passed, ${turns.length} turns, ` +
    `avg ${avgMs}ms, $${cost.toFixed(4)}\nevals/runs/${id}.json · grade it with: bun run evals:grade\n`,
);
