import { BrainClient } from "@unisonlabs/sdk";
import { loadCredentials } from "./config";
import { fail } from "./output";

export async function requireClient(): Promise<BrainClient> {
  const creds = await loadCredentials();
  if (!creds) {
    fail("Not authenticated. Run `unison auth login` first.");
    process.exit(1);
  }
  return new BrainClient({ baseUrl: creds.apiUrl, token: creds.token });
}
