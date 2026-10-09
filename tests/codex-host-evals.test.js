"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");

test("Codex host events normalize usage and overlapping tool timing", async () => {
  const { normalizeCodexRun } = await import("../scripts/run-codex-host-evals.mjs");
  const timedEvents = [
    { received_ms: 5, event: { type: "thread.started", thread_id: "thread-1" } },
    { received_ms: 20, event: { type: "item.started", item: { id: "tool-1", type: "command_execution" } } },
    { received_ms: 30, event: { type: "item.started", item: { id: "tool-2", type: "mcp_tool_call" } } },
    { received_ms: 50, event: { type: "item.completed", item: { id: "tool-1", type: "command_execution" } } },
    { received_ms: 60, event: { type: "item.completed", item: { id: "tool-2", type: "mcp_tool_call" } } },
    { received_ms: 70, event: { type: "item.completed", item: { id: "msg-1", type: "agent_message", text: "done" } } },
    { received_ms: 80, event: { type: "turn.completed", usage: { input_tokens: 100, cached_input_tokens: 40, output_tokens: 20, reasoning_output_tokens: 5 } } },
  ];
  const normalized = normalizeCodexRun({ timedEvents, processExitMs: 90, exitCode: 0 });
  assert.equal(normalized.timing.first_event_ms, 20);
  assert.equal(normalized.timing.first_tool_ms, 20);
  assert.equal(normalized.timing.tool_wall_time_ms, 40);
  assert.equal(normalized.timing.turn_completed_ms, 80);
  assert.equal(normalized.usage.uncached_input_tokens, 60);
  assert.equal(normalized.usage.total_tokens, 120);
  assert.equal(normalized.tool_calls, 2);
  assert.equal(normalized.result, "success");
});

test("unavailable host scenarios are explicit instead of using proxy metrics", async () => {
  const { unavailableScenario } = await import("../scripts/run-codex-host-evals.mjs");
  const result = unavailableScenario({
    scenarioId: "deploy-current-project",
    reason: "controlled Rainbond test environment unavailable",
  });
  assert.equal(result.result, "unavailable");
  assert.equal(result.usage.status, "unavailable");
  assert.equal(result.usage.input_tokens, null);
  assert.equal(result.timing.process_exit_ms, "unavailable");
});

test("Codex host runner can preserve a non-sensitive custom provider while isolating user config", async () => {
  const { buildCodexArgs } = await import("../scripts/run-codex-host-evals.mjs");
  const args = buildCodexArgs({
    workspace: "/tmp/workspace",
    prompt: "fixture prompt",
    options: {
      model: "gpt-5.6-sol",
      reasoningEffort: "high",
      providerName: "OpenAI",
      providerBaseUrl: "https://code.agent-app.ai",
      providerWireApi: "responses",
      providerRequiresOpenAIAuth: true,
      providerSupportsWebsockets: false,
    },
  });
  assert(args.includes("--ignore-user-config"));
  assert(args.includes('model_provider="OpenAI"'));
  assert(args.includes('model_providers.OpenAI.base_url="https://code.agent-app.ai"'));
  assert(args.includes("model_providers.OpenAI.supports_websockets=false"));
  assert.doesNotMatch(JSON.stringify(args), /api[_-]?key|token|secret/i);
});
