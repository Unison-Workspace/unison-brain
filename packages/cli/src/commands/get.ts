import type { Command } from "commander";
import { requireClient } from "../client-factory";
import { printJson } from "../output";

export function registerGet(program: Command): void {
  program
    .command("get <path>")
    .description("Read a document from the brain by path")
    .option("--as-of <datetime>", "Read the version as of this time")
    .option("--raw", "Read raw FS content (any tier, incl. /sources/ /raw/ /system/)")
    .option("--json", "Output JSON (default prints raw content)")
    .action(async (path: string, opts: { asOf?: string; raw?: boolean; json?: boolean }) => {
      const client = await requireClient();
      if (opts.raw) {
        const res = await client.getRaw(path);
        if (opts.json) printJson(res);
        else process.stdout.write(`${res.content ?? ""}\n`);
        return;
      }
      const doc = await client.get(path, opts.asOf);
      if (opts.json) printJson(doc);
      else process.stdout.write(`${doc.bodyMd}\n`);
    });
}
