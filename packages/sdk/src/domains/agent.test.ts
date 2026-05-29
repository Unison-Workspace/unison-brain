import { describe, expect, test } from "bun:test";
import { type AgentEvent, parseAgentSse } from "./agent";

function streamFromString(chunks: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream<Uint8Array>({
    start(controller) {
      for (const c of chunks) controller.enqueue(encoder.encode(c));
      controller.close();
    },
  });
}

describe("parseAgentSse", () => {
  test("accumulates text deltas and surfaces sessionId + finishReason on done", async () => {
    const events: AgentEvent[] = [];
    const result = await parseAgentSse(
      streamFromString([
        `data: ${JSON.stringify({ type: "text", delta: "Hello" })}\n\n`,
        `data: ${JSON.stringify({ type: "text", delta: " world" })}\n\n`,
        `data: ${JSON.stringify({
          type: "done",
          sessionId: "S1",
          finishReason: "stop",
        })}\n\n`,
        "data: [DONE]\n\n",
      ]),
      (e) => events.push(e),
    );
    expect(result.answer).toBe("Hello world");
    expect(result.sessionId).toBe("S1");
    expect(result.finishReason).toBe("stop");
    expect(events.length).toBe(3);
  });

  test("handles status events without interrupting text accumulation", async () => {
    const events: AgentEvent[] = [];
    const result = await parseAgentSse(
      streamFromString([
        `data: ${JSON.stringify({ type: "status", tool: "chat_send", text: "running" })}\n\n`,
        `data: ${JSON.stringify({ type: "text", delta: "Sent." })}\n\n`,
        `data: ${JSON.stringify({ type: "status", tool: "chat_send", text: "done" })}\n\n`,
        `data: ${JSON.stringify({ type: "done", sessionId: "S2", finishReason: "stop" })}\n\n`,
        "data: [DONE]\n\n",
      ]),
      (e) => events.push(e),
    );
    expect(result.answer).toBe("Sent.");
    expect(events.filter((e) => e.type === "status").length).toBe(2);
  });

  test("reassembles events that arrive split across chunks", async () => {
    const result = await parseAgentSse(
      streamFromString([
        // The first chunk cuts an event mid-JSON; the parser must buffer.
        'data: {"type":"text","delta":"Hel',
        'lo"}\n\n',
        `data: ${JSON.stringify({ type: "done", sessionId: "S3", finishReason: "stop" })}\n\n`,
        "data: [DONE]\n\n",
      ]),
      undefined,
    );
    expect(result.answer).toBe("Hello");
    expect(result.sessionId).toBe("S3");
  });

  test("skips malformed event lines without aborting the stream", async () => {
    const events: AgentEvent[] = [];
    const result = await parseAgentSse(
      streamFromString([
        "data: not-valid-json\n\n",
        `data: ${JSON.stringify({ type: "text", delta: "OK" })}\n\n`,
        `data: ${JSON.stringify({ type: "done", sessionId: "S4", finishReason: "stop" })}\n\n`,
        "data: [DONE]\n\n",
      ]),
      (e) => events.push(e),
    );
    expect(result.answer).toBe("OK");
    expect(events.length).toBe(2); // text + done; malformed was dropped
  });

  test("stream ending without [DONE] still resolves with what was accumulated", async () => {
    const result = await parseAgentSse(
      streamFromString([`data: ${JSON.stringify({ type: "text", delta: "partial" })}\n\n`]),
      undefined,
    );
    expect(result.answer).toBe("partial");
    expect(result.finishReason).toBe("stop"); // default
  });
});
