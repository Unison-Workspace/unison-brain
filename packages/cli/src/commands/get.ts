import type { Command } from "commander";
import { requireClient } from "../client-factory";
import { printJson } from "../output";

export function registerGet(program: Command): void {
  program
    .command("get <path>")
    .description("Read a document from the brain by path")
    .option("--json", "Output JSON (default prints raw content)")
    .action(async (path: string, opts: { json?: boolean }) => {
      const client = await requireClient();
      const doc = await client.get(path);
      if (opts.json) {
        printJson(doc);
        return;
      }
      process.stdout.write(`${doc.content}\n`);
    });
}
