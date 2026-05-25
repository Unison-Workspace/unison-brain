import type { Command } from "commander";
import { requireClient } from "../client-factory";
import { printJson } from "../output";

export function registerCrm(program: Command): void {
  const crm = program.command("crm").description("CRM — objects, records, lists, notes");

  crm
    .command("objects")
    .description("List CRM objects")
    .action(async () => {
      const c = await requireClient();
      printJson(await c.crm.objects());
    });

  crm
    .command("search <query...>")
    .description("Search records")
    .option("--object-slug <slug>")
    .option("--limit <n>")
    .action(async (q: string[], o) => {
      const c = await requireClient();
      printJson(
        await c.crm.searchRecords({
          q: q.join(" "),
          objectSlug: o.objectSlug,
          limit: o.limit ? Number(o.limit) : undefined,
        }),
      );
    });

  crm
    .command("record <id>")
    .description("Get a record")
    .action(async (id: string) => {
      const c = await requireClient();
      printJson(await c.crm.record(id));
    });

  crm
    .command("create-record")
    .description("Create a record")
    .requiredOption("--object <id>")
    .requiredOption("--name <displayName>")
    .action(async (o) => {
      const c = await requireClient();
      printJson(await c.crm.createRecord({ objectId: o.object, displayName: o.name }));
    });

  crm
    .command("lists")
    .description("List CRM lists")
    .option("--object <id>")
    .action(async (o) => {
      const c = await requireClient();
      printJson(await c.crm.lists({ parentObjectId: o.object }));
    });

  crm
    .command("notes")
    .description("List notes for a record")
    .requiredOption("--record <id>")
    .action(async (o) => {
      const c = await requireClient();
      printJson(await c.crm.notes(o.record));
    });

  crm
    .command("create-note")
    .description("Create a note on a record")
    .requiredOption("--record <id>")
    .requiredOption("--body <md>")
    .action(async (o) => {
      const c = await requireClient();
      printJson(await c.crm.createNote({ recordId: o.record, bodyMd: o.body }));
    });
}
