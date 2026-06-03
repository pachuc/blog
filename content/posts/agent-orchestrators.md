---
tags:
    - AI
    - programming
title: "Agent Orchestrators"
date: 2026-04-10T02:17:02-04:00
draft: false
---

## Thesis

If you ask most people in the AI space, they would tell you that 2026 is the year of Orchestrators. I actually knew that 2025 was the year of agents. That was obvious the moment I used cursor in January of 2025, and even clearer when I tried Claude Code in February. In fact, I was so convinced that AI coding would end software engineering, I thought "wtf am I doing with my life?" and did whatever I could to get into an AI team at Meta. Giving up everything I had cultivated on my current team such as knowledge, respect, relationships, path to promotion. I spent every day emailing managers from around the company hoping someone would be able to take me even though I was in D.C. It worked out, and I ended up in MSL once it formed, and sure enough now everyone codes with agents.

On the turn of the New Year, in the midst of the mass AI psychosis caused by Opus 4.6 and GPT 5.2, Steve Yegge published Gas Town. This was his take on the future. There are many names for it: agent swarms, agent teams, software factories etc. I prefer agent orchestrators. The idea is simple: Coding is largely solved, so what we need to do is move up the stack of software engineering. We no longer manage agents at the feature level, instead we define the project, the goals, the outcomes we desire. Then we let the factory take over, using possibly hundreds of agents and an unimaginable amount of tokens to bring our vision to life. The agents self organize, they do different jobs: software architecture, QA, design, and of course developer. The human observes the outcomes, interacting usually with just a single Chief of Staff agent that manages all the underlying workerbees. Direction of this system is done at a higher level of abstraction, no longer worrying about those pesky implementation details. Steve Yegge might be the first, but over time I see that *everyone* is now working on an agent orchestration platform.

Maybe I'm just a bit contrarian, but I don't think this is the future, for two reasons:

1. The current code is slop.
2. Accrued cognitive debt.
3. The model will eat everything.

## Slop

I think this does not need much clarification. If you don't think current AI agents produce slop, then either:

1. You haven't used them enough.
2. You have low standards for the quality of the system you are building.

And don't tell me about all these prompting tricks and test suites you have to ensure quality. Unless you are reviewing the code and cleaning up the agent's work, I guarantee you there is slop. Maybe it doesn't matter. Depends on what you are building I guess. But if you want a high quality, performant and reliable piece of software, I would argue it does matter.

## Cognitive Debt

This one is a bit more abstract and harder to explain. With every change that goes by that you do not fully understand, there is a small cognitive debt you incur. A little bit about the system you don't understand. Over time, and with the velocity provided by agents, not much time at all, this debt adds up. Eventually, there is a lot you don't understand about your system. As this lack of understanding goes, your ability to guide and wield the agent weakens. You can no longer make high quality decisions around how new features should be implemented, and how things should be architected. The agent may do a good job, but if the agent makes a mistake, this bad pattern in the code will pollute all future sessions. Agent mistakes are self-reinforcing. You, the human, are meant to be the guardrails, but now you don't know enough to do your job.

## The Model Will Eat Everything

I think this is where I get to tell you, worry not I am equally if not more AGI pilled than you dear reader. The thing is, for both my previous arguments, you could say "Don't worry, the models will get better, and this won't be a problem". I agree. The models will get better, and maybe, probably, it won't need much human guidance anymore. It will clean up its own slop, and create beautiful well architected software. My argument is that in this world, where the model has gotten exponentially better, we won't need these fancy agent orchestrators. Much like agents, context engineering, and MCP tools, this will pass as just another fancy of the time. These systems are not robust abstractions being built for AGIs of the future. They are brittle ways to cobble together current agents at their current level of capability, to squeeze a little bit more juice out by running multiple passes, and creating a hierarchy of agent roles. But I don't think there's much juice to squeeze, and AGI won't need any of this. Once the models get better, they will run for hours on a simple harness. They will tackle tasks 1 by 1 from your JIRA queue, and even start coming up with new ideas for you to implement based on your goals. They'll just use your existing tools, they won't need all this crap.

Once AGI hits, all these abstractions will be unnecessary. The model will eat everything. Until then, I would say review your code, and understand it well.
