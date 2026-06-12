export interface Frontmatter {
  title?: string;
  tags: string[];
  body: string;
}

/** Minimal YAML frontmatter parser — `key: value`, inline `[a, b]` and `- item` lists. */
export function parseFrontmatter(raw: string): Frontmatter {
  const out: Frontmatter = { tags: [], body: raw };
  if (!raw.startsWith("---\n")) return out;
  const end = raw.indexOf("\n---", 4);
  if (end === -1) return out;
  out.body = raw.slice(raw.indexOf("\n", end + 1) + 1);
  const lines = raw.slice(4, end).split("\n");
  let inTags = false;
  for (const line of lines) {
    const listItem = line.match(/^\s+-\s+(.+)$/);
    if (inTags && listItem?.[1]) {
      out.tags.push(listItem[1].trim().replace(/^["']|["']$/g, ""));
      continue;
    }
    inTags = false;
    const kv = line.match(/^(\w[\w-]*):\s*(.*)$/);
    if (!kv) continue;
    const [, key, value] = kv;
    if (key === "title" && value) out.title = value.replace(/^["']|["']$/g, "");
    if (key === "tags") {
      if (!value) {
        inTags = true;
      } else {
        const inline = value.match(/^\[(.*)\]$/);
        const items = inline?.[1] !== undefined ? inline[1].split(",") : [value];
        out.tags.push(...items.map((t) => t.trim().replace(/^["']|["']$/g, "")).filter(Boolean));
      }
    }
  }
  return out;
}

/** First `# heading` in the body, if any. */
export function firstHeading(body: string): string | undefined {
  return body.match(/^#\s+(.+)$/m)?.[1]?.trim();
}

/**
 * Map a source-relative file path onto the brain path contract
 * (`/^\/[a-z0-9][a-z0-9\-/.]*\.md$/`): lowercase, spaces/underscores → `-`,
 * strip anything else, per segment.
 */
export function toBrainPath(prefix: string, relPath: string): string {
  const segments = relPath
    .replace(/\.(md|markdown)$/i, "")
    .split("/")
    .map(slugSegment)
    .filter(Boolean);
  const base = prefix.replace(/\/+$/, "");
  return `${base}/${segments.join("/")}.md`;
}

function slugSegment(seg: string): string {
  return seg
    .toLowerCase()
    .replace(/[\s_]+/g, "-")
    .replace(/[^a-z0-9\-.]/g, "")
    .replace(/\.+/g, ".")
    .replace(/-+/g, "-")
    .replace(/^[-.]+|[-.]+$/g, "");
}

/** Brain path → relative on-disk path for export (strip leading slash). */
export function toDiskPath(brainPath: string): string {
  return brainPath.replace(/^\/+/, "");
}

/** Serialize a doc back to markdown with frontmatter for export. */
export function toExportMarkdown(doc: {
  path: string;
  title: string | null;
  tldr: string | null;
  kind: string;
  tags: string[];
  visibility: string;
  updatedAt: string | null;
  bodyMd: string;
}): string {
  const fm: string[] = ["---"];
  if (doc.title) fm.push(`title: ${JSON.stringify(doc.title)}`);
  if (doc.tldr) fm.push(`tldr: ${JSON.stringify(doc.tldr)}`);
  fm.push(`kind: ${doc.kind}`);
  if (doc.tags.length) fm.push(`tags: [${doc.tags.join(", ")}]`);
  fm.push(`visibility: ${doc.visibility}`);
  if (doc.updatedAt) fm.push(`updated: ${doc.updatedAt}`);
  fm.push(`unison-path: ${doc.path}`, "---", "");
  return `${fm.join("\n")}${doc.bodyMd.endsWith("\n") ? doc.bodyMd : `${doc.bodyMd}\n`}`;
}
