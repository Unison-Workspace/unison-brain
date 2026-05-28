import { describe, expect, test } from "bun:test";
import { BrainClient } from "./client";

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
function client(handler: (url: string, init?: RequestInit) => Response): BrainClient {
  return new BrainClient({ baseUrl: "https://api.test", token: "tok", fetch: stubFetch(handler) });
}

describe("domain clients build correct /v1 requests", () => {
  test("work.apply POSTs operations to /v1/work/apply", async () => {
    let url = "";
    let method = "";
    let body = "";
    const c = client((u, init) => {
      url = u;
      method = init?.method ?? "";
      body = String(init?.body ?? "");
      return json({ results: [{ id: "rec1" }] });
    });
    await c.work.apply({
      operations: [{ op: "record.upsert", tableId: { ref: "t" }, primaryText: "Acme" }],
    });
    expect(url).toContain("/v1/work/apply");
    expect(url).not.toContain("apply:dry-run");
    expect(method).toBe("POST");
    expect(JSON.parse(body).operations[0].op).toBe("record.upsert");
  });

  test("work.apply routes dryRun to /v1/work/apply:dry-run", async () => {
    let url = "";
    const c = client((u) => {
      url = u;
      return json({ results: [] });
    });
    await c.work.apply({ operations: [{ op: "folder.create", name: "X" }], dryRun: true });
    expect(url).toContain("/v1/work/apply:dry-run");
  });

  test("work.search POSTs {query, limit} to /v1/work/search", async () => {
    let url = "";
    let body = "";
    const c = client((u, init) => {
      url = u;
      body = String(init?.body ?? "");
      return json({ results: [] });
    });
    await c.work.search({ query: "vendors", limit: 5 });
    expect(url).toContain("/v1/work/search");
    expect(JSON.parse(body)).toEqual({ query: "vendors", limit: 5 });
  });

  test("work.tree GETs /v1/work/tree with teamSpaceId", async () => {
    let url = "";
    const c = client((u) => {
      url = u;
      return json({ folders: [], artifacts: [] });
    });
    await c.work.tree({ teamSpaceId: "ts1" });
    expect(url).toContain("/v1/work/tree?teamSpaceId=ts1");
  });

  test("work.viewQuery POSTs to /v1/work/views/:id/query", async () => {
    let url = "";
    let method = "";
    const c = client((u, init) => {
      url = u;
      method = init?.method ?? "";
      return json({ rows: [] });
    });
    await c.work.viewQuery("v1", { limit: 10 });
    expect(url).toContain("/v1/work/views/v1/query");
    expect(method).toBe("POST");
  });

  test("mail.send POSTs to /v1/mail/send", async () => {
    let url = "";
    let method = "";
    const c = client((u, init) => {
      url = u;
      method = init?.method ?? "";
      return json({ ok: true });
    });
    await c.mail.send({ to: ["a@b.com"], subject: "Hi" });
    expect(url).toContain("/v1/mail/send");
    expect(method).toBe("POST");
  });

  test("chat.send POSTs to /v1/chat/messages", async () => {
    let url = "";
    const c = client((u) => {
      url = u;
      return json({ id: "m1" });
    });
    await c.chat.send({ channelId: "c1", content: "yo" });
    expect(url).toContain("/v1/chat/messages");
  });

  test("calendar.events unwraps {events} with the range", async () => {
    let url = "";
    const c = client((u) => {
      url = u;
      return json({ events: [] });
    });
    await c.calendar.events({ from: "2026-01-01", to: "2026-01-02" });
    expect(url).toContain("/v1/calendar/events?");
    expect(url).toContain("from=2026-01-01");
    expect(url).toContain("to=2026-01-02");
  });

  test("people.search hits /v1/people/search", async () => {
    let url = "";
    const c = client((u) => {
      url = u;
      return json({ results: [] });
    });
    await c.people.search("daniel", { limit: 10 });
    expect(url).toContain("/v1/people/search?");
    expect(url).toContain("q=daniel");
  });
});
