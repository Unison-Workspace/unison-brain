import type { DocKind } from "@unisonlabs/sdk";
import type { Command } from "commander";
import pc from "picocolors";
import { requireClient } from "../client-factory";
import { info, out, printJson } from "../output";

/** Glob → RegExp over a full path. `**` = any depth, `*` = within a segment. */
function globToRegExp(glob: string): RegExp {
  let re = "";
  for (let i = 0; i < glob.length; i++) {
    const c = glob.charAt(i);
    if (c === "*") {
      if (glob.charAt(i + 1) === "*") {
        re += ".*";
        i++;
      } else {
        re += "[^/]*";
      }
    } else if (".+^${}()|[]\\?".includes(c)) {
      re += `\\${c}`;
    } else {
      re += c;
    }
  }
  return new RegExp(`^${re}$`);
}

/** Leading literal segment of a glob, used as the server-side list prefix. */
function literalPrefix(glob: string): string {
  const star = glob.search(/[*?[]/);
  const head = star === -1 ? glob : glob.slice(0, star);
  return head.slice(0, head.lastIndexOf("/") + 1);
}

function printTree(paths: string[], root: string): void {
  // Build a nested map of segment → children, then render with ├──/└── guides.
  type Node = Map<string, Node>;
  const tree: Node = new Map();
  for (const p of paths) {
    const rel = root && p.startsWith(root) ? p.slice(root.length) : p;
    let node = tree;
    for (const seg of rel.split("/").filter(Boolean)) {
      let next = node.get(seg);
      if (!next) {
        next = new Map();
        node.set(seg, next);
      }
      node = next;
    }
  }
  const render = (node: Node, prefix: string): void => {
    const entries = [...node.keys()].sort();
    entries.forEach((name, i) => {
      const last = i === entries.length - 1;
      const child = node.get(name) ?? new Map();
      const isDir = child.size > 0;
      out(`${prefix}${last ? "└── " : "├── "}${isDir ? pc.cyan(`${name}/`) : name}`);
      render(child, prefix + (last ? "    " : "│   "));
    });
  };
  out(pc.bold(root || "/"));
  render(tree, "");
}

export function registerList(program: Command): void {
  program
    .command("ls [path]")
    .alias("list")
    .description("List entries directly under a path (directories + files)")
    .option("--docs", "List documents with titles instead of the directory view")
    .option("--kind <kind...>", "Filter by document kind (with --docs)")
    .option("--tag <tag...>", "Filter by tag (with --docs)")
    .option("-k, --limit <n>", "Max items", "200")
    .option("--json", "Output JSON")
    .action(
      async (
        path: string | undefined,
        opts: { docs?: boolean; kind?: string[]; tag?: string[]; limit: string; json?: boolean },
      ) => {
        const client = await requireClient();

        if (opts.docs) {
          const docs = await client.list({
            prefix: path,
            kinds: opts.kind as DocKind[] | undefined,
            tags: opts.tag,
            limit: Number(opts.limit),
          });
          if (opts.json) {
            printJson(docs);
            return;
          }
          if (docs.length === 0) info("No documents.");
          for (const d of docs) out(`${d.path}${d.title ? `  — ${d.title}` : ""}`);
          return;
        }

        const entries = await client.listFs(path ?? "");
        if (opts.json) {
          printJson(entries);
          return;
        }
        if (entries.length === 0) info("Empty.");
        for (const e of entries) out(`${e.type === "dir" ? pc.cyan(`${e.name}/`) : e.name}`);
      },
    );

  program
    .command("tree [path]")
    .description("Recursive tree of documents under a path")
    .option("-k, --limit <n>", "Max documents to scan", "1000")
    .option("--json", "Output JSON (flat path list)")
    .action(async (path: string | undefined, opts: { limit: string; json?: boolean }) => {
      const client = await requireClient();
      const docs = await client.list({ prefix: path, limit: Number(opts.limit) });
      const paths = docs.map((d) => d.path).sort();
      if (opts.json) {
        printJson(paths);
        return;
      }
      if (paths.length === 0) info("Empty.");
      else printTree(paths, path ?? "");
    });

  program
    .command("find <glob>")
    .description("Find documents whose path matches a glob (e.g. '/wiki/**', '*auth*')")
    .option("-k, --limit <n>", "Max documents to scan", "1000")
    .option("--json", "Output JSON")
    .action(async (glob: string, opts: { limit: string; json?: boolean }) => {
      const client = await requireClient();
      const docs = await client.list({ prefix: literalPrefix(glob), limit: Number(opts.limit) });
      const re = globToRegExp(glob);
      const matched = docs.filter((d) => re.test(d.path));
      if (opts.json) {
        printJson(matched);
        return;
      }
      if (matched.length === 0) info("No matches.");
      for (const d of matched) out(`${d.path}${d.title ? `  — ${d.title}` : ""}`);
    });
}
