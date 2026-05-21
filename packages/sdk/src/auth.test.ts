import { describe, expect, test } from "bun:test";
import { pollDeviceToken } from "./auth";

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
