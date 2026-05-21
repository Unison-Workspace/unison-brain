import type { EntityKind, EntityStatus } from "@unison/sdk";
import type { Command } from "commander";
import pc from "picocolors";
import { requireClient } from "../client-factory";
import { fail, info, printJson, success } from "../output";

function parseProps(pairs: string[] | undefined): Record<string, string> {
  const props: Record<string, string> = {};
  for (const pair of pairs ?? []) {
    const eq = pair.indexOf("=");
    if (eq === -1) continue;
    props[pair.slice(0, eq)] = pair.slice(eq + 1);
  }
  return props;
}

export function registerEntity(program: Command): void {
  const entity = program.command("entity").description("Knowledge-graph entities");

  entity
    .command("ls")
    .description("List entities")
    .option("--kind <kind...>", "Filter by kind (repeatable)")
    .option("--status <status>", "active | stub | archived")
    .option("-k, --limit <n>", "Max items", "100")
    .option("--json", "Output JSON")
    .action(
      async (opts: { kind?: string[]; status?: EntityStatus; limit: string; json?: boolean }) => {
        const client = await requireClient();
        const entities = await client.entities.list({
          kinds: opts.kind,
          status: opts.status,
          limit: Number(opts.limit),
        });
        if (opts.json) {
          printJson(entities);
          return;
        }
        for (const e of entities)
          info(`${pc.cyan(e.id)}  ${pc.bold(e.displayName)} ${pc.dim(e.kind)}`);
      },
    );

  entity
    .command("resolve <name>")
    .description("Find an entity by name (fuzzy + alias)")
    .option("--kind <kind>", "Kind hint")
    .option("--json", "Output JSON")
    .action(async (name: string, opts: { kind?: EntityKind; json?: boolean }) => {
      const client = await requireClient();
      const found = await client.entities.resolve(name, opts.kind);
      if (opts.json) {
        printJson(found);
        return;
      }
      if (!found) {
        fail(`No entity matched "${name}".`);
        process.exit(1);
      }
      info(`${pc.cyan(found.id)}  ${pc.bold(found.displayName)} ${pc.dim(found.kind)}`);
    });

  entity
    .command("get <id>")
    .description("Read an entity by id")
    .action(async (id: string) => {
      const client = await requireClient();
      printJson(await client.entities.get(id));
    });

  entity
    .command("set <kind> <name>")
    .description("Create or update an entity")
    .option("--slug <slug>", "Slug")
    .option("--alias <alias...>", "Aliases (repeatable)")
    .option("--prop <key=value...>", "Props (repeatable)")
    .option("--status <status>", "active | stub | archived", "active")
    .option("--json", "Output JSON")
    .action(
      async (
        kind: string,
        name: string,
        opts: {
          slug?: string;
          alias?: string[];
          prop?: string[];
          status: EntityStatus;
          json?: boolean;
        },
      ) => {
        const client = await requireClient();
        const saved = await client.entities.upsert({
          kind: kind as EntityKind,
          displayName: name,
          slug: opts.slug,
          aliases: opts.alias,
          props: parseProps(opts.prop),
          status: opts.status,
        });
        if (opts.json) printJson(saved);
        else success(`Saved entity ${saved.displayName} (${saved.id})`);
      },
    );
}
