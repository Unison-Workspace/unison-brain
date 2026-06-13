# @unisonlabs/sdk

Typed TypeScript client for the Unison brain API. Zero runtime dependencies; runs
on Node ≥18 and Bun.

> **🤖 AI agent?** Self-onboard via [AGENTS.md](https://github.com/unison-labs-ai/unison-brain/blob/main/AGENTS.md) — the four-step path to a working brain.

```bash
npm i @unisonlabs/sdk
```

## Use it

```ts
import { BrainClient } from "@unisonlabs/sdk";

const brain = new BrainClient({
  apiUrl: process.env.UNISON_API_URL ?? "https://brain.unisonlabs.ai",
  token: process.env.UNISON_TOKEN, // an API key — run `unison auth login` to get one
});

// Documents — paths follow the FS contract; bare names route to /private/notes/.
const hits = await brain.search("auth decision", { limit: 5 });
const doc = await brain.get("/workspace/projects/architecture.md");
await brain.write({ path: "/private/notes/x.md", bodyMd: "We chose X because Y." });
await brain.editDoc({ path: "/private/notes/x.md", oldStr: "X", newStr: "Z" }); // surgical edit

// Knowledge graph
const daniel = await brain.entities.resolve("Daniel");
if (daniel) {
  const facts = await brain.facts.about(daniel.id);
}
```

Namespaces: top-level document methods (`search`, `grep`, `get`, `list`, `listFs`,
`getRaw`, `write`, `editDoc`, `delete`, `tag`, `share`, `neighbors`, `status`,
`whoami`) and the graph namespaces `brain.entities.*`, `brain.facts.*`,
`brain.links.*`, `brain.review.*`, `brain.jobs.*`. Failed calls throw
`BrainError` (with `.status` and `.code`).

MIT © Unison Labs · [source + full docs](https://github.com/unison-labs-ai/unison-brain)
