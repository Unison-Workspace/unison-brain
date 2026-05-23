import pc from "picocolors";

/** Primary result data → stdout, so it pipes cleanly and agents can read it. */
export function out(text: string): void {
  process.stdout.write(`${text}\n`);
}

/**
 * Machine-readable data → stdout. Pretty for a TTY (human), compact when piped
 * (agents / scripts) to save tokens. `JSON.stringify` with no spacer is compact.
 */
export function printJson(data: unknown): void {
  const text = process.stdout.isTTY ? JSON.stringify(data, null, 2) : JSON.stringify(data);
  process.stdout.write(`${text}\n`);
}

/** Status / progress chatter → stderr, so it never pollutes piped stdout. */
export function info(msg: string): void {
  process.stderr.write(`${msg}\n`);
}

export function success(msg: string): void {
  process.stderr.write(`${pc.green("✓")} ${msg}\n`);
}

export function fail(msg: string): void {
  process.stderr.write(`${pc.red("✗")} ${msg}\n`);
}
