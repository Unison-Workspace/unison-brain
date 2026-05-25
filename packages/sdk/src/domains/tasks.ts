import { qs } from "../http";
import type { JsonRecord, RequestFn } from "./_request";

export interface TaskListOptions {
  projectId?: string;
  taskBoardId?: string;
  workspaceArtifactId?: string;
  assigneeId?: string;
  parentTaskId?: string;
  includeSubtasks?: boolean;
  search?: string;
  sort?: "position" | "my_tasks" | "created_at" | "priority" | "due_date";
  dueBefore?: string;
  dueAfter?: string;
  limit?: number;
}

export interface TaskCreateInput {
  title: string;
  description?: string | null;
  projectId?: string;
  taskBoardId?: string;
  workspaceArtifactId?: string;
  groupId?: string | null;
  parentTaskId?: string | null;
  status?: string;
  priority?: string;
  assigneeId?: string | null;
  dueDate?: string | null;
}

export interface TaskUpdatePatch {
  title?: string;
  description?: string | null;
  status?: string;
  priority?: string;
  assigneeId?: string | null;
  dueDate?: string | null;
  projectId?: string;
  taskBoardId?: string;
  workspaceArtifactId?: string;
}

export interface TasksApi {
  list(opts?: TaskListOptions): Promise<JsonRecord[]>;
  search(query: string, limit?: number): Promise<JsonRecord>;
  get(id: string): Promise<JsonRecord>;
  create(input: TaskCreateInput): Promise<JsonRecord>;
  update(id: string, patch: TaskUpdatePatch): Promise<JsonRecord>;
  remove(id: string): Promise<JsonRecord>;
  board(opts: { taskBoardId?: string; workspaceArtifactId?: string }): Promise<JsonRecord>;
  projects(status?: "active" | "archived" | "all"): Promise<JsonRecord[]>;
  createProject(input: JsonRecord): Promise<JsonRecord>;
  comments(target: { taskId?: string; projectId?: string }): Promise<JsonRecord[]>;
  createComment(input: JsonRecord): Promise<JsonRecord>;
}

export function createTasksApi(req: RequestFn): TasksApi {
  return {
    list: (o = {}) =>
      req<{ tasks: JsonRecord[] }>("GET", `/tasks?${qs({ ...o })}`).then((d) => d.tasks),
    search: (query, limit) => req("GET", `/tasks/search?${qs({ q: query, limit })}`),
    get: (id) => req("GET", `/tasks/${encodeURIComponent(id)}`),
    create: (input) => req("POST", "/tasks", input),
    update: (id, patch) => req("PATCH", `/tasks/${encodeURIComponent(id)}`, patch),
    remove: (id) => req("DELETE", `/tasks/${encodeURIComponent(id)}`),
    board: (o) => req("GET", `/tasks/boards?${qs({ ...o })}`),
    projects: (status) =>
      req<{ projects: JsonRecord[] }>("GET", `/tasks/projects?${qs({ status })}`).then(
        (d) => d.projects,
      ),
    createProject: (input) => req("POST", "/tasks/projects", input),
    comments: (t) =>
      req<{ comments: JsonRecord[] }>("GET", `/tasks/comments?${qs({ ...t })}`).then(
        (d) => d.comments,
      ),
    createComment: (input) => req("POST", "/tasks/comments", input),
  };
}
