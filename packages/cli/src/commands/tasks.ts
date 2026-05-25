import type { Command } from "commander";
import { requireClient } from "../client-factory";
import { printJson } from "../output";

export function registerTasks(program: Command): void {
  const tasks = program.command("tasks").description("Tasks — boards, projects, comments");

  tasks
    .command("list")
    .description("List tasks")
    .option("--project <id>")
    .option("--board <id>")
    .option("--assignee <id>")
    .option("--search <q>")
    .option("--limit <n>")
    .action(async (o) => {
      const c = await requireClient();
      printJson(
        await c.tasks.list({
          projectId: o.project,
          taskBoardId: o.board,
          assigneeId: o.assignee,
          search: o.search,
          limit: o.limit ? Number(o.limit) : undefined,
        }),
      );
    });

  tasks
    .command("search <query...>")
    .description("Full-text task search")
    .option("--limit <n>")
    .action(async (q: string[], o) => {
      const c = await requireClient();
      printJson(await c.tasks.search(q.join(" "), o.limit ? Number(o.limit) : undefined));
    });

  tasks
    .command("get <id>")
    .description("Get a task by id")
    .action(async (id: string) => {
      const c = await requireClient();
      printJson(await c.tasks.get(id));
    });

  tasks
    .command("create")
    .description("Create a task")
    .requiredOption("--title <title>")
    .option("--description <text>")
    .option("--project <id>")
    .option("--board <id>")
    .option("--priority <p>")
    .option("--assignee <id>")
    .option("--due <date>")
    .action(async (o) => {
      const c = await requireClient();
      printJson(
        await c.tasks.create({
          title: o.title,
          description: o.description,
          projectId: o.project,
          taskBoardId: o.board,
          priority: o.priority,
          assigneeId: o.assignee,
          dueDate: o.due,
        }),
      );
    });

  tasks
    .command("update <id>")
    .description("Update a task")
    .option("--title <title>")
    .option("--status <status>")
    .option("--priority <p>")
    .option("--assignee <id>")
    .option("--due <date>")
    .action(async (id: string, o) => {
      const c = await requireClient();
      printJson(
        await c.tasks.update(id, {
          title: o.title,
          status: o.status,
          priority: o.priority,
          assigneeId: o.assignee,
          dueDate: o.due,
        }),
      );
    });

  tasks
    .command("rm <id>")
    .description("Delete a task")
    .action(async (id: string) => {
      const c = await requireClient();
      printJson(await c.tasks.remove(id));
    });

  tasks
    .command("projects")
    .description("List projects")
    .option("--status <status>", "active | archived | all")
    .action(async (o) => {
      const c = await requireClient();
      printJson(await c.tasks.projects(o.status));
    });
}
