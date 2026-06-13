import { chmod, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join } from "node:path";

export interface StoredCredentials {
  apiUrl: string;
  token: string;
}

/**
 * The on-disk config shape. Versioned to allow future migrations.
 *
 * `workspaceKeys` holds previously-used keys per (apiUrl, workspaceId) pair so
 * `unison switch` can swap back to a workspace without re-minting a key:
 *
 *   workspaceKeys: {
 *     "<apiUrl>": {
 *       "<workspaceId>": "<usk_...>"
 *     }
 *   }
 */
export interface ConfigFile {
  apiUrl?: string;
  token?: string;
  /** Per-apiUrl → per-workspaceId key cache. Used by `unison switch` for instant re-switch. */
  workspaceKeys?: Record<string, Record<string, string>>;
}

// Override anytime with the UNISON_API_URL / UNISON_APP_URL env vars or `unison auth login --api-url`.
const DEFAULT_API_URL = "https://brain.unisonlabs.ai";
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

async function readConfigFile(): Promise<ConfigFile> {
  try {
    const raw = await readFile(configPath(), "utf8");
    return JSON.parse(raw) as ConfigFile;
  } catch {
    return {};
  }
}

async function writeConfigFile(cfg: ConfigFile): Promise<string> {
  const path = configPath();
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(cfg, null, 2)}\n`, { mode: 0o600 });
  await chmod(path, 0o600);
  return path;
}

export async function loadCredentials(): Promise<StoredCredentials | null> {
  // Resolution order for apiUrl: UNISON_API_URL env > saved config apiUrl > default.
  // UNISON_TOKEN env overrides the stored token but still respects the saved apiUrl.
  const envToken = process.env.UNISON_TOKEN;
  const envApiUrl = process.env.UNISON_API_URL;

  const parsed = await readConfigFile();
  const savedApiUrl = parsed.apiUrl;

  if (envToken) {
    return { apiUrl: envApiUrl ?? savedApiUrl ?? DEFAULT_API_URL, token: envToken };
  }
  if (!parsed.token) return null;
  return { apiUrl: envApiUrl ?? savedApiUrl ?? DEFAULT_API_URL, token: parsed.token };
}

export async function saveCredentials(creds: StoredCredentials): Promise<string> {
  const existing = await readConfigFile();
  return writeConfigFile({ ...existing, apiUrl: creds.apiUrl, token: creds.token });
}

export async function clearCredentials(): Promise<void> {
  await rm(configPath(), { force: true });
}

/** Cache a key for a specific (apiUrl, workspaceId) pair so `switch` is instant later. */
export async function saveWorkspaceKey(
  apiUrl: string,
  workspaceId: string,
  token: string,
): Promise<void> {
  const cfg = await readConfigFile();
  const workspaceKeys = cfg.workspaceKeys ?? {};
  workspaceKeys[apiUrl] = { ...(workspaceKeys[apiUrl] ?? {}), [workspaceId]: token };
  await writeConfigFile({ ...cfg, workspaceKeys });
}

/** Retrieve a cached key for a (apiUrl, workspaceId) pair, or null if not cached. */
export async function loadWorkspaceKey(
  apiUrl: string,
  workspaceId: string,
): Promise<string | null> {
  const cfg = await readConfigFile();
  return cfg.workspaceKeys?.[apiUrl]?.[workspaceId] ?? null;
}
