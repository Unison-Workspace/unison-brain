import { BrainClient, pollDeviceToken, startDeviceAuth } from "@unison/sdk";
import type { Command } from "commander";
import open from "open";
import { clearCredentials, defaultApiUrl, loadCredentials, saveCredentials } from "../config";
import { fail, info, printJson, success } from "../output";
import { readStdin } from "../stdin";

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

async function pollUntilAuthorized(
  apiUrl: string,
  deviceCode: string,
  interval: number,
  expiresIn: number,
): Promise<string> {
  const deadline = Date.now() + expiresIn * 1000;
  let waitMs = Math.max(interval, 1) * 1000;

  while (Date.now() < deadline) {
    await sleep(waitMs);
    const result = await pollDeviceToken(apiUrl, deviceCode);
    if (result.status === "complete" && result.token) return result.token.accessToken;
    if (result.status === "denied") throw new Error("Authorization was denied.");
    if (result.status === "expired") {
      throw new Error("The code expired. Run `unison auth login` again.");
    }
    if (result.status === "slow_down") waitMs += 5000;
  }

  throw new Error("Timed out waiting for authorization.");
}

export function registerAuth(program: Command): void {
  const auth = program.command("auth").description("Manage authentication");

  auth
    .command("login")
    .description("Authenticate the CLI with your Unison brain")
    .option("--api-url <url>", "API base URL", defaultApiUrl())
    .option("--with-token", "Read an API key from stdin instead of opening a browser")
    .action(async (opts: { apiUrl: string; withToken?: boolean }) => {
      const apiUrl = opts.apiUrl;

      if (opts.withToken) {
        const token = (await readStdin()).trim();
        if (!token) {
          fail("No token provided on stdin.");
          process.exit(1);
        }
        const path = await saveCredentials({ apiUrl, token });
        success(`Saved API key to ${path}`);
        return;
      }

      const device = await startDeviceAuth(apiUrl);
      info("");
      info(`  First, copy your one-time code:  ${device.userCode}`);
      info(`  Then approve it here:            ${device.verificationUriComplete}`);
      info("");
      await open(device.verificationUriComplete).catch(() => {
        info("(Could not open a browser automatically — open the URL above manually.)");
      });

      const token = await pollUntilAuthorized(
        apiUrl,
        device.deviceCode,
        device.interval,
        device.expiresIn,
      );
      await saveCredentials({ apiUrl, token });
      success("Authenticated.");
    });

  auth
    .command("logout")
    .description("Remove stored credentials")
    .action(async () => {
      await clearCredentials();
      success("Logged out.");
    });

  auth
    .command("status")
    .description("Show the current authentication status")
    .option("--json", "Output JSON")
    .action(async (opts: { json?: boolean }) => {
      const creds = await loadCredentials();
      if (!creds) {
        if (opts.json) printJson({ authenticated: false });
        else fail("Not authenticated. Run `unison auth login`.");
        process.exit(1);
      }

      const client = new BrainClient({ baseUrl: creds.apiUrl, token: creds.token });
      const me = await client.whoami();
      if (opts.json) {
        printJson({ authenticated: true, apiUrl: creds.apiUrl, ...me });
        return;
      }
      success(`Authenticated to ${creds.apiUrl}`);
      info(`  user:   ${me.user.email ?? me.user.id}`);
      info(`  tenant: ${me.tenant.name ?? me.tenant.id}`);
      info(`  scopes: ${me.scopes.join(", ")}`);
    });
}
