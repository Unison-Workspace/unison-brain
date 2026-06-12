import { chmod, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join } from "node:path";

export interface StoredCredentials {
  apiUrl: string;
  token: string;
}

// TODO: point at production once the brain endpoints ship. Override anytime with
// the UNISON_API_URL / UNISON_APP_URL env vars or `unison auth login --api-url`.
const DEFAULT_API_URL = "https://api.unisonlabs.ai";
// The dashboard origin the browser is sent to during login (the /cli-auth page).
const DEFAULT_APP_URL = "https://app.unisonlabs.ai";

export function configPath(): string {
  const base = process.env.XDG_CONFIG_HOME ?? join(homedir(), ".config");
  return join(base, "unison", "config.json");
}

export function defaultApiUrl(): string {
  return process.env.UNISON_API_URL ?? DEFAULT_API_URL;
}

export function defaultAppUrl(): string {
  return process.env.UNISON_APP_URL ?? DEFAULT_APP_URL;
}

export async function loadCredentials(): Promise<StoredCredentials | null> {
  // Resolution order for apiUrl: UNISON_API_URL env > saved config apiUrl > default.
  // UNISON_TOKEN env overrides the stored token but still respects the saved apiUrl.
  const envToken = process.env.UNISON_TOKEN;
  const envApiUrl = process.env.UNISON_API_URL;

  let savedApiUrl: string | undefined;
  try {
    const raw = await readFile(configPath(), "utf8");
    const parsed = JSON.parse(raw) as Partial<StoredCredentials>;
    savedApiUrl = parsed.apiUrl;
    if (envToken) {
      return { apiUrl: envApiUrl ?? savedApiUrl ?? DEFAULT_API_URL, token: envToken };
    }
    if (!parsed.token) return null;
    return { apiUrl: envApiUrl ?? savedApiUrl ?? DEFAULT_API_URL, token: parsed.token };
  } catch {
    if (envToken) {
      return { apiUrl: envApiUrl ?? DEFAULT_API_URL, token: envToken };
    }
    return null;
  }
}

export async function saveCredentials(creds: StoredCredentials): Promise<string> {
  const path = configPath();
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(creds, null, 2)}\n`, { mode: 0o600 });
  await chmod(path, 0o600);
  return path;
}

export async function clearCredentials(): Promise<void> {
  await rm(configPath(), { force: true });
}
