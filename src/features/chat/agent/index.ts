import { SITE } from '@/lib/site';
import { askable, getKnowledge, isAsked, type Action, type Entry, type Knowledge } from '../knowledge';
import { CHAT_BUDGET, estimateTokens, NYTHOS } from '../nythos';
import type { ReservedId } from '../types';
import { streamChat, toWireCalls, type ChatMessage, type ToolCall } from './openrouter';
import { BLOG, systemPrompt } from './prompt';
import { ReplyFilter } from './replyFilter';
import { runTool, TOOLS } from './tools';

export { openRouterConfigured } from './openrouter';

export type Turn = { role: 'user' | 'assistant'; content: string };

export type AgentEvent =
  | { type: 'text'; delta: string }
  | { type: 'tool'; label: string; href?: string }
  | { type: 'canned'; id: ReservedId }
  | {
      type: 'done';
      promptTokens: number;
      completionTokens: number;
      costUsd: number;
      followUps: string[];
      actions: Action[];
    };

// what /api/chat streams: the agent's events, plus the route's own early exits
export type ServerEvent = AgentEvent | { type: 'context_full' } | { type: 'error' };

const MAX_ROUNDS = 3;
const REPLAY_WORD_MS = 28;
// cited entries with no actions of their own fall back to these
const FALLBACK_ACTIONS = 'contact';

const estimateCost = (prompt: number, completion: number) =>
  (prompt * NYTHOS.pricePerMillion.input + completion * NYTHOS.pricePerMillion.output) / 1_000_000;

export async function systemPromptTokens() {
  return estimateTokens(systemPrompt(await getKnowledge()));
}

function actionsFor(k: Knowledge, entries: readonly Entry[]): Action[] {
  const own = entries.flatMap((e) => e.actions);
  const actions = own.length ? own : (k.byId[FALLBACK_ACTIONS]?.actions ?? []);
  return [...new Map(actions.map((a) => [a.href, a])).values()].slice(0, 3);
}

const askedIn = (history: readonly Turn[]) =>
  isAsked(history.filter((t) => t.role === 'user').map((t) => t.content));

// a question that is exactly an entry's (a follow-up chip, or typed word for word) is answered with the
// entry itself: no model call, so it's free, can't drift, and isn't held to the daily budget
export async function replayEntry(
  entry: Entry,
  history: readonly Turn[],
  emit: (e: AgentEvent) => void,
  signal: AbortSignal,
) {
  const k = await getKnowledge();
  for (const chunk of entry.body.split(/(?<=\s)/)) {
    if (signal.aborted) return;
    emit({ type: 'text', delta: chunk });
    await new Promise((resolve) => setTimeout(resolve, REPLAY_WORD_MS));
  }
  const asked = askedIn(history);
  emit({
    type: 'done',
    promptTokens: 0,
    completionTokens: 0,
    costUsd: 0,
    followUps: entry.followUps.filter((q) => !asked(q)),
    actions: actionsFor(k, [entry]),
  });
}

export async function runAgent(history: Turn[], emit: (e: AgentEvent) => void, signal: AbortSignal) {
  const k = await getKnowledge();
  const messages: ChatMessage[] = [{ role: 'system', content: systemPrompt(k) }, ...history];
  const filter = new ReplyFilter((delta) => emit({ type: 'text', delta }));
  let promptTokens = 0;
  let completionTokens = 0;
  let cost = 0;
  let reportedCost = true;

  for (let round = 0; round < MAX_ROUNDS; round++) {
    let calls: ToolCall[] | null = null;
    let text = '';
    for await (const event of streamChat({
      messages,
      tools: round < MAX_ROUNDS - 1 ? TOOLS : undefined,
      maxTokens: CHAT_BUDGET.maxOutputTokens,
      signal,
      referer: SITE.url,
      title: SITE.name,
    })) {
      if (event.type === 'text') {
        text += event.delta;
        filter.push(event.delta);
      } else if (event.type === 'tool_calls') {
        calls = event.calls;
      } else if (event.type === 'usage') {
        promptTokens = event.usage.prompt_tokens;
        completionTokens += event.usage.completion_tokens;
        if (typeof event.usage.cost === 'number') cost += event.usage.cost;
        else reportedCost = false;
      }
    }
    if (!calls?.length) break;

    messages.push({ role: 'assistant', content: text || null, tool_calls: toWireCalls(calls) });
    for (const call of calls) {
      const result = await runTool(call.name, call.arguments);
      emit({ type: 'tool', label: result.label, href: result.href });
      messages.push({ role: 'tool', tool_call_id: call.id, content: result.content });
    }
  }

  const verdict = filter.finish();
  const unanswered = verdict.sources?.length === 0;
  if (verdict.refused) emit({ type: 'canned', id: 'cant-answer' });
  else if (unanswered) emit({ type: 'canned', id: 'not-written' });

  const cited = (verdict.sources ?? []).flatMap((id) => (id === BLOG ? [] : (k.byId[id] ?? [])));
  const asked = askedIn(history);
  const followUps = verdict.followUps
    .map((id) => k.byId[id])
    .filter((e): e is Entry => Boolean(e) && askable(e))
    .map((e) => e.question)
    .filter((q) => !asked(q));
  const answered = !verdict.refused && !unanswered;
  emit({
    type: 'done',
    promptTokens,
    completionTokens,
    costUsd: reportedCost ? cost : estimateCost(promptTokens, completionTokens),
    followUps: answered ? followUps : [],
    actions: answered ? actionsFor(k, cited) : [],
  });
}
