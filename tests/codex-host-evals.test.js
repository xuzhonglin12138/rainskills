"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
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
  assert.deepEqual(args.filter((value) => ["plugins", "remote_plugin", "plugin_sharing"].includes(value)), [
    "plugins", "remote_plugin", "plugin_sharing",
  ]);
  assert(args.includes('model_provider="OpenAI"'));
  assert(args.includes('model_providers.OpenAI.base_url="https://code.agent-app.ai"'));
  assert(args.includes("model_providers.OpenAI.supports_websockets=false"));
  assert.doesNotMatch(JSON.stringify(args), /api[_-]?key|token|secret/i);
});

test("Codex host runner isolates user skills and plugins while copying only auth", async () => {
  const { prepareIsolatedCodexEnvironment } = await import("../scripts/run-codex-host-evals.mjs");
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), "rainskills-host-isolation-"));
  const authSource = path.join(workspace, "source-auth.json");
  fs.writeFileSync(authSource, '{"OPENAI_API_KEY":"test-only"}\n', { mode: 0o600 });
  const result = prepareIsolatedCodexEnvironment({
    workspace,
    authSource,
    baseEnvironment: {
      PATH: process.env.PATH,
      HOME: "/user/home",
      CODEX_APP_TOOLS_PIPE_PATH: "/user/plugin.sock",
      CODEX_THREAD_ID: "thread-id",
      OPENAI_API_KEY: "must-not-leak",
    },
  });
  assert.equal(result.childEnvironment.CODEX_HOME, result.isolatedCodexHome);
  assert.equal(result.childEnvironment.HOME, result.isolatedHome);
  assert.equal(result.childEnvironment.CODEX_APP_TOOLS_PIPE_PATH, undefined);
  assert.equal(result.childEnvironment.CODEX_THREAD_ID, undefined);
  assert.equal(result.childEnvironment.OPENAI_API_KEY, undefined);
  assert.equal(result.authCopied, true);
  const copiedAuth = path.join(result.isolatedCodexHome, "auth.json");
  assert.equal(fs.readFileSync(copiedAuth, "utf8"), fs.readFileSync(authSource, "utf8"));
  assert.equal(fs.statSync(copiedAuth).mode & 0o777, 0o600);
  fs.rmSync(workspace, { recursive: true, force: true });
});

test("controlled live host runs use fixed non-interactive execution without credential argv", async () => {
  const { buildCodexArgs } = await import("../scripts/run-codex-host-evals.mjs");
  const args = buildCodexArgs({
    workspace: "/tmp/workspace",
    prompt: "controlled prompt",
    options: {
      model: "gpt-5.6-sol",
      reasoningEffort: "high",
      controlledLive: true,
      providerName: "OpenAI",
      providerBaseUrl: "https://code.agent-app.ai",
      providerWireApi: "responses",
      providerRequiresOpenAIAuth: true,
      providerSupportsWebsockets: false,
    },
  });
  assert(args.includes("danger-full-access"));
  assert(args.includes('approval_policy="never"'));
  assert.doesNotMatch(JSON.stringify(args), /RAINBOND_JWT|OPENAI_API_KEY|Bearer\s/i);
});

test("AB/BA plan is deterministic and balanced", async () => {
  const { buildPairPlan } = await import("../scripts/run-codex-host-abba.mjs");
  const first = buildPairPlan({ primaryPairs: 20, exploratoryPairs: 1, seed: "fixed-seed" });
  const second = buildPairPlan({ primaryPairs: 20, exploratoryPairs: 1, seed: "fixed-seed" });
  assert.deepEqual(first, second);
  const primary = first.filter((pair) => pair.primary);
  assert.equal(primary.length, 20);
  assert.equal(primary.filter((pair) => pair.order === "AB").length, 10);
  assert.equal(primary.filter((pair) => pair.order === "BA").length, 10);
  assert.equal(first.length, 27);
  const alternate = buildPairPlan({
    primaryPairs: 2,
    exploratoryPairs: 0,
    seed: "fixed-seed",
    primaryScenario: "initialize-monorepo",
  });
  assert.equal(alternate.length, 2);
  assert(alternate.every((pair) => pair.scenario_id === "initialize-monorepo"));
});

test("AB/BA summary reports paired relative changes and order effects", async () => {
  const { summarizePairs } = await import("../scripts/run-codex-host-abba.mjs");
  const plan = [
    { scenario_id: "deploy-current-project", pair_index: 1, order: "AB", primary: true },
    { scenario_id: "deploy-current-project", pair_index: 2, order: "BA", primary: true },
  ];
  const makeRecord = (pairIndex, runRole, input, milliseconds) => ({
    scenario_id: "deploy-current-project",
    pair_index: pairIndex,
    run_role: runRole,
    result: "success",
    timed_out: false,
    usage: {
      input_tokens: input,
      uncached_input_tokens: input,
      cached_input_tokens: 0,
      output_tokens: 10,
      total_tokens: input + 10,
    },
    timing: { process_exit_ms: milliseconds, turn_completed_ms: milliseconds - 1 },
  });
  const records = [
    makeRecord(1, "base", 100, 1000),
    makeRecord(1, "candidate", 50, 800),
    makeRecord(2, "candidate", 60, 900),
    makeRecord(2, "base", 100, 1000),
  ];
  const summary = summarizePairs(records, plan);
  assert.equal(summary.complete_pairs, 2);
  assert.equal(summary.primary.input_tokens.pairwise_relative_change_median, -0.45);
  assert.equal(summary.primary.input_tokens.improved_pairs, 2);
  assert.equal(summary.primary.input_tokens.ab_relative_change_median, -0.5);
  assert.equal(summary.primary.input_tokens.ba_relative_change_median, -0.4);
});
