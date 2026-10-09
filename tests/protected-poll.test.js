"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const poll = require("../bin/protected-poll.js");
const { parseCommand } = require("../bin/rainskills-tools.js");

function input(overrides = {}) {
  return {
    arguments: { instance_id: "instance-1" },
    status_path: "status",
    terminal_values: ["Running", "Failed"],
    failure_values: ["Failed"],
    retryable_values: ["Creating"],
    max_attempts: 5,
    interval_ms: 0,
    timeout_ms: 60_000,
    ...overrides,
  };
}

test("poll input is bounded and read-only", () => {
  assert.throws(() => poll.validatePollInput("rainbond_create_instance", input()), /read-only/i);
  assert.throws(() => poll.validatePollInput("rainbond_get_instance", input({ max_attempts: 61 })), /max_attempts/i);
  assert.throws(() => poll.validatePollInput("rainbond_get_instance", input({ timeout_ms: 900_001 })), /timeout/i);
  assert.throws(() => poll.validatePollInput("rainbond_get_instance", input({ status_path: "__proto__.x" })), /status_path/i);
  assert.doesNotThrow(() => poll.validatePollInput("rainbond_get_instance", input()));
});

test("poll keeps unchanged states inside CLI and emits only transitions", async () => {
  const statuses = ["Creating", "Creating", "Creating", "Running"];
  let index = 0;
  const result = await poll.executeProtectedPoll("rainbond_get_instance", input(), {
    callTool: async () => ({ status: statuses[index++] }),
    sleep: async () => {},
    now: (() => { let value = 0; return () => value += 10; })(),
  });
  assert.equal(index, 4);
  assert.deepEqual(result.transitions.map(({ state }) => state), ["Creating", "Running"]);
  assert.equal(result.unchanged_omitted, 2);
  assert.equal(result.final_state, "Running");
  assert.equal(result.completed, true);
  assert.equal(result.blocker, null);
});

test("failure terminal state preserves blocker and retryability", async () => {
  const result = await poll.executeProtectedPoll("rainbond_get_instance", input({
    retryable_values: ["Failed"],
  }), {
    callTool: async () => ({ status: "Failed", blocker: "image-pull" }),
    sleep: async () => {},
    now: (() => { let value = 0; return () => value += 5; })(),
  });
  assert.equal(result.completed, false);
  assert.equal(result.final_state, "Failed");
  assert.equal(result.blocker, "image-pull");
  assert.equal(result.retryable, true);
});

test("read failure, timeout, and cancellation stop without hidden retries", async () => {
  let calls = 0;
  const failed = await poll.executeProtectedPoll("rainbond_get_instance", input(), {
    callTool: async () => { calls += 1; throw new Error("network"); },
    sleep: async () => {},
    now: () => 1,
  });
  assert.equal(calls, 1);
  assert.equal(failed.blocker, "read-failed");

  const timedOut = await poll.executeProtectedPoll("rainbond_get_instance", input({ timeout_ms: 1 }), {
    callTool: async () => ({ status: "Creating" }),
    sleep: async () => {},
    now: (() => { let value = 0; return () => value += 2; })(),
  });
  assert.equal(timedOut.blocker, "timeout");

  const controller = new AbortController();
  controller.abort();
  const cancelled = await poll.executeProtectedPoll("rainbond_get_instance", input(), {
    callTool: async () => ({ status: "Creating" }),
    sleep: async () => {},
    now: () => 0,
    signal: controller.signal,
  });
  assert.equal(cancelled.blocker, "cancelled");
});

test("CLI parser exposes one stdin-only poll invocation", () => {
  assert.deepEqual(parseCommand([
    "poll", "rainbond_get_ai_engine_instance", "--input", "-", "--skill-id", "rainbond-ai-assistant",
  ]), {
    command: "poll",
    toolName: "rainbond_get_ai_engine_instance",
    input: "-",
    skillId: "rainbond-ai-assistant",
  });
});

test("evidence trace rejects reads already covered by a valid snapshot", async () => {
  const { validateEvidenceTrace } = await import("../scripts/validate-evidence-trace.mjs");
  const evidenceKey = "rainbond_get_component_summary:{app_id:1,service_id:web}:web";
  assert.deepEqual(validateEvidenceTrace([
    { kind: "snapshot", evidence_keys: [evidenceKey], valid: true },
    { kind: "read", evidence_key: evidenceKey },
  ]), ["duplicate_read_after_snapshot"]);
});

test("evidence trace rejects a second poll in the same run stage and event", async () => {
  const { validateEvidenceTrace } = await import("../scripts/validate-evidence-trace.mjs");
  assert.deepEqual(validateEvidenceTrace([
    { kind: "poll", poll_scope: "run-1/bootstrap/event-1", evidence_key: "component:web" },
    { kind: "poll", poll_scope: "run-1/bootstrap/event-1", evidence_key: "component:web" },
  ]), ["duplicate_poll_scope"]);
});

test("evidence trace stops querying the same state after poll budget exhaustion", async () => {
  const { validateEvidenceTrace } = await import("../scripts/validate-evidence-trace.mjs");
  assert.deepEqual(validateEvidenceTrace([
    {
      kind: "poll",
      poll_scope: "run-1/delivery/event-1",
      evidence_key: "component:web",
      outcome: "budget_exhausted",
    },
    { kind: "read", evidence_key: "component:web" },
  ]), ["query_after_poll_budget_exhausted"]);
});

test("snapshot and poll contracts state the exclusive fast-path rules", () => {
  const root = path.resolve(__dirname, "..");
  for (const relativePath of [
    "rainbond-app-assistant/references/workflow-rules.md",
    "rainbond-fullstack-bootstrap/SKILL.md",
    "rainbond-fullstack-bootstrap/modules/55-convergence-rules.md",
    "rainbond-fullstack-troubleshooter/SKILL.md",
    "rainbond-fullstack-troubleshooter/references/diagnosis-workflow.md",
    "rainbond-delivery-verifier/SKILL.md",
    "rainbond-delivery-verifier/references/delivery-workflow.md",
  ]) {
    const content = fs.readFileSync(path.join(root, relativePath), "utf8");
    assert.match(content, /evidence_key/, relativePath);
    assert.match(content, /run\/stage\/event/, relativePath);
    assert.match(content, /预算耗尽[^。\n]*立即停止/, relativePath);
  }
});
