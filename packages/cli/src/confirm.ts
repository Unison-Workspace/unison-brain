import { createInterface } from "node:readline";
import { fail } from "./output";

/**
 * Guard a destructive action.
 * - `--yes` → proceed.
 * - interactive TTY → prompt y/N.
 * - non-interactive (agent / CI) without `--yes` → refuse, so a piped command
 *   can never silently delete. The caller should pass `--yes` on purpose.
 */
export async function confirmDestructive(action: string, yes: boolean): Promise<boolean> {
  if (yes) return true;
  if (!process.stdin.isTTY) {
    // Exit nonzero so scripts/agents see a real failure, not a silent no-op
    // that looks like success.
    fail(`Refusing to ${action} in a non-interactive shell. Pass --yes to proceed.`);
    process.exit(1);
  }
  const rl = createInterface({ input: process.stdin, output: process.stderr });
  const answer = await new Promise<string>((resolve) => {
    rl.question(`${action}? [y/N] `, (a) => {
      rl.close();
      resolve(a);
    });
  });
  return answer.trim().toLowerCase() === "y" || answer.trim().toLowerCase() === "yes";
}
