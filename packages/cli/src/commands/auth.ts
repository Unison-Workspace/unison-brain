import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import {
  BrainClient,
  buildAuthorizeUrl,
  exchangeCode,
  generatePkce,
  pollDeviceToken,
  provisionAccount,
  randomState,
  requestKey,
  startDeviceAuth,
  verifyEmail,
} from "@unisonlabs/sdk";
import type { Command } from "commander";
import open from "open";
import {
  clearCredentials,
  defaultApiUrl,
  defaultAppUrl,
  loadCredentials,
  saveCredentials,
} from "../config";
import { fail, info, printJson, success } from "../output";
import { readStdin } from "../stdin";

const SCOPES = [
  "brain:read",
  "brain:write",
  "brain:admin",
  "work:read",
  "work:write",
  "chat:read",
  "chat:write",
  "agent:run",
];
const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

function resultPage(title: string, detail: string): string {
  return `<!doctype html><meta charset="utf-8"><title>${title}</title><body style="font:16px system-ui;margin:4rem auto;max-width:28rem;text-align:center"><h1>${title}</h1><p>${detail}</p></body>`;
}

/** Primary login: open the browser, catch the redirect on a throwaway loopback. */
async function loopbackLogin(apiUrl: string, appUrl: string): Promise<string> {
  const { verifier, challenge } = await generatePkce();
  const state = randomState();

  return new Promise<string>((resolve, reject) => {
    const server = createServer(async (httpReq, httpRes) => {
      const reqUrl = new URL(httpReq.url ?? "/", "http://127.0.0.1");
      if (reqUrl.pathname !== "/callback") {
        httpRes.writeHead(404).end();
        return;
      }
      const code = reqUrl.searchParams.get("code");
      const returnedState = reqUrl.searchParams.get("state");
      const port = (server.address() as AddressInfo).port;
      try {
        if (!code || returnedState !== state) {
          throw new Error("Invalid authorization response (state mismatch).");
        }
        const token = await exchangeCode(apiUrl, {
          code,
          verifier,
          redirectUri: `http://127.0.0.1:${port}/callback`,
        });
        httpRes
          .writeHead(200, { "content-type": "text/html" })
          .end(
            resultPage("Authenticated ✓", "You can close this tab and return to your terminal."),
          );
        server.close();
        resolve(token.accessToken);
      } catch (err) {
        httpRes
          .writeHead(400, { "content-type": "text/html" })
          .end(resultPage("Authentication failed", "Return to your terminal and try again."));
        server.close();
        reject(err);
      }
    });

    server.on("error", reject);
    server.listen(0, "127.0.0.1", async () => {
      const port = (server.address() as AddressInfo).port;
      const url = buildAuthorizeUrl(appUrl, {
        redirectUri: `http://127.0.0.1:${port}/callback`,
        codeChallenge: challenge,
        state,
        scopes: SCOPES,
      });
      info("\n  Opening your browser to sign in…");
      info(`  If it doesn't open, paste this URL:\n  ${url}\n`);
      await open(url).catch(() => {
        info("  (Could not open a browser. Use --device on a headless machine.)");
      });
    });

    // unref so a completed login lets the process exit immediately rather than
    // waiting out this 5-minute deadline (the timer no longer holds the loop open).
    const timer = setTimeout(
      () => {
        server.close();
        reject(new Error("Timed out waiting for browser login."));
      },
      5 * 60 * 1000,
    );
    timer.unref();
  });
}

/** Fallback login: device flow for SSH / headless boxes. */
async function deviceLogin(apiUrl: string): Promise<string> {
  const device = await startDeviceAuth(apiUrl, { scopes: SCOPES });
  info("");
  info(`  Enter this code:   ${device.userCode}`);
  info(`  At:                ${device.verificationUriComplete}`);
  info("");
  await open(device.verificationUriComplete).catch(() => {});

  const deadline = Date.now() + device.expiresIn * 1000;
  let waitMs = Math.max(device.interval, 1) * 1000;
  while (Date.now() < deadline) {
    await sleep(waitMs);
    const result = await pollDeviceToken(apiUrl, device.deviceCode);
    if (result.status === "complete" && result.token) return result.token.accessToken;
    if (result.status === "denied") throw new Error("Authorization was denied.");
    if (result.status === "expired") throw new Error("The code expired. Run login again.");
    if (result.status === "slow_down") waitMs += 5000;
  }
  throw new Error("Timed out waiting for authorization.");
}

export function registerAuth(program: Command): void {
  const auth = program.command("auth").description("Manage authentication");

  auth
    .command("login")
    .description("Sign in (opens your browser)")
    .option("--api-url <url>", "API base URL", defaultApiUrl())
    .option("--app-url <url>", "Dashboard URL for the sign-in page", defaultAppUrl())
    .option("--device", "Use the device-code flow (SSH / headless, no browser)")
    .option("--with-token", "Read an API key from stdin (CI)")
    .action(
      async (opts: { apiUrl: string; appUrl: string; device?: boolean; withToken?: boolean }) => {
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

        const token = opts.device
          ? await deviceLogin(apiUrl)
          : await loopbackLogin(apiUrl, opts.appUrl);
        await saveCredentials({ apiUrl, token });
        success("Authenticated.");
      },
    );

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

  // Headless account creation — no browser, no dashboard. Creates an account for
  // the given email and stores the returned (unverified) key. Verify with
  // `unison auth verify` to lift the free-tier caps and make it durable.
  auth
    .command("provision")
    .description("Create an account headlessly (no browser) and store its key")
    .requiredOption("--email <email>", "Email to anchor the account to")
    .option("--api-url <url>", "API base URL", defaultApiUrl())
    .option("--json", "Output JSON")
    .action(async (opts: { email: string; apiUrl: string; json?: boolean }) => {
      const res = await provisionAccount(opts.apiUrl, { email: opts.email });
      await saveCredentials({ apiUrl: opts.apiUrl, token: res.apiKey });
      if (opts.json) {
        printJson({ apiUrl: opts.apiUrl, tenantId: res.tenantId, status: res.status });
        return;
      }
      success("Account created and key stored.");
      info(`  tenant: ${res.tenantId}`);
      info(`  status: ${res.status}`);
      info(
        `  next:   verify the code emailed to ${opts.email} via \`unison auth verify --email ${opts.email} --code <code>\``,
      );
    });

  // Verify the emailed code. For a provision code this makes the account durable;
  // for a recovery code it stores the freshly minted key.
  auth
    .command("verify")
    .description("Verify the code emailed during provision / key recovery")
    .requiredOption("--email <email>", "The account email")
    .requiredOption("--code <code>", "The verification code from the email")
    .option("--api-url <url>", "API base URL", defaultApiUrl())
    .option("--json", "Output JSON")
    .action(async (opts: { email: string; code: string; apiUrl: string; json?: boolean }) => {
      const res = await verifyEmail(opts.apiUrl, { email: opts.email, code: opts.code });
      if (res.apiKey) await saveCredentials({ apiUrl: opts.apiUrl, token: res.apiKey });
      if (opts.json) {
        printJson(res);
        return;
      }
      success(res.verified ? "Verified." : "Not verified.");
      if (res.apiKey) info("  A new key was issued and stored.");
    });

  // Recover access on a new machine / after losing a key. Emails a recovery code
  // for an existing verified account; complete it with `unison auth verify`.
  auth
    .command("request-key")
    .description("Email a recovery code for an existing account (lost key)")
    .requiredOption("--email <email>", "The account email")
    .option("--api-url <url>", "API base URL", defaultApiUrl())
    .action(async (opts: { email: string; apiUrl: string }) => {
      await requestKey(opts.apiUrl, { email: opts.email });
      success("If that account exists, a recovery code was emailed.");
      info(`  Complete it with \`unison auth verify --email ${opts.email} --code <code>\``);
    });
}
