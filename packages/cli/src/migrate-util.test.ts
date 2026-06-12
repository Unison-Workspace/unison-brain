import { describe, expect, test } from "bun:test";
import { firstHeading, parseFrontmatter, toBrainPath, toExportMarkdown } from "./migrate-util";

describe("parseFrontmatter", () => {
  test("inline tags + title", () => {
    const fm = parseFrontmatter('---\ntitle: "My Note"\ntags: [a, b-c]\n---\n\nbody here\n');
    expect(fm.title).toBe("My Note");
    expect(fm.tags).toEqual(["a", "b-c"]);
    expect(fm.body).toBe("\nbody here\n");
  });

  test("list-form tags", () => {
    const fm = parseFrontmatter("---\ntags:\n  - alpha\n  - beta\nstatus: active\n---\nbody");
    expect(fm.tags).toEqual(["alpha", "beta"]);
  });

  test("no frontmatter passes through", () => {
    const fm = parseFrontmatter("# Just a doc\n");
    expect(fm.title).toBeUndefined();
    expect(fm.body).toBe("# Just a doc\n");
  });

  test("unclosed frontmatter treated as body", () => {
    const fm = parseFrontmatter("---\ntitle: broken\n");
    expect(fm.body).toBe("---\ntitle: broken\n");
  });
});

describe("toBrainPath", () => {
  test("slugifies segments onto the contract", () => {
    expect(toBrainPath("/private/kb", "decisions/2026-06-08 Unison_Labs OSS.md")).toBe(
      "/private/kb/decisions/2026-06-08-unison-labs-oss.md",
    );
  });

  test("strips disallowed chars and collapses dashes", () => {
    expect(toBrainPath("/private/kb/", "people/Müller--(draft).markdown")).toBe(
      "/private/kb/people/mller-draft.md",
    );
  });

  test("uppercase filenames", () => {
    expect(toBrainPath("/private/kb", "README.md")).toBe("/private/kb/readme.md");
  });
});

describe("firstHeading", () => {
  test("finds the first h1", () => {
    expect(firstHeading("intro\n# Real Title\n## sub")).toBe("Real Title");
  });
});

describe("toExportMarkdown", () => {
  test("round-trips through parseFrontmatter", () => {
    const md = toExportMarkdown({
      path: "/private/notes/x.md",
      title: "X",
      tldr: null,
      kind: "note",
      tags: ["t1", "t2"],
      visibility: "private",
      updatedAt: "2026-06-12T00:00:00Z",
      bodyMd: "hello",
    });
    const fm = parseFrontmatter(md);
    expect(fm.title).toBe("X");
    expect(fm.tags).toEqual(["t1", "t2"]);
    expect(fm.body.trim()).toBe("hello");
  });
});
