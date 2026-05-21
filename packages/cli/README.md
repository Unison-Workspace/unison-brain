# @unisonlabs/cli

The `unison` command — your cloud knowledge base (the Unison brain) in the
terminal and in any coding agent.

```bash
npm i -g @unisonlabs/cli      # or: pnpm add -g / bun add -g / npx @unisonlabs/cli
unison auth login             # browser sign-in (or UNISON_TOKEN=usk_... for CI)
```

## Use it

```bash
unison search "auth decision" -k 5      # hybrid keyword + semantic search
unison cat /wiki/architecture.md         # read a document (alias of get)
unison ls /wiki                          # directory view; also: tree, find
echo "We chose X because Y." | unison write /wiki/x.md   # paths end in .md
unison entity resolve "Daniel"           # knowledge-graph lookup
unison fact ls --entity <id>             # facts about an entity
unison skill install                     # drop the Agent Skill into ~/.claude/skills
```

Documents: `search`, `grep`, `cat`/`get`, `ls`, `tree`, `find`, `write`, `rm`,
`tag`, `share`, `neighbors`, `links`, `link`. Graph: `entity`, `fact`, `timeline`.
Admin: `review`, `jobs`. Run `unison --help` or `unison <cmd> --help`.

## For agents

Add `--json` for machine output (JSON on stdout, compact when piped). Errors are a
JSON envelope on stderr with a nonzero exit code (`4` auth, `3` not found,
`5` conflict, `1` other). Destructive commands need `--yes` non-interactively.

## Env

- `UNISON_TOKEN` — API key (`usk_...`); overrides the stored login.
- `UNISON_API_URL` — API base (default `https://api.unisonlabs.ai`).
- `UNISON_APP_URL` — dashboard URL for `auth login`.

MIT © Auraqu, Inc. · [source + full docs](https://github.com/Unison-Workspace/unison-brain)
