# Agent task 2: inference

Replies take far too long to start. Fix the reasoning mode and find where the time goes.

## Suspects

- **Reasoning is on, just hidden.** `reasoning: { effort: 'minimal', exclude: true }`
  (`src/features/chat/agent/openrouter.ts`). `exclude` only hides the thinking; the model still generates it
  before the first visible token, and it's billed.
- **`minimal` may not mean off for GLM.** OpenRouter maps effort per provider; on/off models can treat any
  effort as fully on. `reasoning: { enabled: false }` is explicit.
- **No provider routing.** No `provider` field, so OpenRouter picks a host per request and GLM hosts vary a lot.
  Try `provider: { sort: 'latency' }` or pin a fast host.
- **Tool rounds are full extra requests.** `MAX_ROUNDS = 3` (`agent/index.ts`); a `read_blog_post` call means
  a second complete model call (with reasoning) before any answer.
- **ReplyFilter holds the start** until the `SOURCES:` line is complete. Small, but it adds up.

## Baseline (2026-10-21, local dev server, current settings)

Three questions through `/api/chat`, run three times (the last was rate-limited). Visible tokens ≈ text chars / 4.

| Question                                     | First visible text | Total     | Completion tokens | Visible tokens | Tool rounds |
| -------------------------------------------- | ------------------ | --------- | ----------------- | -------------- | ----------- |
| "what do you actually do…"                   | 0.9–1.6 s          | 1.4–2.6 s | 87–95             | ~80–110        | 0           |
| "what was iceland like?"                     | 2.3–3.6 s          | 3.2–4.0 s | 334–537           | ~65–80         | 0           |
| "what have you written on your blog lately?" | 4.2–6.1 s          | 4.7–7.5 s | 328–642           | ~35–95         | 1–2         |

- **`effort: 'minimal'` doesn't turn thinking off.** The model decides per question: up to ~450 hidden
  reasoning tokens before the first word, which is 1.5–2 s of dead air on its own.
- **Tool rounds cost ~1.3 s each** before any text, and they stack with the reasoning.
- Not yet measured: production (cold starts, Vercel region) and which OpenRouter provider served each request.

## Plan

1. ~~**Baseline.**~~ Done above. Still to do: log the provider per request, and measure production.
2. **Change one thing at a time:** reasoning off vs. low, provider sort/pin, then re-measure.
3. **Fold reasoning mode into task 1's side-by-side** (reasoning off/low × GLM Flash vs. stronger models), so
   quality, speed and cost land in one table.

Task 1's rewrite helps here too: all content in a static prompt means fewer tool rounds and prompt caching.

## After (2026-10-22, local dev server)

`provider: { sort: 'latency' }` added; reasoning stays `minimal` because GLM-5.3 Flash rejects `effort: 'none'`
("Reasoning is mandatory for this endpoint"). Same questions, two runs each:

| Question                                     | First visible text | Total     | Completion tokens |
| -------------------------------------------- | ------------------ | --------- | ----------------- |
| "what do you actually do…"                   | 0.6–0.9 s          | 1.8–2.0 s | 94–99             |
| "what have you written on your blog lately?" | 1.1–1.4 s          | 1.6–2.1 s | 77–78             |

Iceland now gets `not-written` (it isn't in `me.md`), so it isn't comparable. Completion tokens are close to the
visible text plus the SOURCES/FOLLOWUPS lines, so little hidden reasoning. Tool rounds dropped from ~1.3 s to
~0.6 s. Each model call now logs `[chat] <host>: first token, total, reasoning tokens` on the server.

Still open: production timing (cold starts, region) from those log lines, and only 6 samples so far.
