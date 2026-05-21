import { describe, expect, test } from "bun:test";
import { BrainClient } from "./client";
import { BrainError } from "./errors";
import { parseResponse } from "./http";

function stubFetch(handler: (url: string, init?: RequestInit) => Response): typeof fetch {
  return ((input: string | URL | Request, init?: RequestInit) =>
    Promise.resolve(handler(String(input), init))) as unknown as typeof fetch;
}

describe("BrainClient", () => {
  test("search builds the query string and sends the bearer token", async () => {
    let capturedUrl = "";
    let capturedAuth = "";
    const client = new BrainClient({
      baseUrl: "https://api.test/",
      token: "tok",
      fetch: stubFetch((url, init) => {
        capturedUrl = url;
        capturedAuth = (init?.headers as Record<string, string>).authorization ?? "";
        return new Response(
          JSON.stringify({
            results: [{ path: "/a", title: "A", snippet: "s", score: 1, kind: "note", tags: [] }],
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      }),
    });

    const res = await client.search("hello world", { limit: 5 });

    expect(capturedUrl).toContain("/v1/brain/search?");
    expect(capturedUrl).toContain("q=hello+world");
    expect(capturedUrl).toContain("k=5");
    expect(capturedAuth).toBe("Bearer tok");
    expect(res).toHaveLength(1);
    expect(res[0]?.path).toBe("/a");
  });

  test("write sends a JSON body", async () => {
    let capturedBody = "";
    const client = new BrainClient({
      baseUrl: "https://api.test",
      token: "tok",
      fetch: stubFetch((_url, init) => {
        capturedBody = String(init?.body ?? "");
        return new Response(
          JSON.stringify({
            path: "/notes/x",
            title: null,
            content: "hi",
            kind: "note",
            tags: [],
            updatedAt: "2026-05-21T00:00:00Z",
          }),
          { status: 200 },
        );
      }),
    });

    const doc = await client.write({ path: "/notes/x", content: "hi" });
    expect(JSON.parse(capturedBody).path).toBe("/notes/x");
    expect(doc.path).toBe("/notes/x");
  });
});

describe("parseResponse", () => {
  test("throws a BrainError carrying the API error code", async () => {
    const res = new Response(JSON.stringify({ error: { code: "not_found", message: "nope" } }), {
      status: 404,
    });
    expect(parseResponse(res)).rejects.toThrow(BrainError);
  });
});
