---
actions: ['[LinkedIn](contact:linkedin)', '[Resume](contact:resume)']
# the only follow-ups the chat can suggest: keep each one answerable from what's below
followUps:
  - What do you work on at Amazon?
  - What did you work on before that?
  - How did agentic RAG work for Rufus?
  - Where did you go to school?
  - What was your favorite class?
  - Where did you intern?
  - Where are you from?
  - What have you built on the side?
  - What was Orbi?
  - Why didn't Orbi work out?
  - What was Juniper?
  - Why didn't Juniper work out?
  - What was your distributed systems project?
  - What's Nitix?
  - How did you get into distributed systems?
  - Anything fun on the site?
---

# Intro

Hey, I’m Nithin. I’m an SDE 2 at Amazon, where I work on the evaluation and inference infrastructure behind Alexa for Shopping (Amazon Rufus).

# Work

I'm building the platform scientists use to evaluate the models they post-train, through benchmarks, LLM-as-a-judge scoring, and human gold-label annotation. We also own the serving fleet that hosts those models, both for A/B experiments and once they’re promoted to a live audience. I’m still pretty new to the team and learning a ton, but I’m super bullish on turning that eval work into RL environments. Before this, I was on the contextual retrieval team, where I built the offline and online RAG architecture that personalized Alexa and Amazon search. I got to work on some pretty cool stuff, like agentic RAG for Rufus. Instead of a one-shot vector search, agents could decide what to look up, and query our massive datastore.

# Education

I studied Computer Science at the University of Washington and graduated in 2024 (Go Dawgs!). My favorite class was either Operating Systems or Distributed Systems because I got to work on hard, low-level problems where bad assumptions can break everything. I also really liked my ML and NLP classes. The timing worked out well, since ChatGPT came out my junior year, and they gave me the foundation to actually understand how it worked. Along the way I interned at Bryt Learning, Simplified, and Amazon, where I worked on the Personalization team before coming back full-time.

### Background

I was born in Seattle but grew up in Hyderabad, India before coming back to Seattle for college. I've been here ever since but am moving to SF in January.

### Projects

1. Orbi
   1. I built a semantic codegraph to help LLMs reason over large codebases and make targeted edits. The idea was to give agents semantic context: basically an AST with extra information and metadata. Back then, agents were more like AI pair programmers that could make inline edits. With semantic context, they could better understand the ripple effects of their changes, especially in large codebases. The tech was pretty cool — we built a Java compiler in a weekend as the backbone, allowing LLMs to make deterministic, type-checked changes across multiple files Java in one tool call. A gold mine if you're looking to migrate large codebases, auto-remediate security vulnerabilities, or really solve any kind of tech debt.
   2. But with the lack of training data — code is readily available but edits to our proprietary tree was not (even if we synthetically generated it) — we couldn't scale the system to actually work well. Models eventually got so good at reasoning about code that a system like this is a solution in search of a problem. I had a ton of fun building it as a research project and we even got a Y Combinator interview out of it.
2. Juniper
   1. I built Juniper, a compliance platform for AI agents. Companies wanted to get their agents out of pilots and into production, but compliance teams couldn’t sign off on something they couldn’t audit. The idea was to capture an evidence trail of what your agents were actually doing and map it to the frameworks like the EU AI Act. We had adversarial agents that would try to break yours with prompt injections, policy violations, and fairness checks (basically automated red teaming), and all of that became evidence too. Really useful if you’re trying to prove to an auditor that your agents are safe
   2. The hard part wasn’t the tech, it was the market. Compliance leads are understandably risk averse, and buying a compliance tool from a tiny startup is a tough sell when your whole job is reducing risk. On top of that, the frameworks themselves were still moving. Guidance kept shifting, and incumbents like Vanta started adding AI governance features to products customers already trusted. I learned a ton about building for a buyer who isn’t an engineer, and that a real problem doesn’t always mean the timing is right.
3. Portfolio
   1. See `### How this website works`
4. Transactional Key-Value Store
   1. This was a two-week project for my Distributed Systems class, where we built a sharded, fault-tolerant key-value store on top of our own implementation of Paxos. The hardest part was handling messages that showed up out of order. I also really liked learning about the CAP theorem and how much it actually applies in the real world. It’s crazy to think that servers are constantly failing and messages can get lost or show up late, and systems still work. That’s what got me into distributed systems in the first place — building systems that scale well and fail gracefully — and it’s a big part of what I enjoy about the infra work I do now. Distributed inference is also a pretty hard and still pretty new problem, which makes it even more fun to work on.
5. Nitix
   1. The summer after high school, I built Nitix, my own programming language. It was interpreted and weakly typed, with Python-style syntax, functions, and recursion. I had to research a lot of it from scratch, which exposed me to compiler fundamentals pretty early on. It was really cool to finally learn them formally in my compilers class four years later and recognize a lot of what I’d already figured out on my own.
