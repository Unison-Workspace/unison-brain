import type { DocKind } from "@unisonlabs/sdk";
import type { Command } from "commander";
import { requireClient } from "../client-factory";
import { info, printJson } from "../output";

export function registerList(program: Command): void {
  program
    .command("ls [prefix]")
    .alias("list")
    .description("List documents under a path prefix (--tree for the FS view)")
    .option("-k, --limit <n>", "Max items", "100")
    .option("--kind <kind...>", "Filter by document kind (repeatable)")
    .option("--tag <tag...>", "Filter by tag (repeatable)")
    .option("--tree", "Directory listing (dirs + files) instead of documents")
    .option("--json", "Output JSON")
    .action(
      async (
        prefix: string | undefined,
        opts: { limit: string; kind?: string[]; tag?: string[]; tree?: boolean; json?: boolean },
      ) => {
        const client = await requireClient();

        if (opts.tree) {
          const entries = await client.listFs(prefix ?? "");
          if (opts.json) {
            printJson(entries);
            return;
          }
          for (const e of entries) info(`${e.type === "dir" ? "📁" : "📄"} ${e.path}`);
          return;
        }

        const docs = await client.list({
          prefix,
          kinds: opts.kind as DocKind[] | undefined,
          tags: opts.tag,
          limit: Number(opts.limit),
        });
        if (opts.json) {
          printJson(docs);
          return;
        }
        if (docs.length === 0) {
          info("No documents.");
          return;
        }
        for (const d of docs) info(`${d.path}${d.title ? `  — ${d.title}` : ""}`);
      },
    );
}
