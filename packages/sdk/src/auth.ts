import { BrainError } from "./errors";
import { API_VERSION, parseResponse, stripTrailingSlash } from "./http";

// ── Email-OTP machine auth ────────────────────────────────────────────────────
//
// Three-step flow:
//   1. POST /provision  {email}           → {apiKey, workspaceId, status, emailSent, …}
//   2. POST /verify     {email, code}     → durable (first time) or key recovery
//   3. (recovery only) POST /request-key {email} → sends recovery OTP

export interface ProvisionResponse {
  apiKey: string;
  workspaceId: string;
  status: string;
  emailSent: boolean;
  joinedExistingWorkspace?: boolean;
  message?: string;
}

export interface VerifyResponse {
  verified: boolean;
  apiKey?: string;
  workspaceId?: string;
}

/** Create a new account for `email` and return a working (unverified) key.
 * If the email already belongs to an account, throws a BrainError with code
 * `email_registered` — caller should redirect to `requestKey` instead. */
export async function provisionAccount(
  baseUrl: string,
  params: { email: string },
  fetchImpl: typeof fetch = fetch,
): Promise<ProvisionResponse> {
  const res = await fetchImpl(`${stripTrailingSlash(baseUrl)}/${API_VERSION}/auth/provision`, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({ email: params.email }),
  });
  return parseResponse<ProvisionResponse>(res);
}

/** Verify an emailed code. First-time → makes the account durable, returns verified+workspaceId.
 * Recovery (already-verified account) → returns a fresh apiKey. */
export async function verifyEmail(
  baseUrl: string,
  params: { email: string; code: string },
  fetchImpl: typeof fetch = fetch,
): Promise<VerifyResponse> {
  const res = await fetchImpl(`${stripTrailingSlash(baseUrl)}/${API_VERSION}/auth/verify`, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({ email: params.email, code: params.code }),
  });
  return parseResponse<VerifyResponse>(res);
}

/** Request a recovery OTP for an existing verified account (lost key / new machine).
 * Responds uniformly — does not reveal whether the email is registered. */
export async function requestKey(
  baseUrl: string,
  params: { email: string },
  fetchImpl: typeof fetch = fetch,
): Promise<{ status: string }> {
  const res = await fetchImpl(`${stripTrailingSlash(baseUrl)}/${API_VERSION}/auth/request-key`, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({ email: params.email }),
  });
  return parseResponse<{ status: string }>(res);
}

// ── API-key management (authenticated) ───────────────────────────────────────

export interface ApiKeyRecord {
  id: string;
  name: string;
  keyPrefix: string;
  scopes: string[];
  createdAt: string;
  expiresAt: string | null;
  revokedAt: string | null;
}

export interface CreateKeyResponse {
  id: string;
  token: string;
  scopes: string[];
  name: string;
}

/** List the caller's API keys. Never returns key hashes. Scope: brain:read.
 * Pass `workspaceId` to list keys minted for a specific member workspace. */
export async function listKeys(
  baseUrl: string,
  token: string,
  opts: { workspaceId?: string } = {},
  fetchImpl: typeof fetch = fetch,
): Promise<ApiKeyRecord[]> {
  const qs = opts.workspaceId ? `?workspaceId=${encodeURIComponent(opts.workspaceId)}` : "";
  const res = await fetchImpl(`${stripTrailingSlash(baseUrl)}/${API_VERSION}/auth/keys${qs}`, {
    headers: { authorization: `Bearer ${token}`, accept: "application/json" },
  });
  const data = await parseResponse<{ keys: ApiKeyRecord[] }>(res);
  return data.keys;
}

/** Mint an additional key. Scope: brain:read. The token is returned ONCE — store it.
 * Pass `workspaceId` to mint the key into a different workspace the caller is a member of. */
export async function createKey(
  baseUrl: string,
  token: string,
  params: { name?: string; scopes?: string[]; workspaceId?: string },
  fetchImpl: typeof fetch = fetch,
): Promise<CreateKeyResponse> {
  const res = await fetchImpl(`${stripTrailingSlash(baseUrl)}/${API_VERSION}/auth/keys`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify(params),
  });
  return parseResponse<CreateKeyResponse>(res);
}

// ── Workspace membership ──────────────────────────────────────────────────────

export interface WorkspaceMembershipRecord {
  id: string;
  name: string | null;
  role: string;
  active: boolean;
}

/** List all workspaces the caller is a member of. Scope: brain:read. */
export async function listWorkspaces(
  baseUrl: string,
  token: string,
  fetchImpl: typeof fetch = fetch,
): Promise<WorkspaceMembershipRecord[]> {
  const res = await fetchImpl(`${stripTrailingSlash(baseUrl)}/${API_VERSION}/auth/workspaces`, {
    headers: { authorization: `Bearer ${token}`, accept: "application/json" },
  });
  const data = await parseResponse<{ workspaces: WorkspaceMembershipRecord[] }>(res);
  return data.workspaces;
}

/** Revoke one of the caller's keys by id. Scope: brain:read. */
export async function revokeKey(
  baseUrl: string,
  token: string,
  keyId: string,
  fetchImpl: typeof fetch = fetch,
): Promise<{ revoked: boolean; id: string; note?: string }> {
  const res = await fetchImpl(
    `${stripTrailingSlash(baseUrl)}/${API_VERSION}/auth/keys/${encodeURIComponent(keyId)}`,
    {
      method: "DELETE",
      headers: { authorization: `Bearer ${token}`, accept: "application/json" },
    },
  );
  return parseResponse<{ revoked: boolean; id: string; note?: string }>(res);
}

// ── Invitations (authenticated) ───────────────────────────────────────────────

export interface InvitationRecord {
  id: string;
  email: string;
  role: string;
  status: string;
  expiresAt: string;
  createdAt: string;
}

export interface CreateInvitationResponse {
  invitation: InvitationRecord;
  emailSent: boolean;
}

/** Invite an email to the caller's workspace. Caller must be owner or admin. Scope: brain:read. */
export async function createInvitation(
  baseUrl: string,
  token: string,
  params: { email: string; role?: string },
  fetchImpl: typeof fetch = fetch,
): Promise<CreateInvitationResponse> {
  const res = await fetchImpl(`${stripTrailingSlash(baseUrl)}/${API_VERSION}/auth/invitations`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify(params),
  });
  return parseResponse<CreateInvitationResponse>(res);
}

/** List pending invitations for the caller's workspace. Owner/admin only. Scope: brain:read. */
export async function listInvitations(
  baseUrl: string,
  token: string,
  fetchImpl: typeof fetch = fetch,
): Promise<InvitationRecord[]> {
  const res = await fetchImpl(`${stripTrailingSlash(baseUrl)}/${API_VERSION}/auth/invitations`, {
    headers: { authorization: `Bearer ${token}`, accept: "application/json" },
  });
  const data = await parseResponse<{ invitations: InvitationRecord[] }>(res);
  return data.invitations;
}

/** Revoke a pending invitation by id. Owner/admin only. Scope: brain:read. */
export async function revokeInvitation(
  baseUrl: string,
  token: string,
  inviteId: string,
  fetchImpl: typeof fetch = fetch,
): Promise<{ revoked: boolean; id: string }> {
  const res = await fetchImpl(
    `${stripTrailingSlash(baseUrl)}/${API_VERSION}/auth/invitations/${encodeURIComponent(inviteId)}`,
    {
      method: "DELETE",
      headers: { authorization: `Bearer ${token}`, accept: "application/json" },
    },
  );
  return parseResponse<{ revoked: boolean; id: string }>(res);
}

// Keep BrainError re-exported for callers who catch auth errors.
export { BrainError };
