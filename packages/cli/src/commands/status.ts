import type { Command } from "commander";
import { requireClient } from "../client-factory";
import { info, printJson } from "../output";

export function registerStatus(program: Command): void {
  program
    .command("status")
    .description("Show brain health and counts")
    .option("--json", "Output JSON")
    .action(async (opts: { json?: boolean }) => {
      const client = await requireClient();
      const s = await client.status();
      if (opts.json) {
        printJson(s);
        return;
      }
      info(`documents:    ${s.documents}`);
      info(`entities:     ${s.entities}`);
      info(`facts:        ${s.facts}`);
      info(`pending jobs: ${s.pendingJobs}`);
    });
}
