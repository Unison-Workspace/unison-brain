import { BrainError } from "./errors";
import { API_VERSION, parseResponse, stripTrailingSlash } from "./http";
import type {
  AuthorizeUrlParams,
  DeviceCodeResponse,
  ExchangeCodeParams,
  PkcePair,
  TokenResponse,
} from "./types";

const CLIENT_ID = "unison-cli";

// ── Browser loopback (PKCE, RFC 7636 + RFC 8252) — primary login ────────────

function base64Url(bytes: Uint8Array): string {
  return Buffer.from(bytes)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/** Generate a PKCE verifier + S256 challenge. */
export async function generatePkce(): Promise<PkcePair> {
  const verifierBytes = crypto.getRandomValues(new Uint8Array(32));
  const verifier = base64Url(verifierBytes);
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
  return { verifier, challenge: base64Url(new Uint8Array(digest)) };
}

/** Random URL-safe token for the CSRF `state` parameter. */
export function randomState(): string {
  return base64Url(crypto.getRandomValues(new Uint8Array(16)));
}

/** Build the browser URL the user is sent to (the dashboard's /cli-auth page). */
export function buildAuthorizeUrl(appUrl: string, params: AuthorizeUrlParams): string {
  const query = new URLSearchParams({
    response_type: "code",
    client_id: params.clientId ?? CLIENT_ID,
    redirect_uri: params.redirectUri,
    code_challenge: params.codeChallenge,
    code_challenge_method: "S256",
    state: params.state,
  });
  if (params.scopes?.length) query.set("scope", params.scopes.join(" "));
  return `${stripTrailingSlash(appUrl)}/cli-auth?${query.toString()}`;
}

/** Exchange the authorization code (+ verifier) for an access token. */
export async function exchangeCode(
  baseUrl: string,
  params: ExchangeCodeParams,
  fetchImpl: typeof fetch = fetch,
): Promise<TokenResponse> {
  const res = await fetchImpl(`${stripTrailingSlash(baseUrl)}/${API_VERSION}/auth/token`, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({
      grantType: "authorization_code",
      code: params.code,
      codeVerifier: params.verifier,
      redirectUri: params.redirectUri,
      clientId: params.clientId ?? CLIENT_ID,
    }),
  });
  return parseResponse<TokenResponse>(res);
}

// ── Device flow (RFC 8628) — headless fallback ──────────────────────────────

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
  token?: TokenResponse;
}

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
    return { status: "complete", token: (await res.json()) as TokenResponse };
  }

  const body = (await res.json().catch(() => ({}))) as { error?: string | { code?: string } };
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
