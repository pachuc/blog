---
tags:
    - project
    - programming
    - AI
title: "Claude Named Memory"
date: 2026-06-03T01:49:24-04:00
draft: false
---

## Problem

Currently, there are a few different forms of context management built into Claude Code:

* User level memory - useful for storing general user preferences across all working sessions.
* Project/Repo level memory & CLAUDE.md - great abstractions for noting important information about a specific repo/project/directory.
* Skills - context loaded based on using specific tools, working in specific code etc.

While these systems can work in the context of working on one repo at a time, they fail to cover many of my use cases. Claude Code is an extremely general tool that can be used for many different things, and oftentimes these abstractions don’t allow for a clean mapping for these use cases. 

For example, recently I have been using Claude Code to help me setup and customize my CachyOS installation. This requires the agent to work across many files and systems installed on my machine. There is no clear repo associated with this work, but it is still useful (and in many cases extremely critical) for the agent to know what work we have done previously, as well as the overall state of the system.

Another example I have is related to my day job at Meta. At Meta we work out of giant monorepo. Inside the monorepo are many directories that represent different projects, systems, libraries etc. Despite the best efforts of everyone, the code is sprawling. Sometimes, when I work I will init Claude Code in one of these subdirectories, when the change is small and targeted. However, more often I find myself init-ing the agent in the root directory of the monorepo. This is because oftentimes my goal is to build a large feature that requires changes to many different systems all throughout the codebase. In this case, I still want the agent to have memory of what we are working on, but none of the various CLAUDE.md’s or project memories in the repo are truly an appropriate home for this context. This is because the context is not related to any specific project or system, but rather context specific to the feature itself. Adding this feature specific context to the project’s context will clutter it with information that is probably not relevant to most developers or agent sessions working on that system.

There are a couple workarounds I’ve been using, but they are less than ideal:

* Start each fresh session by re-building the necessary context. I do this either by re-explaining what we are working on, or having the agent review docs/diffs etc itself to gain context. This works, but it's quite tedious.
* Continue the past conversation with `--resume`. The main issue with this approach is that you are continuously starting in a state where the agent’s context window is full, which is less than ideal. Another thing is that if you have many sessions, it can be hard to keep track of and find the correct session to resume.

So, tl;dr I find I need a way for the agent to have task/feature specific memory, not just user/project/system level memory.

## Solution

To solve this I built the claude-named-memories plugin. This plugin allows you to use `/name` in a session to create a new “named memory”. For example, in my linux work session I called `/name linux-helper`. This creates a new memory file, prepopulated from the conversation, at  `~.claude/linux-helper/memory.md`. This also creates a new entry in my shell profile that creates the alias `claude-linux-helper`. Now whenever I want to work on this again, I can call `claude-linux-helper` to get a session that has the context of this work prepopulated. Named memory agents are also instructed to update their memory with useful information as they work, and also get a SessionEnd hook that automatically reviews the conversation and updates the memory. The SessionEnd hook also runs compaction on the memory file if it starts exceeding 20k words, so that we don’t end up with a bloated memory file eating all the context after some time. 

## Challenges of Building a Claude Code Plugin

For a system that is supposed to be extensible, Claude Code is surprisingly hard to extend.

* First, I wanted the slash command to be just `/name`. However, this was not possible out-of-the-box for a plugin. All plugin commands have to be namespaced, so `/named-memories:name`. To work around this I have a command called `/named-memories:install` which adds the new command for `/name` at global namespace. This restriction honestly kind’ve makes sense, it’s annoying, but seems well intentioned. It stops plugins from adding conflicting slash commands etc, and clearly identifies you are running a plugin’s slash command. 
* Second, SessionEnd hooks are the only way to run "always do X before exit," and they're awkwardly scoped. I had to spawn a headless `claude -p` on exit to read the transcript and update memory, since Claude Code has no concept of forcing the agent to perform a specific action before a session ends. The hook script needs `CLAUDE_PLUGIN_ROOT` and `CLAUDE_PLUGIN_DATA` (where the scripts and data live). Hardcoding the paths doesn't work because the plugin cache path is version-namespaced and changes on every upgrade, and there's no postinstall hook to refresh anything. That would be fine, except those env vars are only populated for hooks defined in the plugin's own `hooks/hooks.json`. If I put the hook in a per-profile `settings.json` instead, which would be the natural way to keep it scoped to named-memory sessions only, the env vars come through empty. On top of that, there's no way to mark a plugin as "only active for some sessions": plugins are globally enabled or globally disabled. So I'm left with a global hook that no-ops for vanilla sessions. Not the end of the world, but less clean than it should be.
* Thirdly, I wanted to build a management interface for my plugin, so people can see the named agents and do actions such as delete them/list them/rename them, etc. However, Claude Code offers no way to extend the TUI interface inside the harness. I added namespaced slash commands for these actions, but honestly the UX is lackluster.
* Fourthly, Claude Code blocks edits on its “protected paths”. Anything under `~/.claude/`, including the plugin's own data directory, is blocked from Edit/Write tool calls in every permission mode except `--dangerously-skip-permissions`. So a headless extractor can't update its own memory file without unrestricted permissions, which is comically over-scoped for "let this one process write to one directory." The workaround is absurd: the hook tells `claude -p` to write its proposed new memory contents to a file in `/tmp` (not protected, so it works), and then a shell `mv` in the hook script installs the file into the plugin data directory. The agent never touches `~/.claude/` directly; the shell does the gated write on its behalf. It works, it's even reasonably safe, but architecturally it's nonsense. I'm laundering writes through `/tmp` to evade a permission system that I can't otherwise convince to let me write to my own plugin's data dir.
* Finally, somehow Claude Code somehow has no idea about its own architecture, and how to build plugins. It often got concepts wrong, even after reading Anthropic’s own documentation.

Conclusion

Overall, the plugin works and does what I want. I wish I could have built it cleaner, but I guess it is what it is. This experience has made me curious about the extensibility of other harnesses though, so I plan to explore how I can export this plugin to codex, opencode, and pi to see how their plugin systems compare and contrast.

Check it out [here!](https://github.com/pachuc/claude-named-memory)


