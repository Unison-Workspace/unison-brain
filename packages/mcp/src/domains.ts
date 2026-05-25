// Phase G — MCP tools for the non-brain /v1 domains (tasks, workspace, mail,
// chat, crm, calendar, people). Registered alongside the brain tools so a
// chat-only / IDE-embedded agent can act over the whole surface, not just memory.

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { BrainClient } from "@unisonlabs/sdk";
import { z } from "zod";

interface Deps {
  server: McpServer;
  client: BrainClient;
  ensureAuth: () => void;
  asText: (data: unknown) => { content: { type: "text"; text: string }[] };
}

export function registerDomainTools({ server, client, ensureAuth, asText }: Deps): void {
  // ── Tasks ──────────────────────────────────────────────────────────────
  server.tool(
    "tasks_list",
    "List tasks, optionally filtered by project/board/assignee or a search term.",
    {
      project: z.string().optional(),
      board: z.string().optional(),
      assignee: z.string().optional(),
      search: z.string().optional(),
      limit: z.number().int().positive().optional(),
    },
    async ({ project, board, assignee, search, limit }) => {
      ensureAuth();
      return asText(
        await client.tasks.list({
          projectId: project,
          taskBoardId: board,
          assigneeId: assignee,
          search,
          limit,
        }),
      );
    },
  );
  server.tool(
    "tasks_create",
    "Create a task. Provide a project or board to file it under.",
    {
      title: z.string(),
      description: z.string().optional(),
      project: z.string().optional(),
      board: z.string().optional(),
      priority: z.string().optional(),
      assignee: z.string().optional(),
      dueDate: z.string().optional(),
    },
    async ({ title, description, project, board, priority, assignee, dueDate }) => {
      ensureAuth();
      return asText(
        await client.tasks.create({
          title,
          description,
          projectId: project,
          taskBoardId: board,
          priority,
          assigneeId: assignee,
          dueDate,
        }),
      );
    },
  );

  // ── Workspace ──────────────────────────────────────────────────────────
  server.tool("workspace_team_spaces", "List the workspace team spaces.", {}, async () => {
    ensureAuth();
    return asText(await client.workspace.teamSpaces());
  });
  server.tool(
    "workspace_tree",
    "List the node tree (folders + artifacts) of a team space.",
    { teamSpaceId: z.string() },
    async ({ teamSpaceId }) => {
      ensureAuth();
      return asText(await client.workspace.tree(teamSpaceId));
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

  // ── CRM ────────────────────────────────────────────────────────────────
  server.tool(
    "crm_search_records",
    "Search CRM records (people, companies, deals, …).",
    {
      query: z.string(),
      objectSlug: z.string().optional(),
      limit: z.number().int().positive().optional(),
    },
    async ({ query, objectSlug, limit }) => {
      ensureAuth();
      return asText(await client.crm.searchRecords({ q: query, objectSlug, limit }));
    },
  );
  server.tool(
    "crm_create_note",
    "Add a note to a CRM record.",
    { recordId: z.string(), bodyMd: z.string() },
    async ({ recordId, bodyMd }) => {
      ensureAuth();
      return asText(await client.crm.createNote({ recordId, bodyMd }));
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
