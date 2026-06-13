import type { LinkKind, ShareKind } from "@unisonlabs/sdk";
import type { Command } from "commander";
import pc from "picocolors";
import { requireClient } from "../client-factory";
import { confirmDestructive } from "../confirm";
import { info, out, printJson, success } from "../output";

export function registerDocs(program: Command): void {
  program
    .command("grep <pattern>")
    .description("Regex scan across document bodies")
    .option("--case-sensitive", "Case-sensitive match")
    .option("-k, --limit <n>", "Max results", "50")
    .option("--json", "Output JSON")
    .action(
      async (pattern: string, opts: { caseSensitive?: boolean; limit: string; json?: boolean }) => {
        const client = await requireClient();
        const docs = await client.grep(pattern, {
          caseSensitive: opts.caseSensitive,
          limit: Number(opts.limit),
        });
        if (opts.json) {
          printJson(docs);
          return;
        }
        for (const d of docs) out(`${pc.cyan(d.path)}${d.title ? `  — ${d.title}` : ""}`);
      },
    );

  program
    .command("rm <path>")
    .description("Delete a document (server rejects read-only tiers)")
    .option("-y, --yes", "Skip the confirmation prompt")
    .option("--json", "Output JSON")
    .action(async (path: string, opts: { json?: boolean; yes?: boolean }) => {
      if (!(await confirmDestructive(`Delete ${path}`, Boolean(opts.yes)))) return;
      const client = await requireClient();
      const res = await client.delete(path);
      if (opts.json) printJson(res);
      else success(`Deleted ${path}`);
    });

  program
    .command("tag <path>")
    .description("Add or remove tags on a document")
    .option("--add <tag...>", "Tags to add")
    .option("--remove <tag...>", "Tags to remove")
    .option("--json", "Output JSON")
    .action(async (path: string, opts: { add?: string[]; remove?: string[]; json?: boolean }) => {
      const client = await requireClient();
      const doc = await client.tag(path, { add: opts.add, remove: opts.remove });
      if (opts.json) printJson(doc);
      else success(`Tags updated on ${doc.path}`);
    });

  program
    .command("share <kind> <id>")
    .description("Promote a private doc/fact/entity to workspace scope")
    .option("--json", "Output JSON")
    .action(async (kind: string, id: string, opts: { json?: boolean }) => {
      const client = await requireClient();
      const res = await client.share(kind as ShareKind, id);
      if (opts.json) printJson(res);
      else success(`Shared ${kind} ${id}`);
    });

  program
    .command("neighbors <idOrPath>")
    .description("Documents linked to/from a doc or entity")
    .option("--kind <kind...>", "Link kind: mentions|derived_from|supersedes|see_also")
    .option("-k, --limit <n>", "Max results", "20")
    .option("--json", "Output JSON")
    .action(async (idOrPath: string, opts: { kind?: string[]; limit: string; json?: boolean }) => {
      const client = await requireClient();
      const docs = await client.neighbors(idOrPath, {
        kinds: opts.kind as LinkKind[] | undefined,
        limit: Number(opts.limit),
      });
      if (opts.json) {
        printJson(docs);
        return;
      }
      for (const d of docs) out(`${d.path}${d.title ? `  — ${d.title}` : ""}`);
    });

  program
    .command("links")
    .description("List all graph edges in the brain")
    .option("-k, --limit <n>", "Max edges", "200")
    .option("--json", "Output JSON")
    .action(async (opts: { limit: string; json?: boolean }) => {
      const client = await requireClient();
      const links = await client.links.list(Number(opts.limit));
      if (opts.json) {
        printJson(links);
        return;
      }
      for (const l of links) out(`${l.fromId} --${l.kind}--> ${l.toId}`);
    });

  program
    .command("link <fromId> <toId>")
    .description("Create a directed graph edge")
    .requiredOption("--kind <kind>", "Edge kind")
    .action(async (fromId: string, toId: string, opts: { kind: string }) => {
      const client = await requireClient();
      await client.links.create(fromId, toId, opts.kind);
      success(`Linked ${fromId} --${opts.kind}--> ${toId}`);
    });
}
