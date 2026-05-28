/**
 * Minimal @unisonlabs/sdk usage. Run with:
 *   UNISON_TOKEN=usk_live_... bun examples/basic.ts "auth decision"
 */
import { BrainClient } from "@unisonlabs/sdk";

const token = process.env.UNISON_TOKEN;
if (!token) {
  console.error("Set UNISON_TOKEN (Settings → API keys in the dashboard).");
  process.exit(1);
}

const client = new BrainClient({
  baseUrl: process.env.UNISON_API_URL ?? "https://api.unisonlabs.ai",
  token,
});

const query = process.argv[2] ?? "hello";

// 1. Search (hybrid keyword + semantic).
const hits = await client.search(query, { limit: 5 });
console.log(`\nTop ${hits.length} results for "${query}":`);
for (const hit of hits) {
  console.log(`  ${hit.doc.path}  (${hit.score.toFixed(2)})  ${hit.doc.title ?? ""}`);
}

// 2. Read the top hit in full.
if (hits[0]) {
  const doc = await client.get(hits[0].doc.path);
  console.log(`\n--- ${doc.path} ---\n${doc.bodyMd.slice(0, 400)}`);
}

// 3. Write a note (requires the key to have brain:write). Paths follow the FS
//    contract: /private/… is your private space; a bare name routes there too.
const note = await client.write({
  path: "/private/notes/sdk-example.md",
  bodyMd: `Written by examples/basic.ts at ${new Date().toISOString()}`,
  title: "SDK example",
});
console.log(`\nWrote ${note.path}`);

// 4. Surgical in-place edit — replace an exact string without rewriting the doc.
await client.editDoc({ path: note.path, oldStr: "Written by", newStr: "Updated by" });

// 5. Search the Work surface (tasks/docs/tables/records) — needs a work:read key.
const work = await client.work.search({ query, limit: 5 });
console.log("\nWork search:", JSON.stringify(work).slice(0, 300));

// 6. Brain health.
console.log("\nStatus:", await client.status());
