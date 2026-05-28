# @unisonlabs/sdk

Typed TypeScript client for the Unison brain API. Zero runtime dependencies; runs
on Node ≥18 and Bun.

> **🤖 AI agent?** Self-onboard via [AGENTS.md](https://github.com/Unison-Workspace/unison-brain/blob/main/AGENTS.md) — the four-step path to a working brain.

```bash
npm i @unisonlabs/sdk
```

## Use it

```ts
import { BrainClient } from "@unisonlabs/sdk";

const brain = new BrainClient({
  baseUrl: "https://api.unisonlabs.ai",
  token: process.env.UNISON_TOKEN, // an API key minted in the dashboard
});

// Documents — paths follow the FS contract; bare names route to /private/notes/.
const hits = await brain.search("auth decision", { limit: 5 });
const doc = await brain.get("/tenant/projects/architecture.md");
await brain.write({ path: "/private/notes/x.md", bodyMd: "We chose X because Y." });
await brain.editDoc({ path: "/private/notes/x.md", oldStr: "X", newStr: "Z" }); // surgical edit

// Work — one apply endpoint takes the operation DSL (tasks/docs/tables/records/views).
await brain.work.apply({
  operations: [{ op: "record.upsert", tableId: { ref: "tasks" }, primaryText: "Ship v1" }],
});
const tasks = await brain.work.search({ query: "ship", limit: 5 });

// Knowledge graph
const daniel = await brain.entities.resolve("Daniel");
if (daniel) {
  const facts = await brain.facts.about(daniel.id);
}
```

Namespaces: top-level document methods (`search`, `grep`, `get`, `list`, `listFs`,
`getRaw`, `write`, `editDoc`, `delete`, `tag`, `share`, `neighbors`, `status`,
`whoami`) plus `brain.work.*` (the canonical workspace surface — `apply` /
`query` / `search` / `inspect` / `tree` / `folder` / `artifact` / `tableSchema` /
`viewQuery` / `assets`), `brain.mail.*`, `brain.chat.*`, `brain.calendar.*`,
`brain.people.*`, and the graph namespaces `brain.entities.*`, `brain.facts.*`,
`brain.links.*`, `brain.review.*`, `brain.jobs.*`. Failed calls throw
`BrainError` (with `.status` and `.code`).

Auth helpers for building your own login flow are also exported (`generatePkce`,
`buildAuthorizeUrl`, `exchangeCode`, `startDeviceAuth`, `pollDeviceToken`).

MIT © Unison Labs · [source + full docs](https://github.com/Unison-Workspace/unison-brain)
