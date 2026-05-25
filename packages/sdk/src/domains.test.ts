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
  test("tasks.list unwraps {tasks} and passes filters", async () => {
    let url = "";
    const c = client((u) => {
      url = u;
      return json({ tasks: [{ id: "t1" }] });
    });
    const res = await c.tasks.list({ projectId: "p1", limit: 5 });
    expect(url).toContain("/v1/tasks?");
    expect(url).toContain("projectId=p1");
    expect(url).toContain("limit=5");
    expect(res).toEqual([{ id: "t1" }]);
  });

  test("tasks.create POSTs the body", async () => {
    let method = "";
    let body = "";
    const c = client((_u, init) => {
      method = init?.method ?? "";
      body = String(init?.body ?? "");
      return json({ id: "t2" });
    });
    await c.tasks.create({ title: "Do it", priority: "high" });
    expect(method).toBe("POST");
    expect(JSON.parse(body)).toEqual({ title: "Do it", priority: "high" });
  });

  test("workspace.tree unwraps {nodes} with teamSpaceId", async () => {
    let url = "";
    const c = client((u) => {
      url = u;
      return json({ nodes: [] });
    });
    await c.workspace.tree("ts1");
    expect(url).toContain("/v1/workspace/tree?teamSpaceId=ts1");
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

  test("crm.searchRecords builds the search query", async () => {
    let url = "";
    const c = client((u) => {
      url = u;
      return json({ results: [] });
    });
    await c.crm.searchRecords({ q: "jane", objectSlug: "people", limit: 3 });
    expect(url).toContain("/v1/crm/records/search?");
    expect(url).toContain("q=jane");
    expect(url).toContain("objectSlug=people");
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
