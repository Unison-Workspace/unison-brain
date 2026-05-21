---
name: unison-brain
description: Use when you need to recall or store durable project knowledge — decisions, conventions, architecture, prior solutions, who's-who. Searches and writes the user's Unison cloud brain via the `unison` CLI so context persists across sessions, machines, and agents.
---

# Unison Brain

The Unison brain is the user's hosted knowledge base. It holds the durable
context that doesn't live in the codebase: architectural decisions, conventions,
prior solutions, people, and notes. It is reached through the `unison` CLI, which
talks to the cloud — so the same brain is available from any machine or agent.

## When to use it

- **Before answering a non-trivial question**, search the brain first — the user
  may have already decided this, and you should not re-litigate it.
- **When the user states a decision, convention, or hard-won insight** worth
  keeping, write it to the brain.
- **When a person, project, or system is mentioned** that you lack context on,
  search the brain before asking the user to re-explain.

## Commands

Documents (your daily loop):
```bash
unison search "<question or keywords>"   # hybrid keyword + semantic search
unison grep "<regex>"                     # exact regex scan over bodies
unison get <path>                         # read one document (prints raw content)
unison ls [prefix]                        # list documents (--tree for the FS view)
unison write <path> -m "<content>"        # write/update a doc (/wiki/ /skills/ /actions/)
unison neighbors <idOrPath>               # linked documents
unison status                             # brain health + counts
```

Knowledge graph (when names/relationships matter):
```bash
unison entity resolve "<name>"            # find a person/company/project by name
unison fact ls --entity <id>              # what the brain knows about an entity
unison fact add <entityId> <predicate> "<text>"   # record a fact
unison timeline <entityId>                # facts over time
```

Add `--json` to any command for machine-readable output you can pipe to `jq`.
`search` accepts `-k <n>`, `--kind`, `--tag`, `--memory-type`, and `--as-of`
(time-travel). `write` reads content from stdin if `-m` is omitted:

```bash
unison search "auth approach" -k 5 --json
cat decision.md | unison write /wiki/auth-2026-05
```

## Setup

If a command fails with **"Not authenticated"**, tell the user to run:

```bash
unison auth login
```

This opens a browser device-authorization flow. For CI or headless agents, set
the `UNISON_TOKEN` environment variable to an API key instead (no login needed).
