import { readFile } from "node:fs/promises";
import { basename } from "node:path";
import type { WorkApplyInput, WorkInspectKind, WorkOperation } from "@unisonlabs/sdk";
import type { Command } from "commander";
import { requireClient } from "../client-factory";
import { fail, printJson } from "../output";
import { readStdin } from "../stdin";

const INSPECT_KINDS = [
  "folder",
  "artifact",
  "document",
  "table",
  "record_set",
  "view",
  "asset",
] as const;

async function readJsonArg(inline: string | undefined): Promise<unknown> {
  const raw = inline ?? (await readStdin());
  if (!raw.trim()) {
    fail("No JSON provided. Pass -m '{\"...\": ...}' or pipe JSON via stdin.");
    process.exit(1);
  }
  try {
    return JSON.parse(raw);
  } catch (err) {
    fail(`Invalid JSON: ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  }
}

/** Coerce an array of ops, a single op, or a `{ operations }` object into the apply body. */
function toApplyInput(parsed: unknown, dryRun: boolean): WorkApplyInput {
  if (Array.isArray(parsed)) return { operations: parsed as WorkOperation[], dryRun };
  if (parsed && typeof parsed === "object") {
    const obj = parsed as Record<string, unknown>;
    if (Array.isArray(obj.operations)) {
      return {
        operations: obj.operations as WorkOperation[],
        dryRun: dryRun || obj.dryRun === true,
        ...(typeof obj.idempotencyKey === "string" ? { idempotencyKey: obj.idempotencyKey } : {}),
      };
    }
    if (typeof obj.op === "string")
      return { operations: [obj as unknown as WorkOperation], dryRun };
  }
  fail("Expected an operations array, a single { op, ... } object, or { operations: [...] }.");
  process.exit(1);
}

export function registerWork(program: Command): void {
  const work = program
    .command("work")
    .description("Work primitives — folders, docs, tables, records, views (the /v1/work surface)");

  work
    .command("apply")
    .description("Apply Work operations (JSON from -m or stdin)")
    .option("-m, --message <json>", "Operations JSON (array, single op, or { operations })")
    .option("--dry-run", "Validate without writing")
    .action(async (o: { message?: string; dryRun?: boolean }) => {
      const input = toApplyInput(await readJsonArg(o.message), Boolean(o.dryRun));
      const c = await requireClient();
      printJson(await c.work.apply(input));
    });

  work
    .command("records")
    .description(
      "List a table's records directly — no view. Pass --table-id, or --semantic-kind (company | person | deal | task) to read the canonical CRM/Tasks table without discovering its id.",
    )
    .option("--table-id <id>")
    .option("--semantic-kind <kind>", "company | person | deal | task")
    .option("--limit <n>")
    .action(async (o: { tableId?: string; semanticKind?: string; limit?: string }) => {
      const c = await requireClient();
      printJson(
        await c.work.records({
          tableId: o.tableId,
          semanticKind: o.semanticKind,
          limit: o.limit ? Number(o.limit) : undefined,
        }),
      );
    });

  work
    .command("query <viewId>")
    .description("Query a Work view by id")
    .option("--query <json>", "View query config (filters / sorts / limit)")
    .action(async (viewId: string, o: { query?: string }) => {
      const query = o.query ? await readJsonArg(o.query) : undefined;
      const c = await requireClient();
      printJson(
        await c.work.query({ viewId, query: query as Record<string, unknown> | undefined }),
      );
    });

  work
    .command("search <query...>")
    .description("Search folders, artifacts, documents, tables, records, and assets")
    .option("--limit <n>")
    .action(async (q: string[], o: { limit?: string }) => {
      const c = await requireClient();
      printJson(
        await c.work.search({ query: q.join(" "), limit: o.limit ? Number(o.limit) : undefined }),
      );
    });

  work
    .command("inspect <kind> <id>")
    .description(`Inspect a primitive by kind (${INSPECT_KINDS.join(" | ")}) and id`)
    .action(async (kind: string, id: string) => {
      if (!(INSPECT_KINDS as readonly string[]).includes(kind)) {
        fail(`Unknown kind "${kind}". Expected one of: ${INSPECT_KINDS.join(", ")}.`);
        process.exit(1);
      }
      const c = await requireClient();
      printJson(await c.work.inspect({ kind: kind as WorkInspectKind, id }));
    });

  work
    .command("tree")
    .description("Read the Work folder + artifact tree")
    .option("--folder <id>")
    .action(async (o: { folder?: string }) => {
      const c = await requireClient();
      printJson(await c.work.tree({ folderId: o.folder }));
    });

  work
    .command("folder <id>")
    .description("Get a Work folder")
    .action(async (id: string) => {
      const c = await requireClient();
      printJson(await c.work.folder(id));
    });

  work
    .command("artifact <id>")
    .description("Get a mounted Work artifact")
    .action(async (id: string) => {
      const c = await requireClient();
      printJson(await c.work.artifact(id));
    });

  work
    .command("table <id>")
    .description("Read a Work table schema (fields, options, relationships)")
    .action(async (id: string) => {
      const c = await requireClient();
      printJson(await c.work.tableSchema(id));
    });

  work
    .command("view <id>")
    .description("Query a Work view")
    .option("--query <json>", "View query config (filters / sorts / limit)")
    .action(async (id: string, o: { query?: string }) => {
      const query = o.query ? await readJsonArg(o.query) : undefined;
      const c = await requireClient();
      printJson(await c.work.viewQuery(id, query as Record<string, unknown> | undefined));
    });

  work
    .command("asset-url <id>")
    .description("Get a short-lived signed download URL for a Work asset")
    .option("--expires-in <seconds>", "Signed-URL lifetime (server default ~600s)")
    .action(async (id: string, o: { expiresIn?: string }) => {
      const c = await requireClient();
      printJson(
        await c.work.assets.readUrl(id, {
          expiresIn: o.expiresIn ? Number(o.expiresIn) : undefined,
        }),
      );
    });

  work
    .command("asset-upload <file>")
    .description("Upload a local file as a Work asset (orchestrates upload-url → PUT → complete)")
    .option("--mime <type>", "Content type (default: application/octet-stream)")
    .option("--name <displayName>", "Display name (default: the file's basename)")
    .action(async (file: string, o: { mime?: string; name?: string }) => {
      const data = await readFile(file);
      const filename = basename(file);
      const c = await requireClient();
      printJson(
        await c.work.assets.upload({
          filename,
          mimeType: o.mime ?? "application/octet-stream",
          data,
          displayName: o.name ?? filename,
        }),
      );
    });

  // Agent-first: these commands always emit JSON. Accept the documented --json
  // flag for parity so `unison work <cmd> --json` doesn't error.
  for (const cmd of work.commands) cmd.option("--json", "Output JSON (default)");
}
