import type { Command } from "commander";
import { requireClient } from "../client-factory";
import { fail, printJson, success } from "../output";

export function registerEdit(program: Command): void {
  program
    .command("edit <path>")
    .description("Surgically edit a brain doc in place: replace an exact string (must match once)")
    .requiredOption("--old <text>", "Exact text to replace (must occur exactly once)")
    .requiredOption("--new <text>", "Replacement text")
    .option("--json", "Output JSON")
    .action(async (path: string, opts: { old: string; new: string; json?: boolean }) => {
      if (opts.old === opts.new) {
        fail("--old and --new are identical — nothing to change.");
        process.exit(1);
      }
      const client = await requireClient();
      const doc = await client.editDoc({ path, oldStr: opts.old, newStr: opts.new });
      if (opts.json) printJson(doc);
      else success(`Edited ${doc.path}`);
    });
}
