// MCP tools for the non-brain /v1 domains (work, mail, chat, calendar, people).
// Registered alongside the brain tools so a chat-only / IDE-embedded agent can
// act over the whole surface, not just memory.
//
// Work is intentionally a small set of tools, not one-per-op: `work_apply` for
// all writes (it takes the operation DSL directly, matching the in-app agent's
// tool shape) plus read helpers. Fanning out all ~47 ops would blow past the
// "use Tool Search when >20 tools" threshold.

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { BrainClient, WorkOperation } from "@unisonlabs/sdk";
import { z } from "zod";

interface Deps {
  server: McpServer;
  client: BrainClient;
  ensureAuth: () => void;
  asText: (data: unknown) => { content: { type: "text"; text: string }[] };
}

export function registerDomainTools({ server, client, ensureAuth, asText }: Deps): void {
  // ── Work ───────────────────────────────────────────────────────────────
  server.tool(
    "work_apply",
    "Apply Work primitive operations (the canonical write path for folders, documents, tables, fields, records, record sets, views, artifacts, and assets). Pass the operation DSL directly. Set dryRun to validate without writing.",
    {
      operations: z
        .array(z.record(z.string(), z.unknown()))
        .describe(
          'Operation DSL objects, each with an "op" discriminator, e.g. { op: "record.upsert", tableId, values }',
        ),
      dryRun: z.boolean().optional(),
    },
    async ({ operations, dryRun }) => {
      ensureAuth();
      return asText(
        await client.work.apply({ operations: operations as unknown as WorkOperation[], dryRun }),
      );
    },
  );
  server.tool(
    "work_query",
    "Query a Work view by id (returns the view's records with its filters/sorts applied).",
    {
      viewId: z.string(),
      query: z
        .record(z.string(), z.unknown())
        .optional()
        .describe("Optional filters / sorts / limit"),
    },
    async ({ viewId, query }) => {
      ensureAuth();
      return asText(await client.work.query({ viewId, query }));
    },
  );
  server.tool(
    "work_search",
    "Search across Work folders, artifacts, documents, tables, records, and assets.",
    { query: z.string(), limit: z.number().int().positive().optional() },
    async ({ query, limit }) => {
      ensureAuth();
      return asText(await client.work.search({ query, limit }));
    },
  );
  server.tool(
    "work_inspect",
    "Inspect a single Work primitive by kind and id.",
    {
      kind: z.enum(["folder", "artifact", "document", "table", "record_set", "view", "asset"]),
      id: z.string(),
    },
    async ({ kind, id }) => {
      ensureAuth();
      return asText(await client.work.inspect({ kind, id }));
    },
  );
  server.tool(
    "work_tree",
    "Read the Work folder + artifact tree (optionally scoped to a team space).",
    { teamSpaceId: z.string().optional() },
    async ({ teamSpaceId }) => {
      ensureAuth();
      return asText(await client.work.tree({ teamSpaceId }));
    },
  );
  server.tool("work_folder", "Get a Work folder by id.", { id: z.string() }, async ({ id }) => {
    ensureAuth();
    return asText(await client.work.folder(id));
  });
  server.tool(
    "work_artifact",
    "Get a mounted Work artifact by id.",
    { id: z.string() },
    async ({ id }) => {
      ensureAuth();
      return asText(await client.work.artifact(id));
    },
  );

  // ── Mail ───────────────────────────────────────────────────────────────
  server.tool(
    "mail_threads",
    "List mail threads in a folder (default inbox).",
    {
      folder: z.enum(["inbox", "sent", "drafts", "starred", "trash"]).optional(),
      q: z.string().optional(),
      limit: z.number().int().positive().optional(),
    },
    async ({ folder, q, limit }) => {
      ensureAuth();
      return asText(await client.mail.threads({ folder, q, limit }));
    },
  );
  server.tool(
    "mail_send",
    "Send an email. Confirm with the user before sending.",
    {
      to: z.array(z.string()),
      subject: z.string().optional(),
      body: z.string().optional(),
      threadId: z.string().optional(),
    },
    async ({ to, subject, body, threadId }) => {
      ensureAuth();
      return asText(await client.mail.send({ to, subject, body, threadId }));
    },
  );

  // ── Chat ───────────────────────────────────────────────────────────────
  server.tool("chat_channels", "List chat channels.", {}, async () => {
    ensureAuth();
    return asText(await client.chat.channels());
  });
  server.tool(
    "chat_send",
    "Send a chat message to a channel.",
    { channelId: z.string(), content: z.string() },
    async ({ channelId, content }) => {
      ensureAuth();
      return asText(await client.chat.send({ channelId, content }));
    },
  );

  // ── Calendar ───────────────────────────────────────────────────────────
  server.tool(
    "calendar_events",
    "List calendar events in a time range (ISO datetimes).",
    { from: z.string(), to: z.string() },
    async ({ from, to }) => {
      ensureAuth();
      return asText(await client.calendar.events({ from, to }));
    },
  );

  // ── People ─────────────────────────────────────────────────────────────
  server.tool(
    "people_search",
    "Search people (CRM 'people' records) by name.",
    { query: z.string(), limit: z.number().int().positive().optional() },
    async ({ query, limit }) => {
      ensureAuth();
      return asText(await client.people.search(query, { limit }));
    },
  );
}
