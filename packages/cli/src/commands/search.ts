import type { DocKind, MemoryType } from "@unisonlabs/sdk";
import type { Command } from "commander";
import pc from "picocolors";
import { requireClient } from "../client-factory";
import { info, out, printJson } from "../output";

export function registerSearch(program: Command): void {
  program
    .command("search <query...>")
    .description("Search the brain (hybrid keyword + semantic)")
    .option("-k, --limit <n>", "Max results", "10")
    .option("--kind <kind...>", "Filter by document kind (repeatable)")
    .option("--tag <tag...>", "Filter by tag (repeatable)")
    .option("--memory-type <type>", "episodic | semantic | procedural | auto")
    .option("--as-of <datetime>", "Time-travel: what the brain knew as of then")
    .option("--json", "Output JSON")
    .action(
      async (
        queryParts: string[],
        opts: {
          limit: string;
          kind?: string[];
          tag?: string[];
          memoryType?: MemoryType;
          asOf?: string;
          json?: boolean;
        },
      ) => {
        const client = await requireClient();
        const results = await client.search(queryParts.join(" "), {
          limit: Number(opts.limit),
          kinds: opts.kind as DocKind[] | undefined,
          tags: opts.tag,
          memoryType: opts.memoryType,
          asOf: opts.asOf,
        });

        if (opts.json) {
          printJson(results);
          return;
        }
        if (results.length === 0) {
          info("No results.");
          return;
        }
        for (const r of results) {
          out(`${pc.cyan(r.doc.path)}  ${pc.dim(`(${r.score.toFixed(2)})`)}`);
          if (r.doc.title) out(`  ${pc.bold(r.doc.title)}`);
          const preview = r.highlight ?? r.doc.tldr ?? r.doc.bodyMd ?? "";
          if (preview)
            out(
              `  ${preview
                .replace(/\s*\n\s*/g, " ")
                .trim()
                .slice(0, 200)}`,
            );
          out("");
        }
      },
    );
}
