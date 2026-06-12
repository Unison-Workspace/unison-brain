import { readFileSync } from "node:fs";
import type { IngestItem, Visibility } from "@unisonlabs/sdk";
import type { Command } from "commander";
import { requireClient } from "../client-factory";
import { fail, printJson, success } from "../output";
import { readStdin } from "../stdin";

export function registerIngest(program: Command): void {
  program
    .command("ingest")
    .description("Stream a document or conversation JSON into brain memory")
    .option("--file <path>", "Path to a markdown file to ingest as a document")
    .option("--title <title>", "Document title (only with --file)")
    .option("--doc-path <path>", "Brain path for the document (only with --file)")
    .option(
      "--conversation <json>",
      "Conversation JSON: [{role,content},...] or a full ingest item",
    )
    .option("--source-ref <ref>", "Stable source reference / idempotency identifier")
    .option("--visibility <v>", "tenant | private (default private)", "private")
    .option("--json", "Output JSON")
    .action(
      async (opts: {
        file?: string;
        title?: string;
        docPath?: string;
        conversation?: string;
        sourceRef?: string;
        visibility: string;
        json?: boolean;
      }) => {
        if (!opts.file && !opts.conversation) {
          // Check stdin for conversation JSON.
          const raw = await readStdin();
          if (!raw.trim()) {
            fail(
              "No input provided. Use --file <path>, --conversation <json>, or pipe JSON via stdin.",
            );
            process.exit(1);
          }
          opts.conversation = raw;
        }

        let item: IngestItem;
        const visibility = opts.visibility as Visibility;

        if (opts.file) {
          const content = readFileSync(opts.file, "utf8");
          item = {
            type: "document",
            content,
            title: opts.title,
            path: opts.docPath,
            visibility,
            sourceRef: opts.sourceRef,
          };
        } else {
          // Parse conversation JSON: either an array of turns or a full item.
          let parsed: unknown;
          try {
            parsed = JSON.parse(opts.conversation ?? "null");
          } catch {
            fail(
              'Could not parse conversation JSON. For a document/markdown file use --file <path>; for conversations pipe JSON: {"turns":[...]}.',
            );
            process.exit(1);
          }

          if (Array.isArray(parsed)) {
            item = {
              type: "conversation",
              turns: parsed as { role: "user" | "assistant" | "system"; content: string }[],
              sourceRef: opts.sourceRef ?? `cli-${Date.now()}`,
              visibility,
            };
          } else if (
            parsed !== null &&
            typeof parsed === "object" &&
            "type" in (parsed as object)
          ) {
            item = parsed as IngestItem;
          } else {
            fail(
              "Conversation JSON must be an array of turns [{role,content},...] or a full item.",
            );
            process.exit(1);
          }
        }

        const client = await requireClient();
        const result = await client.ingest({ items: [item] });

        if (opts.json) {
          printJson(result);
          return;
        }

        const r = result.items[0];
        if (!r) {
          fail("No result returned from ingest.");
          process.exit(1);
        }
        if (r.type === "conversation") {
          success(`Conversation queued for signal extraction (jobId: ${r.jobId})`);
        } else {
          success(`Document written to ${r.path} (jobIds: ${r.jobIds.join(", ")})`);
        }
      },
    );
}
