#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { BrainClient } from "@unisonlabs/sdk";
import { z } from "zod";

const apiUrl = process.env.UNISON_API_URL ?? "https://api.unisonlabs.ai";
const token = process.env.UNISON_TOKEN;

const client = new BrainClient({ baseUrl: apiUrl, token });

function ensureAuth(): void {
  if (!token) {
    throw new Error(
      "UNISON_TOKEN is not set. Generate an API key in Unison and set UNISON_TOKEN (and optionally UNISON_API_URL).",
    );
  }
}

function asText(data: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
}

const server = new McpServer({ name: "unison-brain", version: "0.1.0" });

server.tool(
  "brain_search",
  "Search the Unison brain (hybrid keyword + semantic). Use before answering questions that may rely on the user's prior decisions, conventions, or notes.",
  {
    query: z.string().describe("Natural-language or keyword query"),
    limit: z.number().int().positive().optional().describe("Max results (default 10)"),
    memoryType: z
      .enum(["episodic", "semantic", "procedural", "auto"])
      .optional()
      .describe("Memory tier filter"),
  },
  async ({ query, limit, memoryType }) => {
    ensureAuth();
    return asText(await client.search(query, { limit, memoryType }));
  },
);

server.tool(
  "brain_get",
  "Read a single document from the Unison brain by its path.",
  { path: z.string().describe("Document path, e.g. /wiki/architecture") },
  async ({ path }) => {
    ensureAuth();
    return asText(await client.get(path));
  },
);

server.tool(
  "brain_list",
  "List documents in the Unison brain under a path prefix.",
  {
    prefix: z.string().optional().describe("Path prefix, e.g. /wiki"),
    limit: z.number().int().positive().optional().describe("Max items (default 100)"),
  },
  async ({ prefix, limit }) => {
    ensureAuth();
    return asText(await client.list({ prefix, limit }));
  },
);

server.tool(
  "brain_write",
  "Write or update a document in the Unison brain so the knowledge persists across sessions and machines. Only /wiki/, /skills/, /actions/ paths are writable.",
  {
    path: z.string().describe("Document path, e.g. /wiki/auth-decision"),
    bodyMd: z.string().describe("Markdown content"),
    title: z.string().optional(),
    tags: z.array(z.string()).optional(),
  },
  async ({ path, bodyMd, title, tags }) => {
    ensureAuth();
    return asText(await client.write({ path, bodyMd, title, tags }));
  },
);

server.tool(
  "brain_resolve_entity",
  "Find a knowledge-graph entity (person, company, project, etc.) by name. Use when a name is mentioned and you need its id or context.",
  {
    name: z.string().describe("Entity display name"),
    kindHint: z
      .enum([
        "person",
        "company",
        "project",
        "decision",
        "topic",
        "mail_thread",
        "event",
        "task",
        "doc",
      ])
      .optional(),
  },
  async ({ name, kindHint }) => {
    ensureAuth();
    return asText(await client.entities.resolve(name, kindHint));
  },
);

server.tool(
  "brain_facts_about",
  "List the known facts about an entity (by entity id).",
  {
    entityId: z.string().describe("Entity id (from brain_resolve_entity)"),
    includeInvalidated: z.boolean().optional(),
  },
  async ({ entityId, includeInvalidated }) => {
    ensureAuth();
    return asText(await client.facts.about(entityId, { includeInvalidated }));
  },
);

server.tool(
  "brain_record_fact",
  "Record a new fact about an entity so it persists in the brain.",
  {
    subjectId: z.string().describe("Entity id the fact is about"),
    predicate: z.string().describe("Relation, e.g. 'works_at'"),
    factText: z.string().describe("The fact in natural language"),
    confidence: z.number().min(0).max(1).optional(),
  },
  async ({ subjectId, predicate, factText, confidence }) => {
    ensureAuth();
    return asText(await client.facts.record({ subjectId, predicate, factText, confidence }));
  },
);

server.tool(
  "brain_status",
  "Show Unison brain health and document/entity/fact counts.",
  {},
  async () => {
    ensureAuth();
    return asText(await client.status());
  },
);

await server.connect(new StdioServerTransport());
