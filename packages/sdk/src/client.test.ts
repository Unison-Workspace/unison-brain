import { describe, expect, test } from "bun:test";
import { BrainClient } from "./client";
import { BrainError } from "./errors";
import { parseResponse } from "./http";

function stubFetch(handler: (url: string, init?: RequestInit) => Response): typeof fetch {
  return ((input: string | URL | Request, init?: RequestInit) =>
    Promise.resolve(handler(String(input), init))) as unknown as typeof fetch;
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("BrainClient documents", () => {
  test("search builds the query (k, kinds, tags) and sends the bearer token", async () => {
    let url = "";
    let auth = "";
    const client = new BrainClient({
      baseUrl: "https://api.test/",
      token: "tok",
      fetch: stubFetch((u, init) => {
        url = u;
        auth = (init?.headers as Record<string, string>).authorization ?? "";
        return json({ results: [] });
      }),
    });

    await client.search("hello world", { limit: 5, kinds: ["note", "wiki_page"], tags: ["x"] });

    expect(url).toContain("/v1/brain/search?");
    expect(url).toContain("q=hello+world");
    expect(url).toContain("k=5");
    expect(url).toContain("kind=note");
    expect(url).toContain("kind=wiki_page");
    expect(url).toContain("tag=x");
    expect(auth).toBe("Bearer tok");
  });

  test("search returns body-less doc summaries (no bodyMd)", async () => {
    // The /v1/brain/search endpoint returns metadata-only docs (SPEC §5.1).
    // SearchResult.doc is typed as BrainDocumentSummary so callers can't read
    // a `bodyMd` that is never present — they must fetch it via get().
    const client = new BrainClient({
      baseUrl: "https://api.test",
      token: "tok",
      fetch: stubFetch(() =>
        json({
          results: [
            {
              doc: {
                id: "d1",
                path: "/private/notes/auth.md",
                kind: "note",
                title: "Auth decision",
                tldr: "We chose device-flow.",
                tags: ["auth"],
                visibility: "tenant",
                updatedAt: "2026-05-31T00:00:00Z",
                contentHash: "abc",
              },
              score: 0.9,
              sources: ["vector"],
            },
          ],
        }),
      ),
    });

    const results = await client.search("auth decision");
    expect(results).toHaveLength(1);
    expect(results[0]?.doc.path).toBe("/private/notes/auth.md");
    expect(results[0]?.doc.tldr).toBe("We chose device-flow.");
    // The hit is a summary: no body is sent over the wire.
    expect("bodyMd" in (results[0]?.doc ?? {})).toBe(false);
  });

  test("write PUTs the document body to a contract path", async () => {
    let method = "";
    let captured = "";
    const client = new BrainClient({
      baseUrl: "https://api.test",
      token: "tok",
      fetch: stubFetch((_u, init) => {
        method = init?.method ?? "";
        captured = String(init?.body ?? "");
        return json({ id: "1", path: "/private/notes/x.md", kind: "note", bodyMd: "hi" });
      }),
    });

    const doc = await client.write({ path: "/private/notes/x.md", bodyMd: "hi" });
    expect(method).toBe("PUT");
    expect(JSON.parse(captured).path).toBe("/private/notes/x.md");
    expect(JSON.parse(captured).bodyMd).toBe("hi");
    expect(doc.path).toBe("/private/notes/x.md");
  });

  test("write default-routes a bare name to /private/notes", async () => {
    let captured = "";
    const client = new BrainClient({
      baseUrl: "https://api.test",
      token: "tok",
      fetch: stubFetch((_u, init) => {
        captured = String(init?.body ?? "");
        return json({
          id: "1",
          path: "/private/notes/auth-decision.md",
          kind: "note",
          bodyMd: "x",
        });
      }),
    });

    await client.write({ path: "Auth Decision.md", bodyMd: "x" });
    expect(JSON.parse(captured).path).toBe("/private/notes/auth-decision.md");
  });

  test("write rejects a non-contract namespace before the round-trip", async () => {
    let called = false;
    const client = new BrainClient({
      baseUrl: "https://api.test",
      token: "tok",
      fetch: stubFetch(() => {
        called = true;
        return json({});
      }),
    });

    await expect(client.write({ path: "/wiki/x.md", bodyMd: "x" })).rejects.toThrow(/FS contract/);
    expect(called).toBe(false);
  });

  test("editDoc sends one atomic PATCH with oldStr/newStr (server does match + uniqueness)", async () => {
    const calls: { method: string; url: string; body: string }[] = [];
    const client = new BrainClient({
      baseUrl: "https://api.test",
      token: "tok",
      fetch: stubFetch((u, init) => {
        calls.push({ method: init?.method ?? "", url: u, body: String(init?.body ?? "") });
        return json({ id: "1", path: "/private/notes/x.md", bodyMd: "alpha BETA gamma" });
      }),
    });

    await client.editDoc({ path: "/private/notes/x.md", oldStr: "beta", newStr: "BETA" });
    // No client read-modify-write: a single PATCH, server matches + replaces.
    expect(calls).toHaveLength(1);
    expect(calls[0]?.method).toBe("PATCH");
    expect(calls[0]?.url).toContain("/v1/brain/doc");
    const body = JSON.parse(calls[0]?.body ?? "{}");
    expect(body.oldStr).toBe("beta");
    expect(body.newStr).toBe("BETA");
  });

  test("editDoc refuses a no-op (oldStr === newStr) without a round-trip", async () => {
    let called = false;
    const client = new BrainClient({
      baseUrl: "https://api.test",
      token: "tok",
      fetch: stubFetch(() => {
        called = true;
        return json({ id: "1", path: "/private/notes/x.md" });
      }),
    });

    await expect(
      client.editDoc({ path: "/private/notes/x.md", oldStr: "a", newStr: "a" }),
    ).rejects.toThrow(/identical/);
    expect(called).toBe(false);
  });
});

describe("BrainClient namespaces", () => {
  test("facts.about hits the entity-scoped path and unwraps facts", async () => {
    let url = "";
    const client = new BrainClient({
      baseUrl: "https://api.test",
      token: "tok",
      fetch: stubFetch((u) => {
        url = u;
        return json({ facts: [{ id: "f1", subjectId: "e1", predicate: "p", factText: "t" }] });
      }),
    });

    const facts = await client.facts.about("e1", { includeInvalidated: true });
    expect(url).toContain("/v1/brain/entities/e1/facts?");
    expect(url).toContain("includeInvalidated=true");
    expect(facts[0]?.id).toBe("f1");
  });

  test("review.resolve POSTs the verdict", async () => {
    let method = "";
    let body = "";
    const client = new BrainClient({
      baseUrl: "https://api.test",
      token: "tok",
      fetch: stubFetch((_u, init) => {
        method = init?.method ?? "";
        body = String(init?.body ?? "");
        return json({ ok: true });
      }),
    });

    const res = await client.review.resolve("c1", "merge");
    expect(method).toBe("POST");
    expect(JSON.parse(body).verdict).toBe("merge");
    expect(res.ok).toBe(true);
  });
});

describe("parseResponse", () => {
  test("throws a BrainError carrying the API error code", async () => {
    expect(
      parseResponse(json({ error: { code: "not_found", message: "nope" } }, 404)),
    ).rejects.toThrow(BrainError);
  });
});
