#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { BrainClient, provisionAccount, requestKey, verifyEmail } from "@unisonlabs/sdk";
import { z } from "zod";
import { registerDomainTools } from "./domains";

// Read from package.json at runtime so the server reports the real published
// version (npm includes package.json next to dist/ in the tarball). Resolved
// relative to this module, so it works both from dist/ and `bun run src`.
const { version: VERSION } = JSON.parse(
  readFileSync(new URL("../package.json", import.meta.url), "utf8"),
) as { version: string };

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

const server = new McpServer({ name: "unison-brain", version: VERSION });

server.tool(
  "brain_context",
  "One-call recall: retrieve the most relevant memory for a natural-language query and get back a prompt-ready `contextMd` block. Use this BEFORE answering any question that may depend on the user's or team's history, decisions, conventions, or relationships. The brain does NO answer generation — pass `contextMd` verbatim into your system prompt or user turn and let your LLM compose the answer from it.",
  {
    query: z.string().describe("Natural-language question to recall context for"),
    mode: z
      .enum(["auto", "deep", "standard"])
      .optional()
      .describe(
        "Retrieval depth: auto (default) = server decides; deep = multi-hop graph expansion; standard = single-pass vector",
      ),
    k: z
      .number()
      .int()
      .min(1)
      .max(50)
      .optional()
      .describe("Max semantic hits to return (default 10)"),
    maxEntities: z
      .number()
      .int()
      .min(0)
      .max(10)
      .optional()
      .describe("Max entity summaries to include (default 3)"),
  },
  async ({ query, mode, k, maxEntities }) => {
    ensureAuth();
    return asText(await client.context({ query, mode, k, maxEntities }));
  },
);

server.tool(
  "brain_ingest",
  "Stream conversations or documents into brain memory. Conversations are routed through the signal-extraction pipeline and produce entities + facts. Documents land as extractable notes. Use this to persist important context from the current session so it survives future sessions.",
  {
    items: z
      .array(
        z.discriminatedUnion("type", [
          z.object({
            type: z.literal("conversation"),
            turns: z
              .array(
                z.object({
                  role: z.enum(["user", "assistant", "system"]),
                  content: z.string(),
                  name: z.string().optional(),
                }),
              )
              .describe("The conversation turns to ingest"),
            sourceRef: z
              .string()
              .describe("Stable caller-side identifier for this conversation (session/thread id)"),
            visibility: z.enum(["tenant", "private"]).optional(),
            idempotencyKey: z.string().optional(),
          }),
          z.object({
            type: z.literal("document"),
            content: z.string().describe("Markdown content of the document"),
            title: z.string().optional(),
            path: z
              .string()
              .optional()
              .describe("Brain path to write the document to (e.g. /private/notes/foo.md)"),
            tags: z.array(z.string()).optional(),
            visibility: z.enum(["tenant", "private"]).optional(),
            sourceRef: z.string().optional(),
          }),
        ]),
      )
      .min(1)
      .max(100)
      .describe("1–100 items: conversations or documents"),
  },
  async ({ items }) => {
    ensureAuth();
    return asText(await client.ingest({ items }));
  },
);

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
    pathPrefix: z
      .string()
      .optional()
      .describe("Restrict results to documents under this path prefix (e.g. /private/notes)"),
  },
  async ({ query, limit, memoryType, pathPrefix }) => {
    ensureAuth();
    return asText(await client.search(query, { limit, memoryType, pathPrefix }));
  },
);

server.tool(
  "brain_get",
  "Read a single document from the Unison brain by its path.",
  { path: z.string().describe("Document path, e.g. /tenant/projects/architecture.md") },
  async ({ path }) => {
    ensureAuth();
    return asText(await client.get(path));
  },
);

server.tool(
  "brain_list",
  "List documents in the Unison brain under a path prefix.",
  {
    prefix: z.string().optional().describe("Path prefix, e.g. /private or /tenant/people"),
    limit: z.number().int().positive().optional().describe("Max items (default 100)"),
  },
  async ({ prefix, limit }) => {
    ensureAuth();
    return asText(await client.list({ prefix, limit }));
  },
);

server.tool(
  "brain_write",
  "Write or update a document in the Unison brain so the knowledge persists across sessions and machines. Writable roots: /private/… (e.g. /private/notes/<slug>.md), /tenant/… (e.g. /tenant/people/<slug>.md), and /teams/<slug>/… . A bare name routes to /private/notes/; legacy /wiki, /actions, /skills roots are gone.",
  {
    path: z.string().describe("Document path, e.g. /private/notes/auth-decision.md"),
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
  "brain_edit",
  "Surgically edit a brain document in place: replace an exact substring (oldStr) with newStr. oldStr must match exactly once — add surrounding context to disambiguate. Cheaper and safer than rewriting the whole doc with brain_write.",
  {
    path: z.string().describe("Document path, e.g. /private/notes/auth-decision.md"),
    oldStr: z.string().describe("Exact text to replace (must occur exactly once)"),
    newStr: z.string().describe("Replacement text"),
  },
  async ({ path, oldStr, newStr }) => {
    ensureAuth();
    return asText(await client.editDoc({ path, oldStr, newStr }));
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

server.tool(
  "web_search",
  "Search the open web (server-side web-search proxy). The only route to the open web — use it to verify a claim or gather external facts the brain doesn't already have.",
  { query: z.string().describe("Search query") },
  async ({ query }) => {
    ensureAuth();
    return asText(await client.research.search(query));
  },
);

// Bootstrap auth tools — these do NOT require UNISON_TOKEN; they let an agent
// create + verify its own account headlessly, then use the returned key.
server.tool(
  "auth_provision",
  "Create a new Unison account for an email with no browser/dashboard. Returns a working (unverified) API key — set it as UNISON_TOKEN. Then verify the emailed code via auth_verify to lift free-tier caps.",
  { email: z.string().describe("Email to anchor the account to") },
  async ({ email }) => asText(await provisionAccount(apiUrl, { email })),
);

server.tool(
  "auth_verify",
  "Verify the code emailed during provisioning (or key recovery). Makes the account durable; recovery codes also return a fresh API key.",
  {
    email: z.string().describe("The account email"),
    code: z.string().describe("The verification code from the email"),
  },
  async ({ email, code }) => asText(await verifyEmail(apiUrl, { email, code })),
);

server.tool(
  "auth_request_key",
  "Email a recovery code for an existing verified account (lost key / new machine). Complete it with auth_verify.",
  { email: z.string().describe("The account email") },
  async ({ email }) => asText(await requestKey(apiUrl, { email })),
);

// Register the non-brain domain tools (work/mail/chat/calendar/people) over the
// same /v1 client.
registerDomainTools({ server, client, ensureAuth, asText });

await server.connect(new StdioServerTransport());
