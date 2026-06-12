import { readFile, readdir } from "node:fs/promises";
import { join, relative } from "node:path";
import type { Visibility, WriteDocInput } from "@unisonlabs/sdk";
import type { Command } from "commander";
import { requireClient } from "../client-factory";
import { firstHeading, parseFrontmatter, toBrainPath } from "../migrate-util";
import { fail, info, printJson, success } from "../output";

const SKIP_DIRS = new Set([".git", "node_modules", ".obsidian", ".serena", ".idea", ".vscode"]);
const BATCH = 100;

interface MigrateOpts {
  prefix: string;
  visibility: string;
  tag?: string[];
  dryRun?: boolean;
  actor?: string;
  json?: boolean;
}

export function registerMigrate(program: Command): void {
  const migrate = program
    .command("migrate")
    .description("Import an existing memory system into the brain (idempotent — re-run to sync)");

  migrate
    .command("markdown <dir>")
    .description(
      "Import a directory of markdown files (knowledge base, Obsidian vault, Notion/gbrain export)",
    )
    .option("--prefix <path>", "Brain path the tree is mounted under", "/private/kb")
    .option("--visibility <v>", "tenant | private", "private")
    .option("--tag <tag...>", "Extra tag(s) applied to every imported doc")
    .option("--exclude <path...>", "Relative path prefix(es) to skip, e.g. --exclude raw archive")
    .option("--dry-run", "Plan only — print what would change, write nothing")
    .option("--actor <id>", "Act as an external user id (requires brain:act-as scope)")
    .option("--json", "Output JSON")
    .action(async (dir: string, opts: MigrateOpts & { exclude?: string[] }) => {
      const excluded = (opts.exclude ?? []).map((e) => e.replace(/\/+$/, ""));
      const files = (await collectMarkdownFiles(dir)).filter((f) => {
        const rel = relative(dir, f);
        return !excluded.some((e) => rel === e || rel.startsWith(`${e}/`));
      });
      if (files.length === 0) {
        fail(`No markdown files found under ${dir}`);
        process.exit(1);
      }
      const docs: WriteDocInput[] = [];
      for (const file of files) {
        const raw = await readFile(file, "utf8");
        const fm = parseFrontmatter(raw);
        const rel = relative(dir, file);
        docs.push({
          path: toBrainPath(opts.prefix, rel),
          bodyMd: fm.body.trim() ? fm.body : raw,
          kind: "note",
          title: fm.title ?? firstHeading(fm.body) ?? rel.replace(/\.(md|markdown)$/i, ""),
          tags: [...new Set([...fm.tags, ...(opts.tag ?? [])])],
          visibility: opts.visibility as Visibility,
        });
      }
      await runImport(docs, opts);
    });

  migrate
    .command("supermemory")
    .description(
      "Import memories from supermemory.ai (experimental — export API coverage varies by plan)",
    )
    .option("--api-key <key>", "supermemory API key (or SUPERMEMORY_API_KEY env)")
    .option("--base-url <url>", "supermemory API base", "https://api.supermemory.ai")
    .option("--prefix <path>", "Brain path the memories are mounted under", "/private/supermemory")
    .option("--visibility <v>", "tenant | private", "private")
    .option("--tag <tag...>", "Extra tag(s) applied to every imported doc")
    .option("--dry-run", "Plan only — print what would change, write nothing")
    .option("--actor <id>", "Act as an external user id (requires brain:act-as scope)")
    .option("--json", "Output JSON")
    .action(async (opts: MigrateOpts & { apiKey?: string; baseUrl: string }) => {
      const apiKey = opts.apiKey ?? process.env.SUPERMEMORY_API_KEY;
      if (!apiKey) {
        fail("supermemory API key required: --api-key or SUPERMEMORY_API_KEY");
        process.exit(1);
      }
      const memories = await fetchSupermemory(opts.baseUrl, apiKey);
      if (memories.length === 0) {
        fail("No memories returned by the supermemory API.");
        process.exit(1);
      }
      const docs: WriteDocInput[] = memories.map((m) => ({
        path: toBrainPath(opts.prefix, `${m.id}.md`),
        bodyMd: m.content,
        kind: "note",
        title: m.title ?? undefined,
        tags: [...new Set([...m.tags, ...(opts.tag ?? [])])],
        visibility: opts.visibility as Visibility,
      }));
      await runImport(docs, opts);
    });
}

async function collectMarkdownFiles(dir: string): Promise<string[]> {
  const out: string[] = [];
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name.startsWith(".") || SKIP_DIRS.has(entry.name)) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await collectMarkdownFiles(full)));
    else if (/\.(md|markdown)$/i.test(entry.name)) out.push(full);
  }
  return out;
}

async function runImport(docs: WriteDocInput[], opts: MigrateOpts): Promise<void> {
  const client = await requireClient(opts.actor);

  // Diff against what's already in the brain so re-runs only sync deltas.
  const existing = await client.list({ prefix: opts.prefix, limit: 10_000 });
  const byPath = new Map(existing.map((d) => [d.path, d]));
  const toWrite = docs.filter((d) => {
    const cur = byPath.get(d.path);
    return !cur || cur.bodyMd !== d.bodyMd || cur.title !== (d.title ?? null);
  });
  const skipped = docs.length - toWrite.length;
  const created = toWrite.filter((d) => !byPath.has(d.path)).length;

  if (opts.dryRun) {
    const plan = {
      total: docs.length,
      create: created,
      update: toWrite.length - created,
      unchanged: skipped,
      writes: toWrite.map((d) => d.path),
    };
    if (opts.json) printJson(plan);
    else {
      info(
        `${docs.length} docs → ${created} new, ${toWrite.length - created} changed, ${skipped} unchanged`,
      );
      for (const d of toWrite) info(`  would write ${d.path}`);
    }
    return;
  }

  const failures: { path: string; error: string }[] = [];
  let written = 0;
  for (let i = 0; i < toWrite.length; i += BATCH) {
    const batch = toWrite.slice(i, i + BATCH);
    try {
      await client.writeDocs(batch);
      written += batch.length;
    } catch {
      // Batch failed (e.g. one bad doc) — retry individually so one bad file
      // doesn't sink the other 99.
      for (const doc of batch) {
        try {
          await client.write(doc);
          written++;
        } catch (err) {
          failures.push({
            path: doc.path,
            error: err instanceof Error ? err.message : String(err),
          });
        }
      }
    }
    info(`${Math.min(i + BATCH, toWrite.length)}/${toWrite.length} synced`);
  }

  const result = { written, created, unchanged: skipped, failed: failures };
  if (opts.json) printJson(result);
  else {
    success(
      `Synced ${written} docs (${created} new, ${written - created} updated, ${skipped} unchanged).`,
    );
    for (const f of failures) fail(`  ${f.path}: ${f.error}`);
  }
  if (failures.length > 0) process.exit(1);
}

interface SupermemoryItem {
  id: string;
  title: string | null;
  content: string;
  tags: string[];
}

async function fetchSupermemory(baseUrl: string, apiKey: string): Promise<SupermemoryItem[]> {
  const out: SupermemoryItem[] = [];
  let page = 1;
  for (;;) {
    const res = await fetch(`${baseUrl}/v3/documents/list`, {
      method: "POST",
      headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
      body: JSON.stringify({ page, limit: 100 }),
    });
    if (!res.ok) {
      fail(`supermemory API ${res.status}: ${(await res.text()).slice(0, 200)}`);
      process.exit(1);
    }
    const data = (await res.json()) as Record<string, unknown>;
    const items = (data.memories ?? data.documents ?? data.results ?? []) as Record<
      string,
      unknown
    >[];
    if (items.length === 0) break;
    for (const m of items) {
      const content = (m.content ?? m.summary ?? m.text ?? "") as string;
      if (!content.trim()) continue;
      out.push({
        id: String(m.customId ?? m.id),
        title: (m.title as string | null) ?? null,
        tags: Array.isArray(m.containerTags) ? (m.containerTags as string[]) : [],
        content,
      });
    }
    if (items.length < 100) break;
    page++;
  }
  return out;
}
