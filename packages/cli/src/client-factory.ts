import { AuthError, BrainClient, BrainError } from "@unisonlabs/sdk";
import { loadCredentials } from "./config";

/**
 * Resolve the effective actor id for a request, in priority order:
 *   1. Explicit `--actor` flag value (passed by the command)
 *   2. UNISON_ACTOR environment variable
 *   3. undefined (no delegation)
 */
export function resolveActor(flagValue?: string): string | undefined {
  return flagValue?.trim() || process.env.UNISON_ACTOR?.trim() || undefined;
}

export async function requireClient(actor?: string): Promise<BrainClient> {
  const creds = await loadCredentials();
  if (!creds) {
    // Thrown (not exit) so the top-level handler renders it consistently —
    // JSON envelope under --json, exit code 4 (auth).
    throw new AuthError("Not authenticated. Run `unison auth login` first.");
  }
  const client = new BrainClient({
    baseUrl: creds.apiUrl,
    token: creds.token,
    actor: resolveActor(actor),
  });
  // Wrap the client in a Proxy so auth errors carry the target host.
  return wrapClientWithApiUrl(client, creds.apiUrl);
}

/**
 * Returns a Proxy over a BrainClient that intercepts any rejected promise from
 * a method call and, when the error is a 401/403 BrainError, rethrows it with
 * the target API URL appended to the message.
 */
function wrapClientWithApiUrl(client: BrainClient, apiUrl: string): BrainClient {
  return new Proxy(client, {
    get(target, prop, receiver) {
      const value = Reflect.get(target, prop, receiver);
      if (typeof value !== "function") return value;
      return (...args: unknown[]) => {
        const result = (value as (...a: unknown[]) => unknown).apply(target, args);
        if (result instanceof Promise) {
          return result.catch((err: unknown) => {
            if (
              err instanceof BrainError &&
              (err.status === 401 || err.status === 403) &&
              !err.message.includes("(api:")
            ) {
              throw new BrainError(err.code, `${err.message} (api: ${apiUrl})`, err.status);
            }
            throw err;
          });
        }
        return result;
      };
    },
  });
}
