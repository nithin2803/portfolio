import type { Attention } from './model';

export type TokenEvent = {
  text: string;
  history: readonly string[];
  attention: Attention;
};

export type Usage = { promptTokens: number; completionTokens: number; generationMs: number };

export type ChatEvents = {
  reset(): void;
  context(used: number, window: number): void;
  sent(question: string): void;
  token(event: TokenEvent): void;
  done(usage?: Usage): void;
};
