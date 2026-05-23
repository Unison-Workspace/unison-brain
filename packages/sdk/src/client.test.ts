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

  test("write PUTs the document body", async () => {
    let method = "";
    let captured = "";
    const client = new BrainClient({
      baseUrl: "https://api.test",
      token: "tok",
      fetch: stubFetch((_u, init) => {
        method = init?.method ?? "";
        captured = String(init?.body ?? "");
        return json({ id: "1", path: "/wiki/x", kind: "wiki_page", bodyMd: "hi" });
      }),
    });

    const doc = await client.write({ path: "/wiki/x", bodyMd: "hi", kind: "wiki_page" });
    expect(method).toBe("PUT");
    expect(JSON.parse(captured).bodyMd).toBe("hi");
    expect(doc.path).toBe("/wiki/x");
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
