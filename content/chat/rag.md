---
question: "What's your take on RAG?"
describe: 'RAG / retrieval / contextual retrieval: the customer-context API Nithin built for Rufus, and his opinion on one-shot vs agentic RAG.'
followUps: [eval-infra, side-projects]
actions: ['[Resume](contact:resume)']
notes: >-
  The API classified and enriched queries at runtime and used in-memory KNN to find the right context fast. He built
  it in Personalization at Amazon.
---

In Personalization I built the contextual retrieval API behind Rufus. It surfaces customer context: all the explicit and inferred signals we can figure out from how you shop.

My take: I'm not bullish on dumb, one-shot RAG. Agentic RAG, though, really does fill the context with the right signals.
