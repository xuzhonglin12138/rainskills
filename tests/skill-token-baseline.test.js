"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const moduleUrl = pathToFileURL(
  path.join(__dirname, "..", "benchmarks", "skill-performance", "measure-skill-tokens.mjs")
).href;

test("summarizeCodexEvents extracts usage without double counting cached or reasoning tokens", async () => {
  const { parseJsonl, summarizeCodexEvents } = await import(moduleUrl);
  const events = parseJsonl([
    JSON.stringify({ type: "thread.started", thread_id: "thread-1" }),
    JSON.stringify({
      type: "item.completed",
      item: { id: "item-1", type: "agent_message", text: "READY" },
    }),
    JSON.stringify({
      type: "turn.completed",
      usage: {
        input_tokens: 100,
        cached_input_tokens: 40,
        cache_write_input_tokens: 10,
        output_tokens: 20,
        reasoning_output_tokens: 5,
      },
    }),
  ].join("\n"));

  const summary = summarizeCodexEvents(events);

  assert.equal(summary.threadId, "thread-1");
  assert.equal(summary.agentMessage, "READY");
  assert.deepEqual(summary.usage, {
    inputTokens: 100,
    cachedInputTokens: 40,
    cacheWriteInputTokens: 10,
    uncachedInputTokens: 60,
    outputTokens: 20,
    reasoningOutputTokens: 5,
    totalTokens: 120,
  });
});

test("summarizeCodexEvents fails closed when usage is missing", async () => {
  const { summarizeCodexEvents } = await import(moduleUrl);

  assert.throws(
    () => summarizeCodexEvents([{ type: "turn.completed" }]),
    /missing turn\.completed usage/i
  );
});

test("parseJsonl rejects malformed event lines", async () => {
  const { parseJsonl } = await import(moduleUrl);

  assert.throws(() => parseJsonl('{"type":"turn.started"}\nnot-json'), /invalid JSONL/i);
});
