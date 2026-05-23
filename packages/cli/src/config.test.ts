import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { clearCredentials, loadCredentials, saveCredentials } from "./config";

let dir: string;
const origXdg = process.env.XDG_CONFIG_HOME;
const origToken = process.env.UNISON_TOKEN;

// Env vars must be unset with `delete` — assigning `undefined` stores the
// literal string "undefined".
function setEnv(key: string, value: string | undefined): void {
  if (value === undefined) {
    delete process.env[key];
  } else {
    process.env[key] = value;
  }
}

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "unison-test-"));
  setEnv("XDG_CONFIG_HOME", dir);
  setEnv("UNISON_TOKEN", undefined);
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
  setEnv("XDG_CONFIG_HOME", origXdg);
  setEnv("UNISON_TOKEN", origToken);
});

describe("credentials", () => {
  test("returns null when nothing is stored", async () => {
    expect(await loadCredentials()).toBeNull();
  });

  test("round-trips saved credentials", async () => {
    await saveCredentials({ apiUrl: "https://api.test", token: "secret" });
    const creds = await loadCredentials();
    expect(creds?.token).toBe("secret");
    expect(creds?.apiUrl).toBe("https://api.test");
  });

  test("env token overrides the stored file", async () => {
    await saveCredentials({ apiUrl: "https://api.test", token: "filetoken" });
    process.env.UNISON_TOKEN = "envtoken";
    const creds = await loadCredentials();
    expect(creds?.token).toBe("envtoken");
  });

  test("clear removes stored credentials", async () => {
    await saveCredentials({ apiUrl: "https://api.test", token: "secret" });
    await clearCredentials();
    expect(await loadCredentials()).toBeNull();
  });
});
