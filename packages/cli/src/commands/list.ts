import type { Command } from "commander";
import { requireClient } from "../client-factory";
import { info, printJson } from "../output";

export function registerList(program: Command): void {
  program
    .command("list [prefix]")
    .description("List documents under a path prefix")
    .option("-k, --limit <n>", "Max items", "100")
    .option("--json", "Output JSON")
    .action(async (prefix: string | undefined, opts: { limit: string; json?: boolean }) => {
      const client = await requireClient();
      const items = await client.list(prefix ?? "", Number(opts.limit));
      if (opts.json) {
        printJson(items);
        return;
      }
      if (items.length === 0) {
        info("No documents.");
        return;
      }
      for (const item of items) {
        info(`${item.path}${item.title ? `  — ${item.title}` : ""}`);
      }
    });
}
