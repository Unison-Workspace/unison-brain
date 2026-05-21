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
    fail(`Refusing to ${action} in a non-interactive shell. Pass --yes to proceed.`);
    return false;
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
