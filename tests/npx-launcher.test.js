"use strict";

const assert = require("node:assert/strict");
const path = require("node:path");
const test = require("node:test");

const launcherPath = path.resolve(__dirname, "../bin/rainskills.js");
const {
  classifyNodeMajor,
  parseRuntimeConnectArgs,
  resolveInvocation,
  runtimeChildEnvironment,
  runtimeConnectionInvocation,
  runBuiltin,
} = require(launcherPath);

test("launcher exposes the supported Node policy", () => {
  assert.equal(classifyNodeMajor(17), "unsupported");
  assert.equal(classifyNodeMajor(18), "eol");
  assert.equal(classifyNodeMajor(20), "eol");
  assert.equal(classifyNodeMajor(22), "supported");
});

test("launcher rejects the removed local MCP entry point", () => {
  assert.throws(
    () => resolveInvocation(["mcp", "serve", "--client", "codex"]),
    /不再提供本地 MCP 服务/
  );
});

test("runtime connect accepts one environment route without a business intent", () => {
  assert.deepEqual(parseRuntimeConnectArgs([
    "runtime", "connect", "codex", "--saas",
  ]), {
    targetClient: "codex",
    environmentChoice: "saas",
    rainbondUrl: "",
    allowInsecureHttp: false,
    privateLocation: undefined,
    operationId: undefined,
  });
  assert.deepEqual(parseRuntimeConnectArgs([
    "runtime", "connect", "claude", "--rainbond-url", "https://console.example.com",
  ]), {
    targetClient: "claude",
    environmentChoice: "private-existing",
    rainbondUrl: "https://console.example.com",
    allowInsecureHttp: false,
    privateLocation: undefined,
    operationId: undefined,
  });
  assert.throws(() => parseRuntimeConnectArgs([
    "runtime", "connect", "codex", "--saas", "--rainbond-url", "https://other.example.com",
  ]), /互斥/);

  const operationId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
  assert.equal(parseRuntimeConnectArgs([
    "runtime", "connect", "codex", "--saas", "--operation-id", operationId,
  ]).operationId, operationId);
  assert.throws(() => parseRuntimeConnectArgs([
    "runtime", "connect", "codex", "--saas", "--operation-id", "not-a-uuid",
  ]), /operation/i);
});

test("runtime connector child never inherits a cached credential", () => {
  const token = "header.payload.signature";
  const forwarded = runtimeChildEnvironment({
    HOME: "/tmp/home",
    PATH: "/usr/bin",
    RAINBOND_URL: "https://console.example.com/",
    RAINBOND_JWT: token,
    UNRELATED_SECRET: "no",
  }, {}, "https://console.example.com");
  assert.equal(forwarded.RAINBOND_JWT, undefined);
  assert.equal(forwarded.RAINBOND_URL, undefined);
  assert.equal(forwarded.UNRELATED_SECRET, undefined);

  const rejected = runtimeChildEnvironment({
    RAINBOND_URL: "https://other.example.com",
    RAINBOND_JWT: token,
  }, {}, "https://console.example.com");
  assert.equal(rejected.RAINBOND_JWT, undefined);
});

test("POSIX runtime connection uses fixed installer argv", () => {
  const invocation = runtimeConnectionInvocation({
    targetClient: "codex",
    environmentChoice: "private-existing",
    allowInsecureHttp: true,
  }, "http://10.0.0.8:7070");
  assert.deepEqual(invocation, {
    executable: "bash",
    args: [
      path.resolve(__dirname, "../install.sh"),
      "connect", "codex", "--self-hosted", "--rainbond-url", "http://10.0.0.8:7070",
      "--allow-insecure-http", "--no-cached-token",
    ],
  });
});

test("private platform installation returns one bounded next action", async () => {
  const output = [];
  const next = {
    schema: "rainskills.next-action.v1",
    action: "install-platform",
    onboarding_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    argv: ["platform", "install", "--onboarding-id", "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"],
  };
  assert.equal(await runBuiltin([
    "runtime", "connect", "codex", "--install-private", "--location", "local",
  ], {
    privateInstallerScheduler(input) {
      assert.equal(input.intent, undefined);
      assert.equal(input.privateLocation, "local");
      return next;
    },
    write: (value) => output.push(value),
  }), true);
  assert.deepEqual(JSON.parse(output.join("")), next);
});

test("runtime status remains an in-process command", async () => {
  const output = [];
  assert.equal(await runBuiltin(["runtime", "status", "--json"], {
    runtimeStateManager: {
      read: () => ({ state: "not_started" }),
    },
    singleRuntimeStore: { read: () => null },
    write: (value) => output.push(value),
  }), true);
  assert.deepEqual(JSON.parse(output.join("")), {
    schema: "rainskills.runtime-status.v1",
    state: "not_started",
    usable: false,
  });
});

test("runtime connect rejects a detached terminal before creating connecting state", async () => {
  let starts = 0;
  await assert.rejects(() => runBuiltin([
    "runtime", "connect", "codex", "--rainbond-url", "https://console.example.com",
  ], {
    interactive: false,
    originInspector: async () => ({
      origin: "https://console.example.com",
      pendingRedirectOrigin: null,
      httpConfirmationRequired: false,
    }),
    runtimeStateManager: {
      read: () => ({ state: "not_started" }),
      startConnecting() { starts += 1; },
    },
    connectionRunner: async () => {
      throw new Error("connector must not start");
    },
    write() {},
  }), /TTY|交互终端/i);
  assert.equal(starts, 0);
});

test("failed runtime connect retries the same protected operation", async () => {
  const operationId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
  let current = { state: "not_started" };
  let released = 0;
  const manager = {
    acquireConnectionLease(id) {
      assert.equal(id, operationId);
      return { release() { released += 1; } };
    },
    read: () => current,
    startConnecting(input) {
      if (current.state === "connecting" && current.operation_id !== input.operation_id) {
        throw new Error("competing operation");
      }
      current = { state: "connecting", ...input };
      return current;
    },
  };
  const output = [];

  await assert.rejects(() => runBuiltin([
    "runtime", "connect", "codex", "--rainbond-url", "https://console.example.com",
    "--operation-id", operationId,
  ], {
    interactive: true,
    originInspector: async () => ({
      origin: "https://console.example.com",
      pendingRedirectOrigin: null,
      httpConfirmationRequired: false,
    }),
    runtimeStateManager: manager,
    connectionRunner: async () => ({ code: 1, signal: null, completesRuntimeState: true }),
    write: (value) => output.push(value),
  }), /未完成/);

  const retry = JSON.parse(output.join(""));
  assert.deepEqual(retry.argv, [
    "runtime", "connect", "codex", "--rainbond-url", "https://console.example.com",
    "--operation-id", operationId,
  ]);
  assert.equal(released, 1);

  output.length = 0;
  await assert.rejects(() => runBuiltin(retry.argv, {
    interactive: true,
    originInspector: async () => ({
      origin: "https://console.example.com",
      pendingRedirectOrigin: null,
      httpConfirmationRequired: false,
    }),
    runtimeStateManager: manager,
    connectionRunner: async () => ({ code: 1, signal: null, completesRuntimeState: true }),
    write: (value) => output.push(value),
  }), /未完成/);
  assert.equal(current.operation_id, operationId);
  assert.equal(released, 2);
});

test("a matching orphaned connecting state resumes through its original operation", async () => {
  const operationId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
  const current = {
    state: "connecting",
    operation_id: operationId,
    target_client: "codex",
    environment_kind: "private",
    console_origin: "https://console.example.com",
  };
  const output = [];
  await assert.rejects(() => runBuiltin([
    "runtime", "connect", "codex", "--rainbond-url", "https://console.example.com",
  ], {
    interactive: true,
    originInspector: async () => ({
      origin: "https://console.example.com",
      pendingRedirectOrigin: null,
      httpConfirmationRequired: false,
    }),
    runtimeStateManager: {
      acquireConnectionLease(id) {
        assert.equal(id, operationId);
        return { release() {} };
      },
      read: () => current,
      startConnecting: (input) => {
        assert.equal(input.operation_id, operationId);
        return current;
      },
    },
    connectionRunner: async (_invocation, context) => {
      assert.equal(context.operationId, operationId);
      return { code: 1, signal: null, completesRuntimeState: true };
    },
    write: (value) => output.push(value),
  }), /未完成/);
  assert.equal(JSON.parse(output.join("")).argv.at(-1), operationId);
});

test("runtime status reports protected connecting state before checking stored credentials", async () => {
  const output = [];
  assert.equal(await runBuiltin(["runtime", "status", "--json"], {
    runtimeStateManagerFactory: () => ({
      read: () => ({
        state: "connecting",
        operation_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        target_client: "codex",
        environment_kind: "private",
        console_origin: "https://console.example.com",
      }),
    }),
    singleRuntimeStore: { read: () => null },
    write: (value) => output.push(value),
  }), true);
  assert.deepEqual(JSON.parse(output.join("")), {
    schema: "rainskills.runtime-status.v1",
    state: "connecting",
    usable: false,
    operation_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    console_origin: "https://console.example.com",
    environment_kind: "private",
  });
});
