# @unisonlabs/sdk

Typed TypeScript client for the Unison brain API. Zero runtime dependencies; runs
on Node ≥18 and Bun.

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

// Documents
const hits = await brain.search("auth decision", { limit: 5 });
const doc = await brain.get("/wiki/architecture");
await brain.write({ path: "/wiki/x", bodyMd: "We chose X because Y." });

// Knowledge graph
const daniel = await brain.entities.resolve("Daniel");
if (daniel) {
  const facts = await brain.facts.about(daniel.id);
}
```

Namespaces: top-level document methods (`search`, `grep`, `get`, `list`, `listFs`,
`getRaw`, `write`, `delete`, `tag`, `share`, `neighbors`, `status`, `whoami`) plus
`brain.entities.*`, `brain.facts.*`, `brain.links.*`, `brain.review.*`,
`brain.jobs.*`. Failed calls throw `BrainError` (with `.status` and `.code`).

Auth helpers for building your own login flow are also exported (`generatePkce`,
`buildAuthorizeUrl`, `exchangeCode`, `startDeviceAuth`, `pollDeviceToken`).

MIT © Auraqu, Inc. · [source + full docs](https://github.com/Unison-Workspace/unison-brain)
