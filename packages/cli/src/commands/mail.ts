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
    .action(
      async (o: {
        folder?: "inbox" | "sent" | "drafts" | "starred" | "trash";
        q?: string;
        limit?: string;
      }) => {
        const c = await requireClient();
        printJson(
          await c.mail.threads({
            folder: o.folder,
            q: o.q,
            limit: o.limit ? Number(o.limit) : undefined,
          }),
        );
      },
    );

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
    .action(
      async (o: {
        to: string[];
        cc?: string[];
        subject?: string;
        body?: string;
        thread?: string;
      }) => {
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
      },
    );

  mail
    .command("draft")
    .description("Draft an email into the in-app review surface (new email, or reply-in-thread)")
    .option("--to <addr...>", "Recipient(s) for a new email")
    .option("--cc <addr...>")
    .option("--subject <subject>")
    .option("--body <body>")
    .option("--reply-to-thread <id>", "Reply within a Gmail thread (recipients + subject derived)")
    .option("--reply-mode <mode>", "reply | reply_all")
    .option("--session <id>", "Agent session to attach to (defaults to $UNISON_SESSION_ID)")
    .action(
      async (o: {
        to?: string[];
        cc?: string[];
        subject?: string;
        body?: string;
        replyToThread?: string;
        replyMode?: "reply" | "reply_all";
        session?: string;
      }) => {
        const c = await requireClient();
        printJson(
          await c.mail.draft({
            to: o.to,
            cc: o.cc,
            subject: o.subject,
            body: o.body,
            replyToThreadId: o.replyToThread,
            replyMode: o.replyMode,
            sessionId: o.session,
          }),
        );
      },
    );

  // Agent-first: these commands always emit JSON. Accept the documented --json
  // flag for parity so `unison mail <cmd> --json` doesn't error.
  for (const cmd of mail.commands) cmd.option("--json", "Output JSON (default)");
}
