import {
  openRouterConfigured,
  replayEntry,
  runAgent,
  systemPromptTokens,
  type ServerEvent,
  type Turn,
} from '@/features/chat/agent';
import { overBudget, rateLimited, recordSpend } from '@/features/chat/guards';
import { entryFor, getKnowledge } from '@/features/chat/knowledge';
import { CHAT_BUDGET, estimateTokens, NYTHOS } from '@/features/chat/nythos';

export const maxDuration = 30;

const MAX_BODY = 32 * 1024;
const MAX_ASSISTANT_CHARS = 4000;

const badRequest = () => Response.json({ error: 'bad request' }, { status: 400 });
const tooLarge = () => Response.json({ error: 'too large' }, { status: 413 });

function clientKey(request: Request) {
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  return forwarded || request.headers.get('x-real-ip') || 'anonymous';
}

function sameOrigin(request: Request) {
  const origin = request.headers.get('origin');
  return !origin || origin === new URL(request.url).origin;
}

const clean = (s: string) =>
  s
    .replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .trim();

function parseHistory(json: string): Turn[] | null {
  let body: unknown;
  try {
    body = JSON.parse(json);
  } catch {
    return null;
  }
  const raw = (body as { messages?: unknown })?.messages;
  if (!Array.isArray(raw) || !raw.length) return null;
  const turns: Turn[] = [];
  for (const m of raw.slice(-CHAT_BUDGET.maxHistoryMessages)) {
    if (!m || (m.role !== 'user' && m.role !== 'assistant') || typeof m.content !== 'string') return null;
    const limit = m.role === 'user' ? CHAT_BUDGET.maxQuestionChars : MAX_ASSISTANT_CHARS;
    const content = clean(m.content).slice(0, limit);
    if (content) turns.push({ role: m.role, content });
  }
  while (turns[0]?.role === 'assistant') turns.shift();
  return turns.at(-1)?.role === 'user' ? turns : null;
}

function sse(events: (send: (e: ServerEvent) => void) => Promise<void>, signal: AbortSignal) {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (e: ServerEvent) => {
        if (!signal.aborted) controller.enqueue(encoder.encode(`data: ${JSON.stringify(e)}\n\n`));
      };
      try {
        await events(send);
      } catch (err) {
        if (!signal.aborted) {
          console.error('[chat]', err);
          send({ type: 'error' });
        }
      } finally {
        controller.close();
      }
    },
  });
  return new Response(stream, {
    headers: {
      'content-type': 'text/event-stream; charset=utf-8',
      'cache-control': 'no-cache, no-transform',
      'x-accel-buffering': 'no',
    },
  });
}

export async function POST(request: Request) {
  if (!request.headers.get('content-type')?.includes('application/json') || !sameOrigin(request)) {
    return badRequest();
  }
  // turn big bodies away before reading them when the header says so
  if (Number(request.headers.get('content-length')) > MAX_BODY) return tooLarge();
  const raw = await request.text();
  if (raw.length > MAX_BODY) return tooLarge();

  const turns = parseHistory(raw);
  if (!turns) return badRequest();

  return sse(async (send) => {
    if (rateLimited(clientKey(request))) return send({ type: 'canned', id: 'slow-down' });
    const entry = entryFor(await getKnowledge(), turns.at(-1)!.content);
    if (entry) return replayEntry(entry, turns.slice(0, -1), send, request.signal);
    if (overBudget()) return send({ type: 'canned', id: 'out-of-tokens' });
    if (!openRouterConfigured()) return send({ type: 'canned', id: 'offline' });

    const historyTokens = turns.reduce((n, t) => n + estimateTokens(t.content), 0);
    if ((await systemPromptTokens()) + historyTokens + CHAT_BUDGET.maxOutputTokens > NYTHOS.contextWindow) {
      return send({ type: 'context_full' });
    }

    await runAgent(
      turns,
      (event) => {
        if (event.type === 'done') recordSpend(event.costUsd);
        send(event);
      },
      request.signal,
    );
  }, request.signal);
}
