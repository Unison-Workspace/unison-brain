import type { Command } from "commander";
import { requireClient } from "../client-factory";
import { fail, printJson, success } from "../output";
import { readStdin } from "../stdin";

export function registerWrite(program: Command): void {
  program
    .command("write <path>")
    .description("Write a document to the brain (content from -m or stdin)")
    .option("-m, --message <content>", "Document content")
    .option("--kind <kind>", "Document kind", "note")
    .option("--tag <tag...>", "Tags (repeatable)")
    .option("--json", "Output JSON")
    .action(
      async (
        path: string,
        opts: { message?: string; kind: string; tag?: string[]; json?: boolean },
      ) => {
        const client = await requireClient();
        const content = opts.message ?? (await readStdin());
        if (!content.trim()) {
          fail('No content provided. Use -m "..." or pipe content via stdin.');
          process.exit(1);
        }

        const doc = await client.write({
          path,
          content,
          kind: opts.kind,
          tags: opts.tag,
        });
        if (opts.json) {
          printJson(doc);
          return;
        }
        success(`Wrote ${doc.path}`);
      },
    );
}
