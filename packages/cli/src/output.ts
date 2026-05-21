import pc from "picocolors";

/** Structured data goes to stdout so it pipes cleanly to jq, agents, etc. */
export function printJson(data: unknown): void {
  process.stdout.write(`${JSON.stringify(data, null, 2)}\n`);
}

/** Human-readable chatter goes to stderr so it never pollutes piped stdout. */
export function info(msg: string): void {
  process.stderr.write(`${msg}\n`);
}

export function success(msg: string): void {
  process.stderr.write(`${pc.green("✓")} ${msg}\n`);
}

export function fail(msg: string): void {
  process.stderr.write(`${pc.red("✗")} ${msg}\n`);
}
