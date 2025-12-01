---
title: "Advent of Claude Code"
date: 2025-11-30T20:38:44-05:00
draft: false
---

## Overview

Every year, I enjoy participating in [Advent of Code](https://adventofcode.com/) as much as I can. This year, I have been all in on using AI coding agents, pre-domninantly Claude Code, for doing most of my work. Given this, I thought it would be fun to see how good Claude Code would be at the Advent of Code problems. Check it out [here!](https://github.com/pachuc/advent-of-claude-code)

## End-to-end Solver

In my oppinion, given how good coding agents have gotten, using Claude Code to solve a single problem with me also in the loop feels extremely trivial. As crazy as that is to say, given where we were this time last year, I believe that is the current reality. So, in order to give Claude even somewhat of a challenge, I wanted to have it solve the problems completely independently. To accomplish this I built a light python wrapper around Claude Code. The wrapper does the following:

- Using my auth token, it grabs the puzzle statement and input and downloads it to disk.
- It mounts the files inside a podman container and runs claude in headless mode.
- The solver has two different modes to run claude in: one-shot and default.
- The one-shot mode is a single claude headless instance that is asked to solve the problem from the raw puzzle text and input.
- The default mode uses a string of "agents", i.e headless claude code with different prompts. Each agent is specialized to help break the problem down, and the ouputs of the agents are chained into each other.
- Finally, there is automation to parse the final answer writte by Claude into answer.txt and submit that to the Advent of Code website.

## One-shot vs Multi-agent

The pros of the one-shot agent is speed. This system can solve many of the Advent of Code problems in under a couple minutes. However, the downside is reliablity. There are some problems the one shot agent struggles with.

The Multi-agent setup is much more reliable. It uses a translation agent to parse out the problem into a clear problem statement; a planning agent to come up with a plan to solve the problem; a critique agent to critique the plan; a coding agent to create the solution; and a testing agent to test the solution. If testing fails, the problem is sent back to the coding agent. This system is much more reliable and has a near 100% solve rate; however, the downside is time. This series of agents takes ~10 mins to complete both parts. Lot's of the time spent here is probably initlaization costs in starting a new Claude Code session, although I have not taken the time to truly disect the slowness.

## Learnings

One thing I noticed is that the Advent of Code problems are clearly a part of Claude's training data. Often times, even given small clues to the problem, Claude knows exactly what problem it is solving. As I was trying to work out some of the problems from previous years myself, I noticed that even my VSCode autocomplete has been trained on Advent of Code!

## Claude Racer

![Claude Racer](/advent-of-claude-code.png)

While, this was a fun experiment to see what the boundries of Claude are, use of AI to solve problems is discouraged by the Advent of Code community, and furthermore, kinda renders the whole exercise moot in someways, as it is meant to be a fun puzle for _you_. So, given that, I wanted to see if I could make this more useful in general for the Advent of Code community. That's when I came up with the idea of racing Claude! After cloning this repo, you can run `make web` to bring up a web interface which will let you race against Claude Code on any of the Advent problems. It can be a bit humbling watching Claude 1-shot solve a problem before you have even finished reading it, but it's quite fun nonetheless. Given that we lost the leaderboard this year, maybe this is a fun alternative. I am curious to see how it performs on new problems it hasn't seen yet, as these may represent a more fair challenge vs things it has been explicitly trained on.