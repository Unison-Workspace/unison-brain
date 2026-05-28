import type { Command } from "commander";
import pc from "picocolors";
import { requireClient } from "../client-factory";
import { info, out, printJson } from "../output";

export function registerResearch(program: Command): void {
  program
    .command("web-search <query...>")
    .description("Search the open web (server-side web-search proxy)")
    .option("--json", "Output JSON")
    .action(async (queryParts: string[], opts: { json?: boolean }) => {
      const client = await requireClient();
      const results = await client.research.search(queryParts.join(" "));

      if (opts.json) {
        printJson(results);
        return;
      }
      if (results.length === 0) {
        info("No results.");
        return;
      }
      for (const r of results) {
        out(pc.cyan(r.url));
        if (r.title) out(`  ${pc.bold(r.title)}`);
        if (r.snippet)
          out(
            `  ${r.snippet
              .replace(/\s*\n\s*/g, " ")
              .trim()
              .slice(0, 200)}`,
          );
        out("");
      }
    });
}
