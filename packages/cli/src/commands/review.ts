import type { Command } from "commander";
import pc from "picocolors";
import { requireClient } from "../client-factory";
import { confirmDestructive } from "../confirm";
import { info, printJson, success } from "../output";

export function registerReview(program: Command): void {
  const review = program.command("review").description("Entity dedup review (admin)");

  review
    .command("ls")
    .description("List pending merge conflicts")
    .option("--json", "Output JSON")
    .action(async (opts: { json?: boolean }) => {
      const client = await requireClient();
      const conflicts = await client.review.conflicts();
      if (opts.json) {
        printJson(conflicts);
        return;
      }
      if (conflicts.length === 0) {
        info("No pending conflicts.");
        return;
      }
      for (const c of conflicts) {
        info(`${pc.cyan(c.id)}  ${c.aDescription}  ${pc.dim("vs")}  ${c.bDescription}`);
        info(`  ${pc.dim(c.engineReasoning)}`);
      }
    });

  review
    .command("merge <conflictId>")
    .description("Approve a merge")
    .option("-y, --yes", "Skip the confirmation prompt")
    .action(async (conflictId: string, opts: { yes?: boolean }) => {
      if (!(await confirmDestructive(`Merge conflict ${conflictId}`, Boolean(opts.yes)))) return;
      const client = await requireClient();
      await client.review.resolve(conflictId, "merge");
      success(`Merged ${conflictId}`);
    });

  review
    .command("distinct <conflictId>")
    .description("Keep the two entities separate")
    .action(async (conflictId: string) => {
      const client = await requireClient();
      await client.review.resolve(conflictId, "distinct");
      success(`Kept distinct ${conflictId}`);
    });

  review
    .command("merges")
    .description("List recent merges (undo feed)")
    .option("-k, --limit <n>", "Max items", "20")
    .option("--json", "Output JSON")
    .action(async (opts: { limit: string; json?: boolean }) => {
      const client = await requireClient();
      const merges = await client.review.merges(Number(opts.limit));
      if (opts.json) {
        printJson(merges);
        return;
      }
      for (const m of merges) {
        info(`${pc.cyan(m.id)}  ${m.survivorName} ⟵ ${m.loserName}  ${pc.dim(m.createdAt)}`);
      }
    });

  review
    .command("undo <mergeEventId>")
    .description("Undo a merge")
    .option("-y, --yes", "Skip the confirmation prompt")
    .action(async (mergeEventId: string, opts: { yes?: boolean }) => {
      if (!(await confirmDestructive(`Undo merge ${mergeEventId}`, Boolean(opts.yes)))) return;
      const client = await requireClient();
      await client.review.undo(mergeEventId);
      success(`Undid merge ${mergeEventId}`);
    });
}
