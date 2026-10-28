import { NYTHOS } from '../nythos';

const ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions';

export type ToolCall = { id: string; name: string; arguments: string };

export type ChatMessage =
  | { role: 'system' | 'user'; content: string }
  | { role: 'assistant'; content: string | null; tool_calls?: WireToolCall[] }
  | { role: 'tool'; tool_call_id: string; content: string };

type WireToolCall = { id: string; type: 'function'; function: { name: string; arguments: string } };

export type ToolSpec = {
  type: 'function';
  function: { name: string; description: string; parameters: Record<string, unknown> };
};

export type Usage = { prompt_tokens: number; completion_tokens: number; cost?: number | null };

export type StreamEvent =
  | { type: 'text'; delta: string }
  | { type: 'tool_calls'; calls: ToolCall[] }
  | { type: 'usage'; usage: Usage }
  // first token to last, measured here because the client sees the answer arrive in bursts
  | { type: 'timing'; generationMs: number }
  | { type: 'finish'; reason: string };

export class OpenRouterError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
  }
}

export const openRouterConfigured = () => Boolean(process.env.OPENROUTER_API_KEY);

export function toWireCalls(calls: ToolCall[]): WireToolCall[] {
  return calls.map((c) => ({
    id: c.id,
    type: 'function',
    function: { name: c.name, arguments: c.arguments },
  }));
}

type Options = {
  messages: ChatMessage[];
  tools?: ToolSpec[];
  maxTokens: number;
  // a JSON schema the reply must match, enforced by the host while it generates
  schema: Record<string, unknown>;
  signal?: AbortSignal;
  referer?: string;
  title?: string;
};

export async function* streamChat({ messages, tools, maxTokens, schema, signal, referer, title }: Options) {
  const start = performance.now();
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    signal,
    headers: {
      authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'content-type': 'application/json',
      ...(referer && { 'HTTP-Referer': referer }),
      ...(title && { 'X-Title': title }),
    },
    body: JSON.stringify({
      // CHAT_MODEL lets the evals compare another model on the same prompt
      model: process.env.CHAT_MODEL || NYTHOS.openRouterId,
      messages,
      tools,
      stream: true,
      max_tokens: maxTokens,
      temperature: 0.6,
      response_format: { type: 'json_schema', json_schema: { name: 'reply', strict: true, schema } },
      // GLM's reasoning is mandatory: minimal is as low as it goes
      reasoning: { effort: 'minimal', exclude: true },
      // the host answering fastest right now, not the cheapest: GLM has dozens, some slow or degraded. Only
      // hosts that enforce the schema
      provider: { sort: 'latency', require_parameters: true },
    }),
  });
  if (!res.ok || !res.body) {
    const detail = await res.text().catch(() => '');
    throw new OpenRouterError(`OpenRouter ${res.status}: ${detail.slice(0, 300)}`, res.status);
  }

  const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
  const calls = new Map<number, ToolCall>();
  let buffer = '';
  const stats = { provider: '', firstTokenMs: 0, reasoningTokens: 0 };
  try {
    yield* parse();
    const generationMs = stats.firstTokenMs ? Math.round(performance.now() - start) - stats.firstTokenMs : 0;
    yield { type: 'timing', generationMs } satisfies StreamEvent;
  } finally {
    const { provider, firstTokenMs, reasoningTokens } = stats;
    const totalMs = Math.round(performance.now() - start);
    console.info(
      `[chat] ${provider || 'unknown host'}: first token ${firstTokenMs}ms, total ${totalMs}ms, ${reasoningTokens} reasoning tokens`,
    );
  }

  async function* parse(): AsyncGenerator<StreamEvent> {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += value;
      let newline: number;
      while ((newline = buffer.indexOf('\n')) >= 0) {
        const line = buffer.slice(0, newline).trim();
        buffer = buffer.slice(newline + 1);
        if (!line || line.startsWith(':') || !line.startsWith('data:')) continue;
        const data = line.slice(5).trim();
        if (data === '[DONE]') return;

        let chunk;
        try {
          chunk = JSON.parse(data);
        } catch {
          continue;
        }
        if (chunk.error) throw new OpenRouterError(chunk.error.message ?? 'stream error', chunk.error.code);
        stats.provider ||= chunk.provider ?? '';
        if (chunk.usage) {
          stats.reasoningTokens = chunk.usage.completion_tokens_details?.reasoning_tokens ?? 0;
          yield { type: 'usage', usage: chunk.usage } satisfies StreamEvent;
        }

        const choice = chunk.choices?.[0];
        const delta = choice?.delta ?? {};
        if (!stats.firstTokenMs && (delta.content || delta.tool_calls)) {
          stats.firstTokenMs = Math.round(performance.now() - start);
        }
        if (typeof delta.content === 'string' && delta.content) {
          yield { type: 'text', delta: delta.content } satisfies StreamEvent;
        }
        for (const part of delta.tool_calls ?? []) {
          const index = part.index ?? calls.size;
          const call = calls.get(index) ?? { id: '', name: '', arguments: '' };
          if (part.id) call.id = part.id;
          if (part.function?.name) call.name += part.function.name;
          if (part.function?.arguments) call.arguments += part.function.arguments;
          calls.set(index, call);
        }
        const reason = choice?.finish_reason ?? delta.finish_reason;
        if (reason) {
          if (reason === 'tool_calls' && calls.size) {
            yield { type: 'tool_calls', calls: [...calls.values()] } satisfies StreamEvent;
            calls.clear();
          }
          if (reason === 'error') throw new OpenRouterError('provider error mid-stream');
          yield { type: 'finish', reason } satisfies StreamEvent;
        }
      }
    }
  }
}
