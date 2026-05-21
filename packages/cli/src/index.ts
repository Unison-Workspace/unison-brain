#!/usr/bin/env node
import { BrainError } from "@unison/sdk";
import { Command } from "commander";
import { registerAuth } from "./commands/auth";
import { registerCompletion } from "./commands/completion";
import { registerDocs } from "./commands/docs";
import { registerEntity } from "./commands/entity";
import { registerFact } from "./commands/fact";
import { registerGet } from "./commands/get";
import { registerJobs } from "./commands/jobs";
import { registerList } from "./commands/list";
import { registerReview } from "./commands/review";
import { registerSearch } from "./commands/search";
import { registerSkill } from "./commands/skill";
import { registerStatus } from "./commands/status";
import { registerWrite } from "./commands/write";
import { fail, info } from "./output";

const VERSION = "0.1.0";

const program = new Command();
program
  .name("unison")
  .description("Unison brain — your cloud knowledge base, in any coding agent")
  .version(VERSION)
  .showSuggestionAfterError();

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
// Setup
registerSkill(program);
registerCompletion(program);

/** Turn an API error into a clear message plus a next-step hint. */
function reportError(err: unknown): void {
  if (err instanceof BrainError) {
    fail(err.message);
    if (err.status === 401) info("→ Run `unison auth login` to sign in.");
    else if (err.status === 403)
      info("→ Your key lacks the required scope (read / write / admin).");
    else if (err.status === 404) info("→ Nothing found at that path or id.");
    else if (err.status === 429) info("→ Rate limited. Wait a moment and retry.");
    else if (err.status >= 500) info("→ The brain API had an error. Try again shortly.");
    return;
  }
  fail(err instanceof Error ? err.message : String(err));
}

program.parseAsync(process.argv).catch((err: unknown) => {
  reportError(err);
  process.exit(1);
});
