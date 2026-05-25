// Shared request signature for the per-domain API factories. The BrainClient
// passes its private transport in, so each domain module stays a thin mapping of
// method → `/v1/<domain>/...` route. Outputs are pass-throughs of the server's
// tRPC results (typed loosely as JsonRecord here); inputs are typed precisely.

export type JsonRecord = Record<string, unknown>;

export type RequestFn = <T>(method: string, path: string, body?: unknown) => Promise<T>;
