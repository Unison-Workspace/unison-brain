import { hostname } from "node:os";
import { BrainClient, createKey, listTenants } from "@unisonlabs/sdk";
import type { Command } from "commander";
import { loadCredentials, loadTenantKey, saveCredentials, saveTenantKey } from "../config";
import { fail, info, printJson, success } from "../output";

export function registerTenants(program: Command): void {
  // ── unison tenants ls ────────────────────────────────────────────────────

  const tenants = program.command("tenants").description("Manage tenant memberships");

  tenants
    .command("ls", { isDefault: true })
    .description("List tenants you are a member of")
    .option("--json", "Output JSON")
    .action(async (opts: { json?: boolean }) => {
      const creds = await loadCredentials();
      if (!creds) {
        fail("Not authenticated. Run `unison auth login`.");
        process.exit(1);
      }
      const rows = await listTenants(creds.apiUrl, creds.token);
      if (opts.json) {
        printJson(rows);
        return;
      }
      if (rows.length === 0) {
        info("No tenant memberships found.");
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
    .command("switch <tenantIdOrName>")
    .description(
      "Switch the active tenant. Resolves by id prefix or unique name match, mints (or recalls) a key for that tenant, and stores it as the new default credential.",
    )
    .option("--json", "Output JSON")
    .action(async (tenantIdOrName: string, opts: { json?: boolean }) => {
      const creds = await loadCredentials();
      if (!creds) {
        fail("Not authenticated. Run `unison auth login`.");
        process.exit(1);
      }

      // 1. Resolve the tenant from the membership list.
      const rows = await listTenants(creds.apiUrl, creds.token);
      if (rows.length === 0) {
        fail("No tenant memberships found.");
        process.exit(1);
      }

      // Try id prefix first, then exact/unique name match.
      let match = rows.find((t) => t.id === tenantIdOrName);
      if (!match) match = rows.find((t) => t.id.startsWith(tenantIdOrName));
      if (!match) {
        const byName = rows.filter(
          (t) => (t.name ?? "").toLowerCase() === tenantIdOrName.toLowerCase(),
        );
        if (byName.length === 1) {
          match = byName[0];
        } else if (byName.length > 1) {
          fail(
            `Ambiguous name "${tenantIdOrName}" matches multiple tenants: ${byName.map((t) => t.id).join(", ")}. Use the tenant id instead.`,
          );
          process.exit(1);
        }
      }
      if (!match) {
        fail(
          `Tenant "${tenantIdOrName}" not found. Run \`unison tenants ls\` to see your memberships.`,
        );
        process.exit(1);
      }

      const targetTenant = match;

      // 2. Check cache — re-use a previously-minted key if available.
      const cached = await loadTenantKey(creds.apiUrl, targetTenant.id);
      let newToken: string;

      if (cached) {
        newToken = cached;
      } else {
        // 3. Mint a new key scoped to the target tenant.
        const keyRes = await createKey(creds.apiUrl, creds.token, {
          name: `cli ${hostname()}`,
          tenantId: targetTenant.id,
        });
        newToken = keyRes.token;
        // Cache it for future switches.
        await saveTenantKey(creds.apiUrl, targetTenant.id, newToken);
      }

      // 4. Store the new key as the active credential, also cache the old one.
      // Verify the old token belongs to a tenant we can recover.
      const me = await new BrainClient({
        apiUrl: creds.apiUrl,
        token: creds.token,
      }).whoami();
      await saveTenantKey(creds.apiUrl, me.tenant.id, creds.token);

      await saveCredentials({ apiUrl: creds.apiUrl, token: newToken });

      // 5. Whoami with new key to confirm.
      const after = await new BrainClient({
        apiUrl: creds.apiUrl,
        token: newToken,
      }).whoami();

      if (opts.json) {
        printJson({ switched: true, tenant: after.tenant, role: targetTenant.role });
        return;
      }
      success(
        `Switched to tenant ${after.tenant.name ?? after.tenant.id} (${targetTenant.role})${cached ? " — recalled from cache" : " — minted new key"}.`,
      );
      info(`  tenant id: ${after.tenant.id}`);
    });
}
