// Real figures for the base model, from OpenRouter's model listing and zai-org/GLM-5.3-Flash config.json.
export const NYTHOS = {
  name: 'nythos-6',
  openRouterId: 'z-ai/glm-5.3-flash',
  pricePerMillion: { input: 0.0359, output: 0.4182 },
  params: '321B',
  contextWindow: 1_048_576,
  layers: 45,
  denseLayers: 3,
  experts: 288,
  activeExperts: 8,
} as const;

export const CHAT_BUDGET = {
  maxOutputTokens: 1500,
  maxQuestionChars: 300,
  maxHistoryMessages: 16,
  dailySpendUsd: 1,
} as const;

// a rough count for text the model hasn't tokenised yet
export const estimateTokens = (text: string) => Math.ceil(text.length / 4);
