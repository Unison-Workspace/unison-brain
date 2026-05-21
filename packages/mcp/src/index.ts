#!/usr/bin/env bun
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { BrainClient } from "@unison/sdk";
import { z } from "zod";

const apiUrl = process.env.UNISON_API_URL ?? "https://api.unison.computer";
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
    kind: z.string().optional().describe("Filter by document kind"),
    tag: z.string().optional().describe("Filter by tag"),
  },
  async ({ query, limit, kind, tag }) => {
    ensureAuth();
    return asText(await client.search(query, { limit, kind, tag }));
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
  "brain_write",
  "Write or update a document in the Unison brain so the knowledge persists across sessions and machines.",
  {
    path: z.string().describe("Document path, e.g. /notes/auth-decision"),
    content: z.string().describe("Markdown content"),
    kind: z.string().optional().describe("Document kind (default: note)"),
    tags: z.array(z.string()).optional().describe("Tags"),
  },
  async ({ path, content, kind, tags }) => {
    ensureAuth();
    return asText(await client.write({ path, content, kind, tags }));
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
    return asText(await client.list(prefix ?? "", limit ?? 100));
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
