import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import type { Command } from "commander";
import { requireClient } from "../client-factory";
import { toDiskPath, toExportMarkdown } from "../migrate-util";
import { fail, info, printJson, success } from "../output";

export function registerExport(program: Command): void {
  program
    .command("export <dir>")
    .description(
      "Export brain documents to a directory of markdown files (the backward path — no lock-in)",
    )
    .option("--path-prefix <prefix>", "Only export documents under this brain path", "/")
    .option("--actor <id>", "Act as an external user id (requires brain:act-as scope)")
    .option("--json", "Output JSON")
    .action(async (dir: string, opts: { pathPrefix: string; actor?: string; json?: boolean }) => {
      const client = await requireClient(opts.actor);
      const docs = await client.list({ prefix: opts.pathPrefix, limit: 10_000 });
      if (docs.length === 0) {
        fail(`No documents under ${opts.pathPrefix}`);
        process.exit(1);
      }
      const paths: string[] = [];
      for (const doc of docs) {
        const target = join(dir, toDiskPath(doc.path));
        await mkdir(dirname(target), { recursive: true });
        await writeFile(target, toExportMarkdown(doc), "utf8");
        paths.push(doc.path);
      }
      if (opts.json) printJson({ exported: paths.length, dir, paths });
      else {
        success(`Exported ${paths.length} docs to ${dir}`);
        info("Each file carries frontmatter incl. `unison-path` for a lossless round-trip.");
      }
    });
}
