# Me

## Intro

Hey, I’m Nithin. I’m an SDE 2 at Amazon, where I work on the evaluation and inference infrastructure behind Alexa for Shopping.

## Background

I was born in Seattle but grew up in Hyderabad, India before coming back to Seattle for college.

I've been here ever since but am moving to SF in January.

## What's Next

I'd love to join a startup working on interesting problems, or eventually start my own.

What I'm really looking for is an early team with hard problems, strong founders, and a deep bench of people I can learn a ton from.

I'm always open to chatting about what's next.

<!-- more -->

The spaces I'm most excited about are inference, RL, and application-layer companies doing lab-like research work.

## Why SF

Honestly I’ve always wanted to live in San Francisco. I want to start a company someday, and there’s no better place to be surrounded by people trying the same thing.

## Skills

I'm best at balancing attention to detail with shipping fast. I wouldn't ship a subpar experience but also wouldn't stall shipping on perfection.

Why hire me? I care a lot about good engineering culture and docs, I learn fast, and I'd rather be in the room where hard problems get solved than reading about them.

<!-- more -->

You get the best signals from your users somewhere in the middle (probably closer to the better experience side of things).

# Career

## Work

I'm building the platform scientists use to evaluate the models they post-train, through benchmarks, LLM-as-a-judge scoring, and human gold-label annotation. We also own the serving fleet that hosts those models, both for A/B experiments and once they’re promoted to a live audience.

I’m still pretty new to the team and learning a ton, but I’m super bullish on turning that eval work into RL environments.

Before this, I was on the contextual retrieval team, where I built the offline and online RAG architecture that personalized Alexa and Amazon search.

I can't get into the specifics of internal Amazon work, but I'm happy to talk about it at a high level.

<!-- more -->

I got to work on some pretty cool stuff, like agentic RAG for Rufus. Instead of a one-shot vector search, agents could decide what to look up, and query our massive datastore.

RL is genuinely hard, from designing verifiers to figuring out rollouts. Production traces (which our evals are built on) are the best data we have to get closer to solving it in our domain.

## Work Interests

My main interests are distributed systems (how do you design systems that scale well and fail gracefully?) and AI infrastructure (how do you squeeze the most out of your hardware when serving?).

I'm also starting to explore RL, and how you can nudge models and agents to act how you want, especially on longer-horizon tasks.

## Currently Learning

I'm currently diving deeper into the worlds of inference engineering and reinforcement learning. Expect to see more blog posts here with things I find interesting.

Most recently I read [Beyond Static Evaluation](https://arxiv.org/abs/2607.05773), on building simulation environments for agentic RL. It lines up with how I think about turning evals into RL environments.

## Education

I studied Computer Science at the University of Washington and graduated in 2024 (Go Dawgs!).

My favorite class was either Operating Systems or Distributed Systems because I got to work on hard, low-level problems where bad assumptions can break everything.

<!-- more -->

I also really liked my ML and NLP classes. The timing worked out well, since ChatGPT came out my junior year, and they gave me the foundation to actually understand how it worked.

## Internships

Along the way I interned at Bryt Learning, Zenoti, and Amazon, where I worked on the Personalization team before coming back full-time.

<!-- more -->

At Zenoti, I built a fully functional cross-platform port of their webapp in Flutter.

At Bryt, I built an admin dashboard that allowed schools to define curricula and plan timetables using Django and jQuery.

# Projects

## Orbi

I built a semantic codegraph to help LLMs reason over large codebases and make targeted edits. The idea was to give agents semantic context: basically an AST with extra information and metadata. Back then, agents were more like AI pair programmers that could make inline edits. With semantic context, they could better understand the ripple effects of their changes, especially in large codebases.

But with the lack of training data — code is readily available but edits to our proprietary tree were not (even if we synthetically generated them) — we couldn't scale the system to actually work well. Models eventually got so good at reasoning about code that a system like this is a solution in search of a problem.

I had a ton of fun building it as a research project and we even got a Y Combinator interview out of it.

<!-- more -->

The tech was pretty cool — we built a Java compiler in a weekend as the backbone, allowing LLMs to make deterministic, type-checked changes across multiple Java files in one tool call. A gold mine if you're looking to migrate large codebases, auto-remediate security vulnerabilities, or really solve any kind of tech debt.

Wrote it in Java as a simple CLI tool for a proof of concept

The YC interview went well, but we didn't get in. They wanted founders with a bit more experience. We kept building for a while after, but eventually let it go to focus on our full-time jobs.

## Juniper

I built Juniper, a compliance platform for AI agents. Companies wanted to get their agents out of pilots and into production, but compliance teams couldn’t sign off on something they couldn’t audit. The idea was to capture an evidence trail of what your agents were actually doing and map it to the frameworks like the EU AI Act.

The hard part wasn’t the tech, it was the market. Compliance leads are understandably risk averse, and buying a compliance tool from a tiny startup is a tough sell when your whole job is reducing risk.

I learned a ton about building for a buyer who isn’t an engineer, and that a real problem doesn’t always mean the timing is right.

<!-- more -->

We had adversarial agents that would try to break yours with prompt injections, policy violations, and fairness checks (basically automated red teaming), and all of that became evidence too. Really useful if you’re trying to prove to an auditor that your agents are safe.

Tech stack was Tanstack Start on Railway with Inngest as the durable execution layer. Also built a thin TypeScript SDK to help instrument agents so we could evaluate them.

On top of that, the frameworks themselves were still moving. Guidance kept shifting, and incumbents like Vanta started adding AI governance features to products customers already trusted.

## How this website works

The stack is pretty simple Next.js on Vercel. The hero is built with a combo of three.js and some postprocessing shaders.

The game engine is entirely written in Typescript ([play it here](/#play)).

As for this chat window, it's running on nythos-6 (GLM-5.3-Flash) via OpenRouter. And check out [this blog post](/blog/cheap-code-good-taste) for how I built it!

## Transactional Key-Value Store

This was a two-week project for my Distributed Systems class, where we built a sharded, fault-tolerant key-value store on top of our own implementation of Paxos. Entirely built in Java.

The hardest part was handling messages that showed up out of order.

<!-- more -->

I also really liked learning about the CAP theorem and how much it actually applies in the real world. It’s crazy to think that servers are constantly failing and messages can get lost or show up late, and systems still work.

That’s what got me into distributed systems in the first place — building systems that scale well and fail gracefully — and it’s a big part of what I enjoy about the infra work I do now. Distributed inference is also a pretty hard and still pretty new problem, which makes it even more fun to work on.

## Nitix

The summer after high school, I built Nitix, my own programming language. It was interpreted and weakly typed, with Python-style syntax, functions, and recursion. Interpreted language written in python.

<!-- more -->

I had to research a lot of it from scratch, which exposed me to compiler fundamentals pretty early on. It was really cool to finally learn them formally in my compilers class four years later and recognize a lot of what I’d already figured out on my own.

# Life

## Outside Work

Outside of work, I really enjoy being outdoors, skiing, hiking, traveling, and am getting back into photography. I also like to stay active by working out.

Next up is mountaineering. Ice climbing in Iceland got me hooked.

## Travel

I love travelling to new places. Most recently I visited Iceland and highly recommend it. I need to go back for the northern lights.

<!-- more -->

Next on the bucket list are Patagonia, Peru, and Lombok.

In Iceland I went horse riding and ice climbing for the first time.

## Hiking

My favorite hikes in the Seattle area are Mailbox Peak, Snow Lake, and Mt. Pilchuck.

<!-- more -->

I'm looking forward to exploring some of the trails in the Bay (my expectations are low coming from the PNW).

## Rapid Fire

- **Coffee or tea:** I like black coffee but don't mind the occasional mocha. Definitely not a coffee snob and Coke Zero is definitely my guilty pleasure.
- **Favorite food:** Either a Ribeye or a home-cooked Indian meal.
- **Favorite restaurant in Seattle:** D'La Santa, a mexican steakhouse is one of my favorites.
- **Music:** A mix of everything but mostly Alt Rock, RnB, Country, and Rap.
- **Last thing I watched that stuck with me:** You can see everything, the Elizabeth Holmes documentary by Nathan Fielder. Absolutely insane watch, highly recommend it.
- **Morning person or night owl:** Night owl for sure.
- **Tabs or spaces, favorite editor:** Spaces over tabs (just configure the tab key to use spaces) and who even uses editors anymore ;)
- **If I weren't an engineer:** I think I'd enjoy building something physical, maybe woodworking or blacksmithing?
