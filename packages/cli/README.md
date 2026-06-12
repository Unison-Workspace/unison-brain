# @unisonlabs/cli

The `unison` command — your cloud knowledge base (the Unison brain) in the
terminal and in any agent.

> **🤖 AI agent?** Self-onboard via [AGENTS.md](https://github.com/unison-labs-ai/unison-brain/blob/main/AGENTS.md) — install → auth → skill → verify, then the search-first / write-back loop.

```bash
npm i -g @unisonlabs/cli      # or: pnpm add -g / bun add -g / npx @unisonlabs/cli
unison auth login             # browser sign-in (or UNISON_TOKEN=usk_... for CI)
```

## Use it

```bash
unison search "auth decision" -k 5      # hybrid keyword + semantic search
unison cat /tenant/projects/architecture.md   # read a document (alias of get)
unison ls /private                       # directory view; also: tree, find
echo "We chose X because Y." | unison write /private/notes/x.md   # paths end in .md
unison edit /private/notes/x.md --old "X" --new "Z"   # surgical in-place edit
unison work search "vendors"             # search the Work surface (tasks/docs/tables)
unison entity resolve "Daniel"           # knowledge-graph lookup
unison skill install                     # drop the Agent Skill into ~/.claude/skills
```

Documents: `search`, `grep`, `cat`/`get`, `ls`, `tree`, `find`, `write`, `edit`,
`rm`, `tag`, `share`, `neighbors`, `links`, `link`. Work: `work apply`,
`work query`, `work search`, `work inspect`, `work tree`, `work folder`,
`work artifact`, `work table`, `work view`. Graph: `entity`, `fact`, `timeline`.
Admin: `review`, `jobs`. Run `unison --help` or `unison <cmd> --help`.

## For agents

Add `--json` for machine output (JSON on stdout, compact when piped). Errors are a
JSON envelope on stderr with a nonzero exit code (`4` auth, `3` not found,
`5` conflict, `1` other). Destructive commands need `--yes` non-interactively.

## Env

- `UNISON_TOKEN` — API key (`usk_...`); overrides the stored login.
- `UNISON_API_URL` — API base (default `https://brain.unisonlabs.ai`).
- `UNISON_APP_URL` — dashboard URL for `auth login`.

MIT © Unison Labs · [source + full docs](https://github.com/unison-labs-ai/unison-brain)
