import type { Command } from "commander";
import { requireClient } from "../client-factory";
import { out, printJson } from "../output";

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
      out(`documents:     ${s.docCount} (${s.docWithEmbedding} embedded)`);
      out(`entities:      ${s.entityCount}`);
      out(`facts:         ${s.factCount}`);
      out(`pending jobs:  ${s.pendingJobs}`);
      out(`stale wikis:   ${s.staleWikiPageCount}`);
      if (s.lastIngestAt) out(`last ingest:   ${s.lastIngestAt}`);
    });
}
