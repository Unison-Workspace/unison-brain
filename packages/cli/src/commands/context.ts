import type { ContextMode } from "@unisonlabs/sdk";
import type { Command } from "commander";
import pc from "picocolors";
import { requireClient } from "../client-factory";
import { out, printJson } from "../output";

export function registerContext(program: Command): void {
  program
    .command("context <query...>")
    .description("One-call recall: retrieve the most relevant memory as a prompt-ready block")
    .option("--deep", "Use deep multi-hop retrieval (mode=deep)")
    .option("-k, --k <n>", "Max semantic hits (1–50)", "10")
    .option("--max-entities <n>", "Max entity summaries included (0–10)", "3")
    .option("--path-prefix <prefix>", "Scope retrieval to a path subtree, e.g. /private/notes/")
    .option("--include-bodies", "Inline full (clipped) document bodies into the context block")
    .option("--actor <id>", "Act as an external user id (requires brain:act-as scope)")
    .option("--json", "Output full JSON instead of the contextMd block")
    .action(
      async (
        queryParts: string[],
        opts: {
          deep?: boolean;
          k: string;
          maxEntities: string;
          pathPrefix?: string;
          includeBodies?: boolean;
          actor?: string;
          json?: boolean;
        },
      ) => {
        const client = await requireClient(opts.actor);
        const result = await client.context({
          query: queryParts.join(" "),
          mode: opts.deep ? ("deep" as ContextMode) : undefined,
          k: Number(opts.k),
          maxEntities: Number(opts.maxEntities),
          pathPrefix: opts.pathPrefix,
          includeBodies: opts.includeBodies,
        });

        if (opts.json) {
          printJson(result);
          return;
        }

        // Default: print the prompt-ready contextMd block.
        if (result.weakEvidence) {
          out(pc.dim("(weak evidence — low confidence in recall)"));
          out("");
        }
        out(result.contextMd);
      },
    );
}
