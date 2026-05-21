import type { Command } from "commander";
import pc from "picocolors";
import { requireClient } from "../client-factory";
import { info, printJson } from "../output";

export function registerSearch(program: Command): void {
  program
    .command("search <query...>")
    .description("Search the brain (hybrid keyword + semantic)")
    .option("-k, --limit <n>", "Max results", "10")
    .option("--kind <kind>", "Filter by document kind")
    .option("--tag <tag>", "Filter by tag")
    .option("--json", "Output JSON")
    .action(
      async (
        queryParts: string[],
        opts: { limit: string; kind?: string; tag?: string; json?: boolean },
      ) => {
        const client = await requireClient();
        const results = await client.search(queryParts.join(" "), {
          limit: Number(opts.limit),
          kind: opts.kind,
          tag: opts.tag,
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
          info(`${pc.cyan(r.path)}  ${pc.dim(`(${r.score.toFixed(2)})`)}`);
          if (r.title) info(`  ${pc.bold(r.title)}`);
          info(`  ${r.snippet.replace(/\s*\n\s*/g, " ").trim()}`);
          info("");
        }
      },
    );
}
