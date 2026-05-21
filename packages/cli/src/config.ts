import { chmod, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join } from "node:path";

export interface StoredCredentials {
  apiUrl: string;
  token: string;
}

// TODO: point at the production API once the brain endpoints ship. Override
// anytime with the UNISON_API_URL env var or `unison auth login --api-url`.
const DEFAULT_API_URL = "https://api.unison.computer";

export function configPath(): string {
  const base = process.env.XDG_CONFIG_HOME ?? join(homedir(), ".config");
  return join(base, "unison", "config.json");
}

export function defaultApiUrl(): string {
  return process.env.UNISON_API_URL ?? DEFAULT_API_URL;
}

export async function loadCredentials(): Promise<StoredCredentials | null> {
  // Env override always wins — this is the path CI and headless agents use.
  const envToken = process.env.UNISON_TOKEN;
  if (envToken) {
    return { apiUrl: defaultApiUrl(), token: envToken };
  }

  try {
    const raw = await readFile(configPath(), "utf8");
    const parsed = JSON.parse(raw) as Partial<StoredCredentials>;
    if (!parsed.token) return null;
    return { apiUrl: parsed.apiUrl ?? defaultApiUrl(), token: parsed.token };
  } catch {
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
