import { BrainError } from "./errors";

export const API_VERSION = "v1";

export function stripTrailingSlash(url: string): string {
  return url.replace(/\/+$/, "");
}

export async function parseResponse<T>(res: Response): Promise<T> {
  if (res.ok) {
    return (await res.json()) as T;
  }

  let code = "http_error";
  let message = res.statusText || `Request failed with status ${res.status}`;
  try {
    const data = (await res.json()) as { error?: { code?: string; message?: string } };
    if (data.error?.code) code = data.error.code;
    if (data.error?.message) message = data.error.message;
  } catch {
    // Non-JSON error body; keep the status-based defaults.
  }

  throw new BrainError(code, message, res.status);
}
