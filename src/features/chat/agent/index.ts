import { SITE } from '@/lib/site';
import { getKnowledge, isAsked, type Action, type Canned } from '../knowledge';
import { CHAT_BUDGET, estimateTokens, NYTHOS } from '../nythos';
import type { ReservedId } from '../types';
import { streamChat, toWireCalls, type ChatMessage, type ToolCall } from './openrouter';
import { systemPrompt } from './prompt';
import { PARTIAL, ReplyStream, replySchema } from './reply';
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
      generationMs: number;
      costUsd: number;
      followUps: string[];
      actions: Action[];
    };

// what /api/chat streams: the agent's events, plus the route's own early exits
export type ServerEvent = AgentEvent | { type: 'context_full' } | { type: 'error' };

const MAX_ROUNDS = 3;
const REPLAY_WORD_MS = 28;

const estimateCost = (prompt: number, completion: number) =>
  (prompt * NYTHOS.pricePerMillion.input + completion * NYTHOS.pricePerMillion.output) / 1_000_000;

export async function systemPromptTokens() {
  return estimateTokens(systemPrompt(await getKnowledge()));
}

const askedIn = (history: readonly Turn[]) =>
  isAsked(history.filter((t) => t.role === 'user').map((t) => t.content));

// a canned reply streamed like a model's: no model call, so it's free, can't drift, and isn't held to the daily budget
export async function replayCanned(
  canned: Canned,
  history: readonly Turn[],
  emit: (e: AgentEvent) => void,
  signal: AbortSignal,
) {
  for (const chunk of canned.text.split(/(?<=\s)/)) {
    if (signal.aborted) return;
    emit({ type: 'text', delta: chunk });
    await new Promise((resolve) => setTimeout(resolve, REPLAY_WORD_MS));
  }
  const asked = askedIn(history);
  emit({
    type: 'done',
    promptTokens: 0,
    completionTokens: 0,
    generationMs: 0,
    costUsd: 0,
    followUps: canned.followUps.filter((q) => !asked(q)),
    actions: canned.actions,
  });
}

export async function runAgent(history: Turn[], emit: (e: AgentEvent) => void, signal: AbortSignal) {
  const k = await getKnowledge();
  const messages: ChatMessage[] = [{ role: 'system', content: systemPrompt(k) }, ...history];
  const newReply = () => new ReplyStream((delta) => emit({ type: 'text', delta }));
  let reply = newReply();
  let promptTokens = 0;
  let completionTokens = 0;
  let generationMs = 0;
  let cost = 0;
  let reportedCost = true;

  for (let round = 0; round < MAX_ROUNDS; round++) {
    let calls: ToolCall[] | null = null;
    let text = '';
    for await (const event of streamChat({
      messages,
      tools: round < MAX_ROUNDS - 1 ? TOOLS : undefined,
      maxTokens: CHAT_BUDGET.maxOutputTokens,
      schema: replySchema(k.me.followUps),
      signal,
      referer: SITE.url,
      title: SITE.name,
    })) {
      if (event.type === 'text') {
        text += event.delta;
        reply.push(event.delta);
      } else if (event.type === 'tool_calls') {
        calls = event.calls;
      } else if (event.type === 'usage') {
        promptTokens = event.usage.prompt_tokens;
        completionTokens += event.usage.completion_tokens;
        if (typeof event.usage.cost === 'number') cost += event.usage.cost;
        else reportedCost = false;
      } else if (event.type === 'timing') {
        generationMs += event.generationMs;
      }
    }
    if (!calls?.length) break;

    messages.push({ role: 'assistant', content: text || null, tool_calls: toWireCalls(calls) });
    for (const call of calls) {
      const result = await runTool(call.name, call.arguments);
      emit({ type: 'tool', label: result.label, href: result.href });
      messages.push({ role: 'tool', tool_call_id: call.id, content: result.content });
    }
    // a round that called a tool wasn't the answer
    reply = newReply();
  }

  const verdict = reply.finish();
  const unanswered = !verdict.refused && verdict.sources.length === 0;
  if (verdict.refused) emit({ type: 'canned', id: 'cant-answer' });
  else if (unanswered) emit({ type: 'canned', id: 'not-written' });

  // a partial answer hands off to Nithin with the same chips as one nothing covers
  const partial = verdict.sources.includes(PARTIAL);
  const actions = partial ? k.reserved['not-written'].actions : k.me.actions;
  const asked = askedIn(history);
  const followUps = verdict.followUps.filter((q) => q.length <= CHAT_BUDGET.maxQuestionChars && !asked(q));
  const answered = !verdict.refused && !unanswered;
  console.info(
    `[chat] reply: sources ${verdict.sources.join(', ') || 'none'}, ${verdict.refused ? 'refused, ' : ''}${followUps.length} follow-ups, ${answered ? actions.length : 0} chips`,
  );
  emit({
    type: 'done',
    promptTokens,
    completionTokens,
    generationMs,
    costUsd: reportedCost ? cost : estimateCost(promptTokens, completionTokens),
    followUps: answered ? followUps : [],
    actions: answered ? actions : [],
  });
}
