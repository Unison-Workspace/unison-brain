import { hostname } from "node:os";
import { BrainClient, createKey, listWorkspaces } from "@unisonlabs/sdk";
import type { Command } from "commander";
import { loadCredentials, loadWorkspaceKey, saveCredentials, saveWorkspaceKey } from "../config";
import { fail, info, printJson, success } from "../output";

export function registerWorkspaces(program: Command): void {
  // ── unison workspaces ls ─────────────────────────────────────────────────────

  const workspaces = program.command("workspaces").description("Manage workspace memberships");

  workspaces
    .command("ls", { isDefault: true })
    .description("List workspaces you are a member of")
    .option("--json", "Output JSON")
    .action(async (opts: { json?: boolean }) => {
      const creds = await loadCredentials();
      if (!creds) {
        fail("Not authenticated. Run `unison auth login`.");
        process.exit(1);
      }
      const rows = await listWorkspaces(creds.apiUrl, creds.token);
      if (opts.json) {
        printJson(rows);
        return;
      }
      if (rows.length === 0) {
        info("No workspace memberships found.");
        return;
      }
      const pad = (s: string, n: number) => s.slice(0, n).padEnd(n);
      info([pad("ID", 36), pad("NAME", 24), pad("ROLE", 10), "ACTIVE"].join("  "));
      info("-".repeat(80));
      for (const t of rows) {
        info(
          [
            pad(t.id, 36),
            pad(t.name ?? "(unnamed)", 24),
            pad(t.role, 10),
            t.active ? "✓" : "",
          ].join("  "),
        );
      }
    });
}

// ── unison switch ─────────────────────────────────────────────────────────────

export function registerSwitch(program: Command): void {
  program
    .command("switch <workspaceIdOrName>")
    .description(
      "Switch the active workspace. Resolves by id prefix or unique name match, mints (or recalls) a key for that workspace, and stores it as the new default credential.",
    )
    .option("--json", "Output JSON")
    .action(async (workspaceIdOrName: string, opts: { json?: boolean }) => {
      const creds = await loadCredentials();
      if (!creds) {
        fail("Not authenticated. Run `unison auth login`.");
        process.exit(1);
      }

      // 1. Resolve the workspace from the membership list.
      const rows = await listWorkspaces(creds.apiUrl, creds.token);
      if (rows.length === 0) {
        fail("No workspace memberships found.");
        process.exit(1);
      }

      // Try id prefix first, then exact/unique name match.
      let match = rows.find((t) => t.id === workspaceIdOrName);
      if (!match) match = rows.find((t) => t.id.startsWith(workspaceIdOrName));
      if (!match) {
        const byName = rows.filter(
          (t) => (t.name ?? "").toLowerCase() === workspaceIdOrName.toLowerCase(),
        );
        if (byName.length === 1) {
          match = byName[0];
        } else if (byName.length > 1) {
          fail(
            `Ambiguous name "${workspaceIdOrName}" matches multiple workspaces: ${byName.map((t) => t.id).join(", ")}. Use the workspace id instead.`,
          );
          process.exit(1);
        }
      }
      if (!match) {
        fail(
          `Workspace "${workspaceIdOrName}" not found. Run \`unison workspaces ls\` to see your memberships.`,
        );
        process.exit(1);
      }

      const targetWorkspace = match;

      // 2. Check cache — re-use a previously-minted key if available.
      const cached = await loadWorkspaceKey(creds.apiUrl, targetWorkspace.id);
      let newToken: string;

      if (cached) {
        newToken = cached;
      } else {
        // 3. Mint a new key scoped to the target workspace.
        const keyRes = await createKey(creds.apiUrl, creds.token, {
          name: `cli ${hostname()}`,
          workspaceId: targetWorkspace.id,
        });
        newToken = keyRes.token;
        // Cache it for future switches.
        await saveWorkspaceKey(creds.apiUrl, targetWorkspace.id, newToken);
      }

      // 4. Store the new key as the active credential, also cache the old one.
      // Verify the old token belongs to a workspace we can recover.
      const me = await new BrainClient({
        apiUrl: creds.apiUrl,
        token: creds.token,
      }).whoami();
      await saveWorkspaceKey(creds.apiUrl, me.workspace.id, creds.token);

      await saveCredentials({ apiUrl: creds.apiUrl, token: newToken });

      // 5. Whoami with new key to confirm.
      const after = await new BrainClient({
        apiUrl: creds.apiUrl,
        token: newToken,
      }).whoami();

      if (opts.json) {
        printJson({ switched: true, workspace: after.workspace, role: targetWorkspace.role });
        return;
      }
      success(
        `Switched to workspace ${after.workspace.name ?? after.workspace.id} (${targetWorkspace.role})${cached ? " — recalled from cache" : " — minted new key"}.`,
      );
      info(`  workspace id: ${after.workspace.id}`);
    });
}
