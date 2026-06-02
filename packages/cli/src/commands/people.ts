import type { Command } from "commander";
import { requireClient } from "../client-factory";
import { printJson } from "../output";

export function registerPeople(program: Command): void {
  program
    .command("people [query...]")
    .description("Search people, or list everyone when no query is given (CRM 'people' records)")
    .option("--limit <n>")
    .option("--json", "Output JSON (default)")
    .action(async (q: string[] | undefined, o: { limit?: string }) => {
      const c = await requireClient();
      const limit = o.limit ? Number(o.limit) : undefined;
      const query = (q ?? []).join(" ").trim();
      printJson(query ? await c.people.search(query, { limit }) : await c.people.list({ limit }));
    });
}
