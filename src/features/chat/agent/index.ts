import { SITE } from '@/lib/site';
import { getKnowledge, isAsked, type Action, type Canned } from '../knowledge';
import { CHAT_BUDGET, estimateTokens, NYTHOS } from '../nythos';
import type { ReservedId } from '../types';
import { streamChat, toWireCalls, type ChatMessage, type ToolCall } from './openrouter';
import { systemPrompt } from './prompt';
import { facetIndex, PARTIAL, ReplyStream, replySchema, tappedFacet } from './reply';
import { moreLabel, runTool, toolsFor } from './tools';

export { openRouterConfigured } from './openrouter';

// an answer also carries what it drew on (`about`, me.md facet ids) and the follow-ups it offered, so later answers
// don't suggest them again. Both only steer suggestions: the model never sees them
export type Turn = {
  role: 'user' | 'assistant';
  content: string;
  about?: string[];
  offered?: string[];
  // the facet behind each of `offered`, in the same order
  offeredFacets?: string[];
};

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
      // the facet behind each follow-up, in the same order, for the client to send back
      followUpFacets: string[];
      actions: Action[];
      about: string[];
    };

// what /api/chat streams: the agent's events, plus the route's own early exits
export type ServerEvent = AgentEvent | { type: 'context_full' } | { type: 'error' };

const MAX_ROUNDS = 3;
const MAX_CHIPS = 2;
const REPLAY_WORD_MS = 28;

const estimateCost = (prompt: number, completion: number) =>
  (prompt * NYTHOS.pricePerMillion.input + completion * NYTHOS.pricePerMillion.output) / 1_000_000;

export async function systemPromptTokens() {
  return estimateTokens(systemPrompt(await getKnowledge()));
}

// a question typed, or a follow-up already offered, isn't offered again
const askedIn = (history: readonly Turn[]) =>
  isAsked(history.flatMap((t) => (t.role === 'user' ? [t.content] : (t.offered ?? []))));

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
    followUpFacets: [],
    actions: canned.actions,
    about: [],
  });
}

export async function runAgent(history: Turn[], emit: (e: AgentEvent) => void, signal: AbortSignal) {
  const k = await getKnowledge();
  const messages: ChatMessage[] = [
    { role: 'system', content: systemPrompt(k) },
    ...history.map(({ role, content }) => ({ role, content })),
  ];
  // a tapped follow-up for something held back brings that facet in, so it needs no read_more round
  const tapped = tappedFacet(k.me.facets, history);
  if (tapped) {
    messages.splice(-1, 0, {
      role: 'system',
      content: `The visitor tapped a follow-up you offered about [${tapped.id}]. Here it is in full: ${tapped.text}`,
    });
    emit({ type: 'tool', label: moreLabel(tapped.section) });
  }
  const facets = facetIndex(k.me.facets);
  const covered = new Set(history.flatMap((t) => t.about ?? []));
  const newReply = () => new ReplyStream((delta) => emit({ type: 'text', delta }), facets, covered);
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
      tools: round < MAX_ROUNDS - 1 ? toolsFor(k) : undefined,
      maxTokens: CHAT_BUDGET.maxOutputTokens,
      schema: replySchema(
        k.me.facets.map((f) => f.id),
        Object.keys(k.chips),
      ),
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
      const result = await runTool(k, call.name, call.arguments);
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

  // a partial answer hands off to Nithin with the same chips as one nothing covers; otherwise the model's picks
  const partial = verdict.sources.includes(PARTIAL);
  const picked = [...new Set(verdict.actions)].flatMap((id) => k.chips[id] ?? []).slice(0, MAX_CHIPS);
  const actions = partial ? k.reserved['not-written'].actions : picked;
  const asked = askedIn(history);
  const followUps = verdict.followUps.filter(
    (f) => f.question.length <= CHAT_BUDGET.maxQuestionChars && !asked(f.question),
  );
  const answered = !verdict.refused && !unanswered;
  console.info(
    `[chat] reply: sources ${verdict.sources.join(', ') || 'none'}, ${verdict.refused ? 'refused, ' : ''}about ${verdict.about.join(', ') || 'nothing'}, ${followUps.length} follow-ups, ${answered ? actions.length : 0} chips`,
  );
  emit({
    type: 'done',
    promptTokens,
    completionTokens,
    generationMs,
    costUsd: reportedCost ? cost : estimateCost(promptTokens, completionTokens),
    followUps: answered ? followUps.map((f) => f.question) : [],
    followUpFacets: answered ? followUps.map((f) => f.facet) : [],
    actions: answered ? actions : [],
    about: answered ? verdict.about : [],
  });
}
