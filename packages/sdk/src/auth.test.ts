import { describe, expect, test } from "bun:test";
import {
  createInvitation,
  createKey,
  listInvitations,
  listKeys,
  provisionAccount,
  requestKey,
  revokeInvitation,
  revokeKey,
  verifyEmail,
} from "./auth";

function stub(status: number, body: unknown): typeof fetch {
  return (() =>
    Promise.resolve(new Response(JSON.stringify(body), { status }))) as unknown as typeof fetch;
}

function captureRequest(): {
  calls: Array<{
    url: string;
    method: string;
    body: Record<string, unknown>;
    headers: Record<string, string>;
  }>;
  fetch: typeof fetch;
} {
  const calls: Array<{
    url: string;
    method: string;
    body: Record<string, unknown>;
    headers: Record<string, string>;
  }> = [];
  const fetchImpl = ((url: string, init?: RequestInit) => {
    const headers: Record<string, string> = {};
    if (init?.headers) {
      const h = init.headers as Record<string, string>;
      for (const [k, v] of Object.entries(h)) headers[k] = v;
    }
    calls.push({
      url: String(url),
      method: String(init?.method ?? "GET"),
      body: JSON.parse(String(init?.body ?? "{}")),
      headers,
    });
    return Promise.resolve(new Response(JSON.stringify({}), { status: 200 }));
  }) as unknown as typeof fetch;
  return { calls, fetch: fetchImpl };
}

// ── provisionAccount ──────────────────────────────────────────────────────────

describe("provisionAccount", () => {
  test("POSTs email to /v1/auth/provision and returns the key", async () => {
    const fetchImpl = stub(200, {
      apiKey: "usk_abc",
      tenantId: "t1",
      status: "unverified",
      emailSent: true,
      joinedExistingTenant: false,
    });
    const res = await provisionAccount(
      "https://api.test",
      { email: "agent@example.com" },
      fetchImpl,
    );
    expect(res.apiKey).toBe("usk_abc");
    expect(res.tenantId).toBe("t1");
    expect(res.status).toBe("unverified");
  });

  test("throws on 409 email_registered", async () => {
    const fetchImpl = stub(409, { error: { code: "email_registered", message: "exists" } });
    await expect(
      provisionAccount("https://api.test", { email: "a@b.co" }, fetchImpl),
    ).rejects.toThrow();
  });

  test("sends only email (no clientId) in the body", async () => {
    const cap = captureRequest();
    // Return a valid response so parseResponse doesn't throw.
    const capFetch = ((url: string, init?: RequestInit) => {
      const headers: Record<string, string> = {};
      if (init?.headers) {
        const h = init.headers as Record<string, string>;
        for (const [k, v] of Object.entries(h)) headers[k] = v;
      }
      cap.calls.push({
        url: String(url),
        method: String(init?.method ?? "GET"),
        body: JSON.parse(String(init?.body ?? "{}")),
        headers,
      });
      return Promise.resolve(
        new Response(
          JSON.stringify({
            apiKey: "usk_x",
            tenantId: "t1",
            status: "unverified",
            emailSent: true,
          }),
          { status: 200 },
        ),
      );
    }) as unknown as typeof fetch;
    await provisionAccount("https://api.test", { email: "a@b.co" }, capFetch);
    expect(cap.calls[0]?.body).toEqual({ email: "a@b.co" });
    expect("clientId" in (cap.calls[0]?.body ?? {})).toBe(false);
  });
});

// ── verifyEmail ───────────────────────────────────────────────────────────────

describe("verifyEmail", () => {
  test("posts email + code and returns verified + optional key", async () => {
    const fetchImpl = stub(200, { verified: true, apiKey: "usk_new", tenantId: "t1" });
    const res = await verifyEmail(
      "https://api.test",
      { email: "a@b.co", code: "123456" },
      fetchImpl,
    );
    expect(res.verified).toBe(true);
    expect(res.apiKey).toBe("usk_new");
  });

  test("returns verified:false on bad code", async () => {
    const fetchImpl = stub(400, { error: { code: "verification_failed", message: "bad code" } });
    await expect(
      verifyEmail("https://api.test", { email: "a@b.co", code: "000000" }, fetchImpl),
    ).rejects.toThrow();
  });
});

// ── requestKey ────────────────────────────────────────────────────────────────

describe("requestKey", () => {
  test("posts email and returns uniform status", async () => {
    const fetchImpl = stub(200, { status: "verification_sent" });
    const res = await requestKey("https://api.test", { email: "a@b.co" }, fetchImpl);
    expect(res.status).toBe("verification_sent");
  });
});

// ── listKeys ──────────────────────────────────────────────────────────────────

describe("listKeys", () => {
  test("GETs /v1/auth/keys with bearer token and returns keys array", async () => {
    const keys = [
      {
        id: "k1",
        name: "main",
        keyPrefix: "usk_abc",
        scopes: ["brain:read"],
        createdAt: "2026-01-01",
        expiresAt: null,
        revokedAt: null,
      },
    ];
    const fetchImpl = stub(200, { keys });
    const res = await listKeys("https://api.test", "usk_tok", fetchImpl);
    expect(res).toEqual(keys);
  });
});

// ── createKey ─────────────────────────────────────────────────────────────────

describe("createKey", () => {
  test("POSTs to /v1/auth/keys and returns id + token", async () => {
    const fetchImpl = stub(201, { id: "k2", token: "usk_new", scopes: ["brain:read"], name: "ci" });
    const res = await createKey("https://api.test", "usk_tok", { name: "ci" }, fetchImpl);
    expect(res.id).toBe("k2");
    expect(res.token).toBe("usk_new");
  });
});

// ── revokeKey ─────────────────────────────────────────────────────────────────

describe("revokeKey", () => {
  test("DELETEs /v1/auth/keys/:id and returns revoked:true", async () => {
    const fetchImpl = stub(200, { revoked: true, id: "k1" });
    const res = await revokeKey("https://api.test", "usk_tok", "k1", fetchImpl);
    expect(res.revoked).toBe(true);
    expect(res.id).toBe("k1");
  });
});

// ── createInvitation ──────────────────────────────────────────────────────────

describe("createInvitation", () => {
  test("POSTs email to /v1/auth/invitations and returns invitation + emailSent", async () => {
    const inv = {
      id: "i1",
      email: "b@c.com",
      role: "member",
      status: "pending",
      expiresAt: "2026-06-19",
      createdAt: "2026-06-12",
    };
    const fetchImpl = stub(201, { invitation: inv, emailSent: true });
    const res = await createInvitation(
      "https://api.test",
      "usk_tok",
      { email: "b@c.com" },
      fetchImpl,
    );
    expect(res.invitation.id).toBe("i1");
    expect(res.emailSent).toBe(true);
  });
});

// ── listInvitations ───────────────────────────────────────────────────────────

describe("listInvitations", () => {
  test("GETs /v1/auth/invitations and returns array", async () => {
    const inv = [
      {
        id: "i1",
        email: "b@c.com",
        role: "member",
        status: "pending",
        expiresAt: "2026-06-19",
        createdAt: "2026-06-12",
      },
    ];
    const fetchImpl = stub(200, { invitations: inv });
    const res = await listInvitations("https://api.test", "usk_tok", fetchImpl);
    expect(res).toEqual(inv);
  });
});

// ── revokeInvitation ──────────────────────────────────────────────────────────

describe("revokeInvitation", () => {
  test("DELETEs /v1/auth/invitations/:id and returns revoked:true", async () => {
    const fetchImpl = stub(200, { revoked: true, id: "i1" });
    const res = await revokeInvitation("https://api.test", "usk_tok", "i1", fetchImpl);
    expect(res.revoked).toBe(true);
    expect(res.id).toBe("i1");
  });
});
