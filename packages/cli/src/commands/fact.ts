import type { Command } from "commander";
import pc from "picocolors";
import { requireClient } from "../client-factory";
import { info, printJson, success } from "../output";

function printFacts(
  facts: { id: string; predicate: string; factText: string; validTo: string | null }[],
): void {
  for (const f of facts) {
    const invalid = f.validTo ? pc.dim(" (superseded)") : "";
    info(`${pc.cyan(f.id)}  ${pc.bold(f.predicate)}: ${f.factText}${invalid}`);
  }
}

export function registerFact(program: Command): void {
  const fact = program.command("fact").description("Bitemporal facts about entities");

  fact
    .command("ls")
    .description("List facts (all, or --entity to scope)")
    .option("--entity <id>", "Facts about one entity")
    .option("--all", "Include superseded/invalidated facts")
    .option("--as-of <datetime>", "Time-travel (with --entity)")
    .option("-k, --limit <n>", "Max items", "100")
    .option("--json", "Output JSON")
    .action(
      async (opts: {
        entity?: string;
        all?: boolean;
        asOf?: string;
        limit: string;
        json?: boolean;
      }) => {
        const client = await requireClient();
        const facts = opts.entity
          ? await client.facts.about(opts.entity, {
              asOf: opts.asOf,
              includeInvalidated: opts.all,
            })
          : await client.facts.list({ limit: Number(opts.limit), includeInvalidated: opts.all });
        if (opts.json) printJson(facts);
        else printFacts(facts);
      },
    );

  fact
    .command("add <entityId> <predicate> <text>")
    .description("Record a fact about an entity")
    .option("--confidence <n>", "0–1", "0.6")
    .option("--object-entity <id>", "Object entity id")
    .option("--valid-from <datetime>", "Validity start")
    .option("--valid-to <datetime>", "Validity end")
    .option("--json", "Output JSON")
    .action(
      async (
        entityId: string,
        predicate: string,
        text: string,
        opts: {
          confidence: string;
          objectEntity?: string;
          validFrom?: string;
          validTo?: string;
          json?: boolean;
        },
      ) => {
        const client = await requireClient();
        const f = await client.facts.record({
          subjectId: entityId,
          predicate,
          factText: text,
          confidence: Number(opts.confidence),
          objectEntityId: opts.objectEntity,
          validFrom: opts.validFrom,
          validTo: opts.validTo,
        });
        if (opts.json) printJson(f);
        else success(`Recorded fact ${f.id}`);
      },
    );

  fact
    .command("correct <factId>")
    .description("Supersede a fact with corrected fields")
    .option("--predicate <p>", "New predicate")
    .option("--text <t>", "New fact text")
    .option("--confidence <n>", "New confidence")
    .option("--json", "Output JSON")
    .action(
      async (
        factId: string,
        opts: { predicate?: string; text?: string; confidence?: string; json?: boolean },
      ) => {
        const client = await requireClient();
        const f = await client.facts.correct(factId, {
          predicate: opts.predicate,
          factText: opts.text,
          confidence: opts.confidence ? Number(opts.confidence) : undefined,
        });
        if (opts.json) printJson(f);
        else success(`Corrected → ${f.id}`);
      },
    );

  fact
    .command("rm <factId>")
    .description("Invalidate (soft-delete) a fact")
    .action(async (factId: string) => {
      const client = await requireClient();
      await client.facts.invalidate(factId);
      success(`Invalidated ${factId}`);
    });

  program
    .command("timeline <entityId>")
    .description("Chronological facts for an entity")
    .option("--from <datetime>", "Start")
    .option("--to <datetime>", "End")
    .option("--json", "Output JSON")
    .action(async (entityId: string, opts: { from?: string; to?: string; json?: boolean }) => {
      const client = await requireClient();
      const facts = await client.facts.timeline(entityId, { from: opts.from, to: opts.to });
      if (opts.json) printJson(facts);
      else printFacts(facts);
    });
}
