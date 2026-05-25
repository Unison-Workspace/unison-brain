import type { Command } from "commander";
import { requireClient } from "../client-factory";
import { printJson } from "../output";

export function registerWorkspace(program: Command): void {
  const work = program.command("work").description("Workspace — team spaces, nodes, artifacts");

  work
    .command("team-spaces")
    .description("List team spaces")
    .action(async () => {
      const c = await requireClient();
      printJson(await c.workspace.teamSpaces());
    });

  work
    .command("team-space <id>")
    .description("Get a team space")
    .action(async (id: string) => {
      const c = await requireClient();
      printJson(await c.workspace.teamSpace(id));
    });

  work
    .command("create-team-space")
    .description("Create a team space")
    .requiredOption("--name <name>")
    .option("--description <text>")
    .action(async (o) => {
      const c = await requireClient();
      printJson(await c.workspace.createTeamSpace({ name: o.name, description: o.description }));
    });

  work
    .command("tree")
    .description("List nodes in a team space")
    .requiredOption("--team-space <id>")
    .action(async (o) => {
      const c = await requireClient();
      printJson(await c.workspace.tree(o.teamSpace));
    });

  work
    .command("node <id>")
    .description("Get a node")
    .action(async (id: string) => {
      const c = await requireClient();
      printJson(await c.workspace.node(id));
    });

  work
    .command("artifact <id>")
    .description("Get an artifact (add --resolve for nodes + backings)")
    .option("--resolve")
    .action(async (id: string, o) => {
      const c = await requireClient();
      printJson(o.resolve ? await c.workspace.resolveArtifact(id) : await c.workspace.artifact(id));
    });

  work
    .command("create-artifact")
    .description("Create an artifact")
    .requiredOption("--team-space <id>")
    .requiredOption("--type <type>")
    .requiredOption("--title <title>")
    .option("--parent <nodeId>")
    .option("--body <md>")
    .action(async (o) => {
      const c = await requireClient();
      printJson(
        await c.workspace.createArtifact({
          teamSpaceId: o.teamSpace,
          type: o.type,
          title: o.title,
          parentNodeId: o.parent,
          bodyMd: o.body,
        }),
      );
    });

  work
    .command("artifact-versions <id>")
    .description("List artifact versions")
    .action(async (id: string) => {
      const c = await requireClient();
      printJson(await c.workspace.artifactVersions(id));
    });
}
