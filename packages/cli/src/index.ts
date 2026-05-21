#!/usr/bin/env bun
import { Command } from "commander";
import { registerAuth } from "./commands/auth";
import { registerGet } from "./commands/get";
import { registerList } from "./commands/list";
import { registerSearch } from "./commands/search";
import { registerStatus } from "./commands/status";
import { registerWrite } from "./commands/write";
import { fail } from "./output";

const VERSION = "0.1.0";

const program = new Command();
program
  .name("unison")
  .description("Unison brain — your cloud knowledge base, in any coding agent")
  .version(VERSION);

registerAuth(program);
registerSearch(program);
registerGet(program);
registerWrite(program);
registerList(program);
registerStatus(program);

program.parseAsync(process.argv).catch((err: unknown) => {
  fail(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
