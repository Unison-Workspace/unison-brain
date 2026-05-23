import { AuthError, BrainClient } from "@unisonlabs/sdk";
import { loadCredentials } from "./config";

export async function requireClient(): Promise<BrainClient> {
  const creds = await loadCredentials();
  if (!creds) {
    // Thrown (not exit) so the top-level handler renders it consistently —
    // JSON envelope under --json, exit code 4 (auth).
    throw new AuthError("Not authenticated. Run `unison auth login` first.");
  }
  return new BrainClient({ baseUrl: creds.apiUrl, token: creds.token });
}
