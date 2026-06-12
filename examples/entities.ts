/**
 * Knowledge-graph usage: resolve an entity, read its facts, record a new one.
 * Run with:  UNISON_TOKEN=usk_live_... bun examples/entities.ts "Daniel"
 */
import { BrainClient } from "@unisonlabs/sdk";

const token = process.env.UNISON_TOKEN;
if (!token) {
  console.error("Set UNISON_TOKEN — run `unison auth login` to get one.");
  process.exit(1);
}

const brain = new BrainClient({
  baseUrl: process.env.UNISON_API_URL ?? "https://api.unisonlabs.ai",
  token,
});

const name = process.argv[2] ?? "Daniel";

// 1. Resolve a messy name to the one canonical entity (fuzzy + alias match).
const entity = await brain.entities.resolve(name);
if (!entity) {
  console.error(`No entity matched "${name}". Create one with brain.entities.upsert(...).`);
  process.exit(1);
}
console.log(`Resolved "${name}" → ${entity.displayName} (${entity.kind}, id ${entity.id})`);

// 2. Read what the brain knows about it.
const facts = await brain.facts.about(entity.id);
console.log(`\n${facts.length} fact(s):`);
for (const f of facts) console.log(`  ${f.predicate}: ${f.factText}`);

// 3. Record a new fact (needs a brain:write-scoped token).
const recorded = await brain.facts.record({
  subjectId: entity.id,
  predicate: "noted_by",
  factText: `Touched by examples/entities.ts at ${new Date().toISOString()}`,
  confidence: 0.9,
});
console.log(`\nRecorded fact ${recorded.id}`);

// 4. Chronological view.
const timeline = await brain.facts.timeline(entity.id);
console.log(`\nTimeline: ${timeline.length} fact(s) over time.`);
