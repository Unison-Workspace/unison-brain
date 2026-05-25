import type { Command } from "commander";
import { requireClient } from "../client-factory";
import { printJson } from "../output";

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
    .description("Send a message")
    .requiredOption("--channel <id>")
    .requiredOption("--content <text>")
    .action(async (o: { channel: string; content: string }) => {
      const c = await requireClient();
      printJson(await c.chat.send({ channelId: o.channel, content: o.content }));
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
