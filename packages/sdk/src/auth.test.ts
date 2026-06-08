import { describe, expect, test } from "bun:test";
import {
  buildAuthorizeUrl,
  generatePkce,
  pollDeviceToken,
  provisionAccount,
  randomState,
  requestKey,
  startDeviceAuth,
  verifyEmail,
} from "./auth";

function stub(status: number, body: unknown): typeof fetch {
  return (() =>
    Promise.resolve(new Response(JSON.stringify(body), { status }))) as unknown as typeof fetch;
}

/** A fetch stub that records the request body it was called with. */
function captureBody(): { calls: Array<Record<string, unknown>>; fetch: typeof fetch } {
  const calls: Array<Record<string, unknown>> = [];
  const fetch = ((_url: string, init?: RequestInit) => {
    calls.push(JSON.parse(String(init?.body ?? "{}")));
    return Promise.resolve(
      new Response(
        JSON.stringify({
          deviceCode: "dc",
          userCode: "WXYZ-1234",
          verificationUri: "https://app.test/cli-auth/device",
          verificationUriComplete: "https://app.test/cli-auth/device?code=WXYZ-1234",
          interval: 5,
          expiresIn: 600,
        }),
        { status: 200 },
      ),
    );
  }) as unknown as typeof fetch;
  return { calls, fetch };
}

describe("startDeviceAuth", () => {
  test("sends the requested scopes as a space-joined scope field", async () => {
    const cap = captureBody();
    await startDeviceAuth("https://api.test", { scopes: ["brain:read", "work:write"] }, cap.fetch);
    expect(cap.calls[0]).toEqual({ clientId: "unison-cli", scope: "brain:read work:write" });
  });

  test("omits scope when none are requested (server keeps its brain-only default)", async () => {
    const cap = captureBody();
    await startDeviceAuth("https://api.test", {}, cap.fetch);
    expect(cap.calls[0]).toEqual({ clientId: "unison-cli" });
    expect("scope" in cap.calls[0]).toBe(false);
  });
});

describe("pollDeviceToken", () => {
  test("maps authorization_pending to pending", async () => {
    const r = await pollDeviceToken(
      "https://api.test",
      "dc",
      stub(400, { error: "authorization_pending" }),
    );
    expect(r.status).toBe("pending");
  });

  test("maps slow_down", async () => {
    const r = await pollDeviceToken("https://api.test", "dc", stub(400, { error: "slow_down" }));
    expect(r.status).toBe("slow_down");
  });

  test("maps access_denied", async () => {
    const r = await pollDeviceToken(
      "https://api.test",
      "dc",
      stub(400, { error: "access_denied" }),
    );
    expect(r.status).toBe("denied");
  });

  test("returns the token on success", async () => {
    const r = await pollDeviceToken(
      "https://api.test",
      "dc",
      stub(200, { accessToken: "abc", tokenType: "Bearer", scope: "brain:read brain:write" }),
    );
    expect(r.status).toBe("complete");
    expect(r.token?.accessToken).toBe("abc");
  });
});

describe("PKCE loopback helpers", () => {
  test("generatePkce returns a URL-safe verifier and S256 challenge", async () => {
    const { verifier, challenge } = await generatePkce();
    expect(verifier).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(challenge).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(challenge).not.toBe(verifier);
  });

  test("buildAuthorizeUrl points at /cli-auth with PKCE + state params", () => {
    const url = buildAuthorizeUrl("https://app.unisonlabs.ai/", {
      redirectUri: "http://127.0.0.1:5000/callback",
      codeChallenge: "chal",
      state: randomState(),
      scopes: ["brain:read", "brain:write"],
    });
    expect(url).toContain("https://app.unisonlabs.ai/cli-auth?");
    expect(url).toContain("code_challenge=chal");
    expect(url).toContain("code_challenge_method=S256");
    expect(url).toContain("redirect_uri=http");
    expect(url).toContain("scope=brain");
  });
});

describe("machine-auth provisioning", () => {
  test("provisionAccount posts the email + clientId and returns the key", async () => {
    const cap = { calls: [] as Array<Record<string, unknown>> };
    const fetchImpl = ((url: string, init?: RequestInit) => {
      cap.calls.push({ url, body: JSON.parse(String(init?.body ?? "{}")) });
      return Promise.resolve(
        new Response(JSON.stringify({ apiKey: "usk_abc", tenantId: "t1", status: "unverified" }), {
          status: 200,
        }),
      );
    }) as unknown as typeof fetch;
    const res = await provisionAccount(
      "https://api.test",
      { email: "Agent@Example.com" },
      fetchImpl,
    );
    expect(res).toEqual({ apiKey: "usk_abc", tenantId: "t1", status: "unverified" });
    expect(String(cap.calls[0].url)).toContain("/v1/auth/provision");
    expect(cap.calls[0].body).toEqual({ email: "Agent@Example.com", clientId: "unison-cli" });
  });

  test("verifyEmail posts email + code and returns an optional recovery key", async () => {
    const fetchImpl = stub(200, { verified: true, apiKey: "usk_new", tenantId: "t1" });
    const res = await verifyEmail(
      "https://api.test",
      { email: "a@b.co", code: "123456" },
      fetchImpl,
    );
    expect(res).toEqual({ verified: true, apiKey: "usk_new", tenantId: "t1" });
  });

  test("requestKey posts the email and returns a uniform status", async () => {
    const fetchImpl = stub(200, { status: "verification_sent" });
    const res = await requestKey("https://api.test", { email: "a@b.co" }, fetchImpl);
    expect(res).toEqual({ status: "verification_sent" });
  });

  test("provisionAccount throws on an error envelope (e.g. 409 email_registered)", async () => {
    const fetchImpl = stub(409, { error: { code: "email_registered", message: "exists" } });
    await expect(
      provisionAccount("https://api.test", { email: "a@b.co" }, fetchImpl),
    ).rejects.toThrow();
  });
});
