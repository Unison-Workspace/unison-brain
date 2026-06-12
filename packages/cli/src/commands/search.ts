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
    .option("--path-prefix <prefix>", "Restrict results to documents under this path prefix")
    .option("--actor <id>", "Act as an external user id (requires brain:act-as scope)")
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
          pathPrefix?: string;
          actor?: string;
          json?: boolean;
        },
      ) => {
        const client = await requireClient(opts.actor);
        const results = await client.search(queryParts.join(" "), {
          limit: Number(opts.limit),
          kinds: opts.kind as DocKind[] | undefined,
          tags: opts.tag,
          memoryType: opts.memoryType,
          asOf: opts.asOf,
          pathPrefix: opts.pathPrefix,
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
          // Search hits are summaries (no body); preview from highlight/tldr only.
          const preview = r.highlight ?? r.doc.tldr ?? "";
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
