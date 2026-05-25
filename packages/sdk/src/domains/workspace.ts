import { qs } from "../http";
import type { JsonRecord, RequestFn } from "./_request";

export interface CreateTeamSpaceInput {
  name: string;
  description?: string | null;
  memberIds?: string[];
}

export interface CreateNodeInput {
  teamSpaceId: string;
  parentNodeId?: string | null;
  kind: string;
  name: string;
  position?: number | null;
}

export interface CreateArtifactInput {
  teamSpaceId: string;
  parentNodeId?: string | null;
  type: string;
  title: string;
  bodyMd?: string | null;
  metadata?: JsonRecord;
  position?: number | null;
}

export interface UpdateArtifactInput {
  title?: string;
  summary?: string;
  metadataPatch?: JsonRecord;
}

export interface CreateArtifactVersionInput {
  bodyMd: string;
  metadata?: JsonRecord;
  authorKind: string;
  authorId?: string | null;
}

export interface WorkspaceApi {
  teamSpaces(): Promise<JsonRecord[]>;
  teamSpace(id: string): Promise<JsonRecord>;
  createTeamSpace(input: CreateTeamSpaceInput): Promise<JsonRecord>;
  tree(teamSpaceId: string): Promise<JsonRecord[]>;
  node(id: string): Promise<JsonRecord>;
  createNode(input: CreateNodeInput): Promise<JsonRecord>;
  moveNode(
    id: string,
    input: { parentNodeId?: string | null; position?: number | null },
  ): Promise<JsonRecord>;
  artifact(id: string): Promise<JsonRecord>;
  resolveArtifact(id: string): Promise<JsonRecord>;
  createArtifact(input: CreateArtifactInput): Promise<JsonRecord>;
  updateArtifact(id: string, input: UpdateArtifactInput): Promise<JsonRecord>;
  artifactVersions(id: string): Promise<JsonRecord[]>;
  createArtifactVersion(id: string, input: CreateArtifactVersionInput): Promise<JsonRecord>;
}

export function createWorkspaceApi(req: RequestFn): WorkspaceApi {
  return {
    teamSpaces: () =>
      req<{ teamSpaces: JsonRecord[] }>("GET", "/workspace/team-spaces").then((d) => d.teamSpaces),
    teamSpace: (id) => req("GET", `/workspace/team-spaces/${encodeURIComponent(id)}`),
    createTeamSpace: (input) => req("POST", "/workspace/team-spaces", input),
    tree: (teamSpaceId) =>
      req<{ nodes: JsonRecord[] }>("GET", `/workspace/tree?${qs({ teamSpaceId })}`).then(
        (d) => d.nodes,
      ),
    node: (id) => req("GET", `/workspace/nodes/${encodeURIComponent(id)}`),
    createNode: (input) => req("POST", "/workspace/nodes", input),
    moveNode: (id, input) => req("POST", `/workspace/nodes/${encodeURIComponent(id)}/move`, input),
    artifact: (id) => req("GET", `/workspace/artifacts/${encodeURIComponent(id)}`),
    resolveArtifact: (id) => req("GET", `/workspace/artifacts/${encodeURIComponent(id)}/resolve`),
    createArtifact: (input) => req("POST", "/workspace/artifacts", input),
    updateArtifact: (id, input) =>
      req("PATCH", `/workspace/artifacts/${encodeURIComponent(id)}`, input),
    artifactVersions: (id) =>
      req<{ versions: JsonRecord[] }>(
        "GET",
        `/workspace/artifacts/${encodeURIComponent(id)}/versions`,
      ).then((d) => d.versions),
    createArtifactVersion: (id, input) =>
      req("POST", `/workspace/artifacts/${encodeURIComponent(id)}/versions`, input),
  };
}
