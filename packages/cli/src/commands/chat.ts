import type { BrainClient } from "@unisonlabs/sdk";
import type { Command } from "commander";
import { requireClient } from "../client-factory";
import { printJson } from "../output";

/**
 * Resolve a teammate name to a single member. Case-insensitive substring match;
 * returns null when the query is ambiguous (>1 hit) or matches nobody, so the
 * caller surfaces the candidates instead of DMing the wrong person.
 */
export function resolveMember(
  members: Array<Record<string, unknown>>,
  query: string,
): Record<string, unknown> | null {
  const q = query.trim().toLowerCase();
  const hits = members.filter((m) => {
    const name = m.name;
    return typeof name === "string" && name.toLowerCase().includes(q);
  });
  return hits.length === 1 ? (hits[0] ?? null) : null;
}

/** Resolve a teammate name → an open/created DM channel id (+ the matched name). */
async function resolveDm(c: BrainClient, name: string): Promise<{ channelId: string; to: string }> {
  const members = (await c.chat.members(name)) as Array<Record<string, unknown>>;
  const member = resolveMember(members, name);
  if (!member) {
    const candidates = members
      .map((m) => m.name)
      .filter((n): n is string => typeof n === "string")
      .join(", ");
    throw new Error(
      `No unique member matched "${name}".${candidates ? ` Candidates: ${candidates}` : ""}`,
    );
  }
  const dm = (await c.chat.openDm(String(member.id))) as { channelId?: unknown };
  if (typeof dm.channelId !== "string") {
    throw new Error("Opening the DM did not return a channelId.");
  }
  return { channelId: dm.channelId, to: String(member.name) };
}

export function registerChat(program: Command): void {
  const chat = program.command("chat").description("Chat — channels, messages");

  chat
    .command("channels")
    .description("List channels")
    .action(async () => {
      const c = await requireClient();
      printJson(await c.chat.channels());
    });

  chat
    .command("channel <id>")
    .description("Get a channel")
    .action(async (id: string) => {
      const c = await requireClient();
      printJson(await c.chat.channel(id));
    });

  chat
    .command("messages")
    .description("List messages in a channel")
    .requiredOption("--channel <id>")
    .option("--limit <n>")
    .action(async (o: { channel: string; limit?: string }) => {
      const c = await requireClient();
      printJson(await c.chat.messages(o.channel, { limit: o.limit ? Number(o.limit) : undefined }));
    });

  chat
    .command("send")
    .description("Send a message to a channel (--channel) or a teammate by name (--to)")
    .option("--channel <id>")
    .option("--to <name>", "teammate name; resolves to (or opens) a DM")
    .requiredOption("--content <text>")
    .action(async (o: { channel?: string; to?: string; content: string }) => {
      const c = await requireClient();
      let channelId = o.channel;
      if (!channelId && o.to) channelId = (await resolveDm(c, o.to)).channelId;
      if (!channelId) throw new Error("Provide --channel <id> or --to <name>.");
      printJson(await c.chat.send({ channelId, content: o.content }));
    });

  chat
    .command("dm <name...>")
    .description("Open or create a DM with a teammate by name; prints its channelId")
    .action(async (nameParts: string[]) => {
      const c = await requireClient();
      printJson(await resolveDm(c, nameParts.join(" ")));
    });

  chat
    .command("search <query...>")
    .description("Search messages")
    .option("--channel <id>")
    .option("--limit <n>")
    .action(async (q: string[], o: { channel?: string; limit?: string }) => {
      const c = await requireClient();
      printJson(
        await c.chat.search(q.join(" "), {
          channelId: o.channel,
          limit: o.limit ? Number(o.limit) : undefined,
        }),
      );
    });

  // Agent-first: these commands always emit JSON. Accept the documented --json
  // flag for parity so `unison chat <cmd> --json` doesn't error.
  for (const cmd of chat.commands) cmd.option("--json", "Output JSON (default)");
}
