import { describe, expect, test } from "bun:test";
import { buildAuthorizeUrl, generatePkce, pollDeviceToken, randomState } from "./auth";

function stub(status: number, body: unknown): typeof fetch {
  return (() =>
    Promise.resolve(new Response(JSON.stringify(body), { status }))) as unknown as typeof fetch;
}

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
