import { describe, expect, test } from "bun:test";
import {
  buildAuthorizeUrl,
  generatePkce,
  pollDeviceToken,
  randomState,
  startDeviceAuth,
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
