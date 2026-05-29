// `unison "<prompt>"` — a thin transport for the server-side agent.
//
// The CLI does NOT run a local agent. It POSTs the prompt to the backend's
// `/v1/agent` streaming endpoint, consumes the SSE event stream as the server
// runs the turn (tool calls + streamed assistant text), and renders progress
// live. Status lines go to stderr (visible in the terminal); the assistant's
// answer goes to stdout (so `unison "..." > out.txt` captures clean output).
//
// `--write` is intentionally absent: scope is enforced server-side by the
// `usk_` key (chat:write/mail:write/etc.). The "robot" lives on the backend.

import { requireClient } from "../client-factory";
import { fail, info, out } from "../output";

export interface RunAgentOptions {
  /** Abort the streaming HTTP request. */
  signal?: AbortSignal;
  /** Continue an existing agent session (optional). */
  sessionId?: string;
  /** Override the server's default model (optional). */
  model?: string;
}

/** Returns a process exit code (0 success, non-zero failure). */
export async function runAgent(prompt: string, opts: RunAgentOptions = {}): Promise<number> {
  if (!prompt.trim()) {
    fail("Empty prompt.");
    return 1;
  }
  let client: Awaited<ReturnType<typeof requireClient>>;
  try {
    client = await requireClient();
  } catch (err) {
    fail(err instanceof Error ? err.message : String(err));
    return 4;
  }

  try {
    const result = await client.agent.run({
      message: prompt,
      ...(opts.model !== undefined ? { model: opts.model } : {}),
      ...(opts.sessionId !== undefined ? { sessionId: opts.sessionId } : {}),
      ...(opts.signal !== undefined ? { signal: opts.signal } : {}),
      onEvent: (event) => {
        if (event.type === "status") {
          // ● <tool> <text> — to stderr so stdout stays pipeable.
          const tool = event.tool ?? "tool";
          const status = event.text ?? "";
          info(`● ${tool}${status ? ` ${status}` : ""}`);
        } else if (event.type === "text") {
          // Assistant text → stdout (no newline; the agent streams its own).
          const delta = event.delta ?? "";
          if (delta) process.stdout.write(delta);
        }
        // `done` is rendered after the loop with the final summary.
      },
    });
    // Trailing newline so the shell prompt lands cleanly after the answer.
    if (result.answer && !result.answer.endsWith("\n")) out("");
    return 0;
  } catch (err) {
    fail(err instanceof Error ? err.message : String(err));
    return 1;
  }
}
