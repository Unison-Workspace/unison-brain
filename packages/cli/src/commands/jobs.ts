import type { JobStatus } from "@unisonlabs/sdk";
import type { Command } from "commander";
import pc from "picocolors";
import { requireClient } from "../client-factory";
import { info, printJson, success } from "../output";

export function registerJobs(program: Command): void {
  const jobs = program.command("jobs").description("Brain job queue (admin)");

  jobs
    .command("ls")
    .description("List queued jobs")
    .option("--status <status>", "pending | running | done | failed | skipped")
    .option("--kind <kind>", "Filter by job kind")
    .option("-k, --limit <n>", "Max items", "50")
    .option("--json", "Output JSON")
    .action(async (opts: { status?: JobStatus; kind?: string; limit: string; json?: boolean }) => {
      const client = await requireClient();
      const rows = await client.jobs.list({
        status: opts.status,
        kind: opts.kind,
        limit: Number(opts.limit),
      });
      if (opts.json) {
        printJson(rows);
        return;
      }
      for (const j of rows) {
        const err = j.error ? pc.red(` ${j.error}`) : "";
        info(`${pc.cyan(j.id)}  ${j.kind}  ${pc.bold(j.status)}${err}`);
      }
    });

  jobs
    .command("stats")
    .description("Job counts by status")
    .option("--json", "Output JSON")
    .action(async (opts: { json?: boolean }) => {
      const client = await requireClient();
      const s = await client.jobs.stats();
      if (opts.json) {
        printJson(s);
        return;
      }
      info(
        `pending ${s.pending}  running ${s.running}  done ${s.done}  failed ${s.failed}  skipped ${s.skipped}`,
      );
    });

  jobs
    .command("retry <jobId>")
    .description("Re-queue a failed job")
    .action(async (jobId: string) => {
      const client = await requireClient();
      await client.jobs.retry(jobId);
      success(`Retried ${jobId}`);
    });
}
