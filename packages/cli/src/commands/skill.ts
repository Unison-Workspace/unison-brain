import { mkdir, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import type { Command } from "commander";
import { info, success } from "../output";
import { REFERENCE_MD, SKILL_MD } from "../skill-content";

export function registerSkill(program: Command): void {
  const skill = program.command("skill").description("Manage the Unison brain agent skill");

  skill
    .command("install")
    .description("Install the SKILL.md into your agent's skills directory")
    .option("--dir <path>", "Skills directory", join(homedir(), ".claude", "skills"))
    .action(async (opts: { dir: string }) => {
      const target = join(opts.dir, "unison-brain", "SKILL.md");
      await mkdir(dirname(target), { recursive: true });
      await writeFile(target, SKILL_MD, "utf8");
      await writeFile(join(dirname(target), "reference.md"), REFERENCE_MD, "utf8");
      success(`Installed skill to ${dirname(target)} (SKILL.md + reference.md)`);
      info("Reload your agent's skills (or restart it) to pick it up.");
    });

  skill
    .command("print")
    .description("Print the SKILL.md to stdout")
    .option("--reference", "Print the command reference instead")
    .action((opts: { reference?: boolean }) => {
      process.stdout.write(opts.reference ? REFERENCE_MD : SKILL_MD);
    });
}
