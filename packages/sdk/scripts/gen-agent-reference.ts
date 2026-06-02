#!/usr/bin/env bun
// Generates the agent-facing SDK reference from the SDK's own typed surface.
//
// The agent learns to call the brain through `@unisonlabs/sdk`. Its docs must
// therefore show SDK call form (`u.work.records(...)`), not raw REST paths — a
// REST-shaped doc trains the model to hand-roll `fetch()`. This reads the
// published `.d.ts` (signatures + JSDoc, the real source of truth) and emits:
//   - AGENT-REFERENCE.md   — human/agent readable, per-domain method list
//   - agent-reference.json — structured, consumed by the Unison synth docs
// so there is exactly one source (the SDK types) and the agent docs can't drift.
//
// Run via `bun run gen:agent-docs` (wired into build). Reads dist/*.d.ts, so the
// SDK must be built first.

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const SDK_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DIST = join(SDK_ROOT, "dist");

// Domain order + one-line intros. `prop` is the BrainClient property the agent
// calls through (null = a root method on the client itself).
const DOMAINS: { key: string; prop: string | null; api: string | null; intro: string }[] = [
  {
    key: "brain",
    prop: null,
    api: null,
    intro: "Documents + filesystem on the brain — called directly on the client.",
  },
  {
    key: "entities",
    prop: "entities",
    api: "EntitiesApi",
    intro: "Knowledge-graph entities (people, companies, projects, …).",
  },
  { key: "facts", prop: "facts", api: "FactsApi", intro: "Bitemporal facts about entities." },
  { key: "links", prop: "links", api: "LinksApi", intro: "Edges between graph entities." },
  {
    key: "review",
    prop: "review",
    api: "ReviewApi",
    intro: "Entity-resolution conflicts + merge review.",
  },
  { key: "jobs", prop: "jobs", api: "JobsApi", intro: "Background brain maintenance jobs." },
  {
    key: "work",
    prop: "work",
    api: "WorkApi",
    intro:
      "Work primitives — folders, documents, tables, records, views, assets, and the CRM/Tasks tables.",
  },
  { key: "mail", prop: "mail", api: "MailApi", intro: "Gmail — threads, drafts, send." },
  {
    key: "chat",
    prop: "chat",
    api: "ChatApi",
    intro: "Workspace chat — channels, messages, DMs, members.",
  },
  { key: "calendar", prop: "calendar", api: "CalendarApi", intro: "Calendar — events." },
  { key: "people", prop: "people", api: "PeopleApi", intro: "CRM people search." },
  {
    key: "research",
    prop: "research",
    api: "ResearchApi",
    intro: "Open-web search (server-side proxy).",
  },
];

interface Method {
  name: string;
  signature: string;
  doc: string;
  sdkCall: string;
}

// Pull the JSDoc text off a node's leading comment, stripped of ` * ` markers.
function jsDoc(node: ts.Node, sf: ts.SourceFile): string {
  const full = node.getFullText(sf);
  const ranges = ts.getLeadingCommentRanges(full, 0) ?? [];
  const block = ranges
    .map((r) => full.slice(r.pos, r.end))
    .filter((c) => c.startsWith("/**"))
    .join("\n");
  if (!block) return "";
  return block
    .replace(/^\/\*\*/, "")
    .replace(/\*\/$/, "")
    .split("\n")
    .map((l) => l.replace(/^\s*\*?\s?/, "").trimEnd())
    .join("\n")
    .trim();
}

function signature(node: ts.Node, sf: ts.SourceFile): string {
  // node.getText() excludes leading comments; collapse internal whitespace.
  return node.getText(sf).replace(/\s+/g, " ").replace(/;$/, "").trim();
}

// Parse every dist .d.ts into source files we can walk syntactically.
const program = ts.createProgram([join(DIST, "client.d.ts")], {
  allowJs: false,
  declaration: true,
  noResolve: false,
});
const sources = program
  .getSourceFiles()
  .filter((sf) => sf.fileName.includes("/dist/") && sf.fileName.endsWith(".d.ts"));

function findInterface(name: string): { node: ts.InterfaceDeclaration; sf: ts.SourceFile } | null {
  for (const sf of sources) {
    for (const stmt of sf.statements) {
      if (ts.isInterfaceDeclaration(stmt) && stmt.name.text === name) return { node: stmt, sf };
    }
  }
  return null;
}

function findClass(name: string): { node: ts.ClassDeclaration; sf: ts.SourceFile } | null {
  for (const sf of sources) {
    for (const stmt of sf.statements) {
      if (ts.isClassDeclaration(stmt) && stmt.name?.text === name) return { node: stmt, sf };
    }
  }
  return null;
}

function methodsFromApi(api: string, prop: string): Method[] {
  const found = findInterface(api);
  if (!found) throw new Error(`interface ${api} not found in dist .d.ts`);
  const out: Method[] = [];
  for (const m of found.node.members) {
    if (!ts.isMethodSignature(m) || !m.name) continue;
    const name = m.name.getText(found.sf);
    out.push({
      name,
      signature: signature(m, found.sf),
      doc: jsDoc(m, found.sf),
      sdkCall: `u.${prop}.${name}`,
    });
  }
  return out;
}

function rootMethods(): Method[] {
  const found = findClass("BrainClient");
  if (!found) throw new Error("BrainClient class not found");
  const out: Method[] = [];
  for (const m of found.node.members) {
    if (!ts.isMethodDeclaration(m) || !m.name) continue;
    const name = m.name.getText(found.sf);
    if (name === "constructor" || name.startsWith("#")) continue;
    const mods = ts.getCombinedModifierFlags(m);
    if (mods & ts.ModifierFlags.Private || mods & ts.ModifierFlags.Protected) continue;
    out.push({
      name,
      signature: signature(m, found.sf),
      doc: jsDoc(m, found.sf),
      sdkCall: `u.${name}`,
    });
  }
  return out;
}

const reference: Record<string, { intro: string; methods: Method[] }> = {};
for (const d of DOMAINS) {
  reference[d.key] = {
    intro: d.intro,
    methods: d.api && d.prop ? methodsFromApi(d.api, d.prop) : rootMethods(),
  };
}

const { version } = JSON.parse(readFileSync(join(SDK_ROOT, "package.json"), "utf8")) as {
  version: string;
};

// ── agent-reference.json (structured, for Unison's synth docs) ────────────────
writeFileSync(
  join(SDK_ROOT, "agent-reference.json"),
  `${JSON.stringify({ version, generatedFrom: "@unisonlabs/sdk type declarations", domains: reference }, null, 2)}\n`,
);

// ── AGENT-REFERENCE.md (human/agent readable) ─────────────────────────────────
const lines: string[] = [];
lines.push(`# Unison SDK — agent method reference (v${version})`);
lines.push("");
lines.push("Generated from the `@unisonlabs/sdk` type declarations. Call the brain");
lines.push("through the SDK, never by hand-rolling `fetch()` to `/v1/…` paths:");
lines.push("");
lines.push("```ts");
lines.push('import { BrainClient } from "@unisonlabs/sdk";');
lines.push(
  'const u = new BrainClient({ baseUrl: Deno.env.get("UNISON_API_URL"), token: Deno.env.get("UNISON_TOKEN") });',
);
lines.push("```");
lines.push("");
for (const d of DOMAINS) {
  const r = reference[d.key];
  if (!r) continue;
  lines.push(`## ${d.key}`);
  lines.push("");
  lines.push(r.intro);
  lines.push("");
  for (const m of r.methods) {
    lines.push(`### \`${m.sdkCall}\``);
    lines.push("");
    lines.push("```ts");
    lines.push(m.signature);
    lines.push("```");
    if (m.doc) {
      lines.push("");
      lines.push(m.doc);
    }
    lines.push("");
  }
}
writeFileSync(join(SDK_ROOT, "AGENT-REFERENCE.md"), `${lines.join("\n")}\n`);

const total = Object.values(reference).reduce((n, r) => n + r.methods.length, 0);
console.log(
  `Generated AGENT-REFERENCE.md + agent-reference.json — ${total} methods across ${DOMAINS.length} domains (SDK v${version}).`,
);
