#!/usr/bin/env bun
import { Command } from "commander";
import { registerAuth } from "./commands/auth";
import { registerDocs } from "./commands/docs";
import { registerEntity } from "./commands/entity";
import { registerFact } from "./commands/fact";
import { registerGet } from "./commands/get";
import { registerJobs } from "./commands/jobs";
import { registerList } from "./commands/list";
import { registerReview } from "./commands/review";
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

// Auth
registerAuth(program);
// Documents
registerSearch(program);
registerGet(program);
registerWrite(program);
registerList(program);
registerDocs(program);
// Graph
registerEntity(program);
registerFact(program);
// Admin
registerReview(program);
registerJobs(program);
// Status
registerStatus(program);

program.parseAsync(process.argv).catch((err: unknown) => {
  fail(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
