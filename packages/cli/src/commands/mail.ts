import type { Command } from "commander";
import { requireClient } from "../client-factory";
import { printJson } from "../output";

export function registerMail(program: Command): void {
  const mail = program.command("mail").description("Mail — threads, drafts, send");

  mail
    .command("connection")
    .description("Show the connected mail account")
    .action(async () => {
      const c = await requireClient();
      printJson(await c.mail.connection());
    });

  mail
    .command("folders")
    .description("Folder counts")
    .action(async () => {
      const c = await requireClient();
      printJson(await c.mail.folders());
    });

  mail
    .command("threads")
    .description("List threads")
    .option("--folder <folder>", "inbox | sent | drafts | starred | trash")
    .option("--q <query>")
    .option("--limit <n>")
    .action(async (o) => {
      const c = await requireClient();
      printJson(
        await c.mail.threads({
          folder: o.folder,
          q: o.q,
          limit: o.limit ? Number(o.limit) : undefined,
        }),
      );
    });

  mail
    .command("thread <id>")
    .description("Get a thread")
    .action(async (id: string) => {
      const c = await requireClient();
      printJson(await c.mail.thread(id));
    });

  mail
    .command("send")
    .description("Send an email")
    .requiredOption("--to <email...>")
    .option("--cc <email...>")
    .option("--subject <subject>")
    .option("--body <body>")
    .option("--thread <id>", "reply within a Gmail thread")
    .action(async (o) => {
      const c = await requireClient();
      printJson(
        await c.mail.send({
          to: o.to,
          cc: o.cc,
          subject: o.subject,
          body: o.body,
          threadId: o.thread,
        }),
      );
    });

  mail
    .command("draft")
    .description("Get the draft for a thread")
    .requiredOption("--thread <id>")
    .action(async (o) => {
      const c = await requireClient();
      printJson(await c.mail.draft(o.thread));
    });
}
