import { BrainError } from "./errors";
import { API_VERSION, parseResponse, stripTrailingSlash } from "./http";
import type { DeviceCodeResponse, DeviceTokenResponse } from "./types";

const CLIENT_ID = "unison-cli";

/** Step 1 of the OAuth 2.0 Device Authorization Grant (RFC 8628). */
export async function startDeviceAuth(
  baseUrl: string,
  fetchImpl: typeof fetch = fetch,
): Promise<DeviceCodeResponse> {
  const res = await fetchImpl(`${stripTrailingSlash(baseUrl)}/${API_VERSION}/auth/device/code`, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({ clientId: CLIENT_ID }),
  });
  return parseResponse<DeviceCodeResponse>(res);
}

export type PollStatus = "pending" | "slow_down" | "complete" | "denied" | "expired";

export interface PollResult {
  status: PollStatus;
  token?: DeviceTokenResponse;
}

/** Step 2: poll the token endpoint until the user approves or the code expires. */
export async function pollDeviceToken(
  baseUrl: string,
  deviceCode: string,
  fetchImpl: typeof fetch = fetch,
): Promise<PollResult> {
  const res = await fetchImpl(`${stripTrailingSlash(baseUrl)}/${API_VERSION}/auth/device/token`, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({ deviceCode }),
  });

  if (res.ok) {
    const token = (await res.json()) as DeviceTokenResponse;
    return { status: "complete", token };
  }

  const body = (await res.json().catch(() => ({}))) as {
    error?: string | { code?: string };
  };
  const code = typeof body.error === "string" ? body.error : body.error?.code;

  switch (code) {
    case "authorization_pending":
      return { status: "pending" };
    case "slow_down":
      return { status: "slow_down" };
    case "access_denied":
      return { status: "denied" };
    case "expired_token":
      return { status: "expired" };
    default:
      throw new BrainError(code ?? "auth_error", "Device authorization failed", res.status);
  }
}
