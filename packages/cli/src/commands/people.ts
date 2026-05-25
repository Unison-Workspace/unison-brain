import type { Command } from "commander";
import { requireClient } from "../client-factory";
import { printJson } from "../output";

export function registerPeople(program: Command): void {
  program
    .command("people <query...>")
    .description("Search people (CRM 'people' records)")
    .option("--limit <n>")
    .option("--json", "Output JSON (default)")
    .action(async (q: string[], o: { limit?: string }) => {
      const c = await requireClient();
      printJson(
        await c.people.search(q.join(" "), { limit: o.limit ? Number(o.limit) : undefined }),
      );
    });
}
