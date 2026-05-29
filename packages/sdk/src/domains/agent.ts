// Streaming client for the server-side agent. POSTs to `/v1/agent` and parses
// the SSE event sequence — `status` while the agent works, `text` deltas as it
// speaks, and a terminal `done` — so callers see live progress. The agent
// itself runs on the backend; this module is purely transport + parsing.

export interface AgentEvent {
  type: "status" | "text" | "done";
  /** Tool name (only on `status` events). */
  tool?: string;
  /** "running" | "done" | "error" (only on `status` events). */
  text?: string;
  /** Streamed assistant text fragment (only on `text` events). */
  delta?: string;
  /** Set on the terminal `done` event. */
  sessionId?: string;
  /** Set on the terminal `done` event. */
  finishReason?: string;
}

export interface AgentRunOptions {
  /** The user's prompt for this turn. */
  message: string;
  /** Override the server's default model (optional). */
  model?: string;
  /** Continue an existing agent session (optional). */
  sessionId?: string;
  /** Fired for every server event as it arrives. */
  onEvent?: (event: AgentEvent) => void;
  /** Aborts the HTTP request mid-stream. */
  signal?: AbortSignal;
}

export interface AgentRunResult {
  sessionId: string;
  /** Full assistant text (concatenated `text` deltas). */
  answer: string;
  finishReason: string;
}

export interface AgentApi {
  /**
   * Run one server-side agent turn. Resolves when the stream closes naturally
   * (terminal `[DONE]` sentinel arrives, or the HTTP body ends). Rejects on a
   * non-2xx response or a network error.
   */
  run(opts: AgentRunOptions): Promise<AgentRunResult>;
}

export interface AgentApiContext {
  baseUrl: string;
  token: string | null | undefined;
  fetchImpl?: typeof fetch;
}

export function createAgentApi(ctx: AgentApiContext): AgentApi {
  const f = ctx.fetchImpl ?? fetch;
  return {
    async run(opts) {
      if (!ctx.token) {
        throw new Error("Not authenticated. Run `unison auth login` first.");
      }
      const url = `${ctx.baseUrl.replace(/\/+$/, "")}/v1/agent`;
      const res = await f(url, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${ctx.token}`,
          accept: "text/event-stream",
        },
        body: JSON.stringify({
          message: opts.message,
          ...(opts.model !== undefined ? { model: opts.model } : {}),
          ...(opts.sessionId !== undefined ? { sessionId: opts.sessionId } : {}),
        }),
        signal: opts.signal,
      });
      if (!res.ok || !res.body) {
        // Surface the structured error envelope when possible so callers see
        // "Missing required scope: agent:run" rather than a bare HTTP code.
        let message = res.statusText || `HTTP ${res.status}`;
        try {
          const body = (await res.json()) as { error?: { code?: string; message?: string } };
          if (body.error?.message) message = body.error.message;
        } catch {
          /* non-JSON body — keep the status text */
        }
        throw new Error(message);
      }
      return parseAgentSse(res.body, opts.onEvent);
    },
  };
}

/**
 * Parse the `/v1/agent` SSE stream. Each event is a `data: <json>` line
 * terminated by a blank line; `data: [DONE]` is the terminal sentinel. Returns
 * the assembled final answer + the session id once the stream ends.
 */
export async function parseAgentSse(
  body: ReadableStream<Uint8Array>,
  onEvent: ((event: AgentEvent) => void) | undefined,
): Promise<AgentRunResult> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let answer = "";
  let sessionId = "";
  let finishReason = "stop";
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      // SSE events are separated by a blank line. Pop complete events from the
      // buffer; keep any partial trailing event.
      // Accept both \n\n (preferred) and \r\n\r\n.
      while (true) {
        const sep = findEventBoundary(buffer);
        if (sep === -1) break;
        const rawEvent = buffer.slice(0, sep.start);
        buffer = buffer.slice(sep.end);
        const data = extractData(rawEvent);
        if (data === null) continue;
        if (data === "[DONE]") return { sessionId, answer, finishReason };
        let event: AgentEvent;
        try {
          event = JSON.parse(data) as AgentEvent;
        } catch {
          continue; // malformed event line — skip rather than abort the stream
        }
        if (event.type === "text" && typeof event.delta === "string") answer += event.delta;
        if (event.type === "done") {
          if (event.sessionId) sessionId = event.sessionId;
          if (event.finishReason) finishReason = event.finishReason;
        }
        onEvent?.(event);
      }
    }
  } finally {
    reader.releaseLock();
  }
  return { sessionId, answer, finishReason };
}

interface Boundary {
  start: number;
  end: number;
}

/** Find the next `\n\n` (or `\r\n\r\n`) event separator in the buffer. */
function findEventBoundary(buffer: string): Boundary | -1 {
  const lf = buffer.indexOf("\n\n");
  const crlf = buffer.indexOf("\r\n\r\n");
  if (lf < 0 && crlf < 0) return -1;
  if (lf < 0) return { start: crlf, end: crlf + 4 };
  if (crlf < 0) return { start: lf, end: lf + 2 };
  return lf < crlf ? { start: lf, end: lf + 2 } : { start: crlf, end: crlf + 4 };
}

/** Read the `data:` line(s) of a single SSE event, joined with newlines. */
function extractData(block: string): string | null {
  const lines = block.split(/\r?\n/);
  const parts: string[] = [];
  for (const line of lines) {
    if (line.startsWith("data: ")) parts.push(line.slice(6));
    else if (line.startsWith("data:")) parts.push(line.slice(5));
  }
  return parts.length === 0 ? null : parts.join("\n");
}
