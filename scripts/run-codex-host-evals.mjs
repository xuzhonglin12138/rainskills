#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { execFileSync, spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import YAML from "yaml";
import { EXPECTED_SKILLS, canonicalJson, loadEffectCases, sha256 } from "./validate-effect-evals.mjs";
import { buildSkillManifest } from "./build-skill-manifest.mjs";

const HOST_SCHEMA = "rainskills.codex-host-evals.v1";
const ARTIFACT_MAX_BYTES = 10 * 1024 * 1024;
const WRITE_SCENARIOS = new Set([
  "deploy-current-project",
  "deploy-bare-git",
  "create-three-component-topology",
  "diagnose-missing-dependency",
  "initialize-monorepo",
  "install-plugin-and-resume-ai",
  "reject-unsupported-multimodal-bypass",
]);
const TOOL_ITEM_PATTERN = /(?:command|tool|mcp|web_search|computer|file_change)/i;

function unavailableValue() {
  return "unavailable";
}

function unavailableUsage() {
  return {
    status: "unavailable",
    source: "unavailable",
    input_tokens: null,
    cached_input_tokens: null,
    cache_write_input_tokens: null,
    uncached_input_tokens: null,
    output_tokens: null,
    reasoning_output_tokens: null,
    total_tokens: null,
    cache_hit_ratio: null,
  };
}

export function unavailableScenario({ scenarioId, reason }) {
  return {
    scenario_id: scenarioId,
    benchmark_layer: "codex_host",
    data_source: "unavailable",
    run_role: "baseline",
    timing: {
      process_exit_ms: unavailableValue(),
      turn_completed_ms: unavailableValue(),
      first_event_ms: unavailableValue(),
      first_tool_ms: unavailableValue(),
      first_user_progress_ms: unavailableValue(),
      tool_wall_time_ms: unavailableValue(),
      orchestration_and_tool_ms: unavailableValue(),
      external_platform_wait_ms: unavailableValue(),
    },
    model_calls: 0,
    retry_calls: 0,
    tool_calls: 0,
    poll_calls: 0,
    skills_opened: [],
    references_opened: [],
    markdown_bytes_read: 0,
    usage: unavailableUsage(),
    compaction_count: unavailableValue(),
    result: "unavailable",
    unavailable_reason: reason,
    behavior_assertions: [],
  };
}

function isToolItem(event) {
  return event?.item?.type && TOOL_ITEM_PATTERN.test(event.item.type)
    && event.item.type !== "agent_message";
}

function intervalUnion(intervals) {
  if (!intervals.length) return 0;
  const sorted = [...intervals].sort((left, right) => left[0] - right[0]);
  let total = 0;
  let [start, end] = sorted[0];
  for (const [nextStart, nextEnd] of sorted.slice(1)) {
    if (nextStart <= end) {
      end = Math.max(end, nextEnd);
      continue;
    }
    total += end - start;
    [start, end] = [nextStart, nextEnd];
  }
  return total + end - start;
}

function observedPaths(timedEvents) {
  const skillPaths = new Set();
  const referencePaths = new Set();
  for (const { event } of timedEvents) {
    const text = JSON.stringify(event);
    for (const match of text.matchAll(/(?:[A-Za-z0-9._/-]+\/)?SKILL\.md/g)) skillPaths.add(match[0]);
    for (const match of text.matchAll(/[A-Za-z0-9._/-]+\/references\/[A-Za-z0-9._/-]+\.md/g)) {
      referencePaths.add(match[0]);
    }
  }
  return {
    skills: [...skillPaths].sort(),
    references: [...referencePaths].sort(),
  };
}

export function normalizeCodexRun({ timedEvents, processExitMs, exitCode, timedOut = false }) {
  const toolStarts = new Map();
  const toolIntervals = [];
  let firstItem = null;
  let firstTool = null;
  let turnCompleted = null;
  let usageEvent = null;
  const agentMessages = [];
  let toolCalls = 0;
  let pollCalls = 0;
  let retryCalls = 0;
  let turnStarts = 0;
  let compactionCount = 0;

  for (const { received_ms: receivedMs, event } of timedEvents) {
    if (event.type === "turn.started") turnStarts += 1;
    if (event.type === "error" && /reconnecting/i.test(String(event.message || ""))) retryCalls += 1;
    if ((event.type === "item.started" || event.type === "item.completed") && firstItem === null) {
      firstItem = receivedMs;
    }
    if (event.type === "item.started" && isToolItem(event)) {
      toolCalls += 1;
      if (firstTool === null) firstTool = receivedMs;
      toolStarts.set(event.item.id, receivedMs);
      if (/poll|write_stdin/i.test(JSON.stringify(event.item))) pollCalls += 1;
    }
    if (event.type === "item.completed" && isToolItem(event)) {
      const start = toolStarts.get(event.item.id);
      if (start !== undefined) toolIntervals.push([start, receivedMs]);
    }
    if (event.type === "item.completed" && event.item?.type === "agent_message") {
      agentMessages.push({ receivedMs, text: event.item.text || "" });
    }
    if (event.type === "turn.completed") {
      turnCompleted = receivedMs;
      usageEvent = event.usage || null;
    }
    if (/compact/i.test(String(event.type))) compactionCount += 1;
  }

  let usage = unavailableUsage();
  if (usageEvent) {
    const input = usageEvent.input_tokens;
    const cached = usageEvent.cached_input_tokens ?? 0;
    const cacheWrite = usageEvent.cache_write_input_tokens ?? 0;
    const output = usageEvent.output_tokens;
    const reasoning = usageEvent.reasoning_output_tokens ?? 0;
    if ([input, cached, cacheWrite, output, reasoning].every((value) => Number.isSafeInteger(value) && value >= 0)
      && cached <= input && reasoning <= output) {
      usage = {
        status: "observed",
        source: "codex_exec_json",
        input_tokens: input,
        cached_input_tokens: cached,
        cache_write_input_tokens: cacheWrite,
        uncached_input_tokens: input - cached,
        output_tokens: output,
        reasoning_output_tokens: reasoning,
        total_tokens: input + output,
        cache_hit_ratio: input === 0 ? 0 : cached / input,
      };
    }
  }
  const paths = observedPaths(timedEvents);
  const finalMessage = agentMessages.at(-1)?.text || "";
  const result = timedOut
    ? "failed"
    : exitCode !== 0
      ? "failed"
      : /(?:blocked|cannot continue|无法继续|缺少受控|需要用户)/i.test(finalMessage)
        ? "blocked"
        : "success";
  return {
    timing: {
      process_exit_ms: processExitMs,
      turn_completed_ms: turnCompleted ?? unavailableValue(),
      first_event_ms: firstItem ?? unavailableValue(),
      first_tool_ms: firstTool ?? unavailableValue(),
      first_user_progress_ms: agentMessages.length > 1
        ? agentMessages[0].receivedMs
        : unavailableValue(),
      tool_wall_time_ms: intervalUnion(toolIntervals),
      orchestration_and_tool_ms: unavailableValue(),
      external_platform_wait_ms: unavailableValue(),
    },
    model_calls: Math.max(turnStarts, usageEvent ? 1 : 0) + retryCalls,
    retry_calls: retryCalls,
    tool_calls: toolCalls,
    poll_calls: pollCalls,
    skills_opened: paths.skills,
    references_opened: paths.references,
    markdown_bytes_read: 0,
    usage,
    compaction_count: compactionCount || unavailableValue(),
    result,
    final_message: finalMessage || null,
  };
}

function recursiveFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    if (["__pycache__", ".DS_Store"].includes(entry.name) || entry.name.endsWith(".pyc")) return [];
    const absolute = path.join(directory, entry.name);
    return entry.isDirectory() ? recursiveFiles(absolute) : [absolute];
  });
}

function directoryDigest(directory) {
  const hash = crypto.createHash("sha256");
  for (const file of recursiveFiles(directory).sort()) {
    hash.update(path.relative(directory, file));
    hash.update("\0");
    hash.update(fs.readFileSync(file));
    hash.update("\0");
  }
  return hash.digest("hex");
}

function copySkillBundles(root, workspace) {
  const target = path.join(workspace, ".agents", "skills");
  fs.mkdirSync(target, { recursive: true });
  for (const skillId of EXPECTED_SKILLS) {
    const destination = path.join(target, skillId);
    if (skillId === "rainskills") {
      fs.mkdirSync(destination, { recursive: true });
      fs.copyFileSync(path.join(root, "SKILL.md"), path.join(destination, "SKILL.md"));
      if (fs.existsSync(path.join(root, "agents"))) {
        fs.cpSync(path.join(root, "agents"), path.join(destination, "agents"), { recursive: true });
      }
      continue;
    }
    fs.cpSync(path.join(root, skillId), destination, {
      recursive: true,
      filter: (source) => !source.includes(`${path.sep}__pycache__`)
        && !source.endsWith(".pyc")
        && !source.endsWith(".DS_Store"),
    });
  }
  return { path: target, digest: directoryDigest(target) };
}

function gitState(root) {
  const sha = execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim();
  const status = execFileSync("git", ["status", "--porcelain"], { cwd: root, encoding: "utf8" });
  return { sha, clean: status.trim() === "" };
}

function parseScenarioConfig(root) {
  const document = YAML.parse(fs.readFileSync(
    path.join(root, "benchmarks", "skill-performance", "scenarios.yaml"),
    "utf8",
  ));
  return document.scenarios;
}

function makePrompt(effectCase, entrySkill, fixtureOnly) {
  const prefix = fixtureOnly
    ? [
        "This is a read-only fixture-only Codex host evaluation.",
        `Use the $${entrySkill} Skill from the isolated candidate bundle.`,
        "Do not call Rainbond, network, web, browser, shell, or any external tool. Do not modify files.",
        "Analyze the request using only the Skill and the hash-pinned policy fixture. State the initial owner, any allowed handoff, the safety stop, and the expected outcome concisely.",
      ]
    : [
        `Use the $${entrySkill} Skill from the isolated candidate bundle.`,
        "This run is read-only. Do not perform mutations; stop when the request would require a controlled Rainbond write environment.",
      ];
  return [...prefix, "User request:", effectCase.prompt].join("\n\n");
}

function safeWrite(file, content) {
  fs.writeFileSync(file, content, { mode: 0o600 });
  fs.chmodSync(file, 0o600);
}

function redactArtifactText(value) {
  return String(value)
    .replace(/sk-[A-Za-z0-9_*.-]{16,}/g, "<redacted-api-key>")
    .replace(/\b(?:Bearer|GRJWT)\s+[A-Za-z0-9._~+/-]+=*/gi, "<redacted-authorization>")
    .replace(/\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g, "<redacted-jwt>");
}

async function executeCodex({ root, scenario, effectCase, options, repetition }) {
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), `rainskills-host-${scenario.id}-`));
  fs.chmodSync(workspace, 0o700);
  const bundle = copySkillBundles(root, workspace);
  const fixture = { kind: "policy_scenario", name: effectCase.id };
  safeWrite(path.join(workspace, "EVAL_FIXTURE.json"), `${JSON.stringify(fixture, null, 2)}\n`);
  const prompt = makePrompt(effectCase, scenario.entry_skill, options.fixtureOnly);
  const artifactDirectory = path.join(options.artifactRoot, scenario.id, String(repetition));
  fs.mkdirSync(artifactDirectory, { recursive: true, mode: 0o700 });
  fs.chmodSync(artifactDirectory, 0o700);
  const started = process.hrtime.bigint();
  const timedEvents = [];
  let stdout = "";
  let stderr = "";
  let buffered = "";
  let artifactBytes = 0;
  let timedOut = false;
  const args = [
    "exec", "--json", "--ephemeral", "--ignore-user-config", "--ignore-rules",
    "--skip-git-repo-check", "-s", "read-only", "-C", workspace,
    "-m", options.model,
    "-c", `model_reasoning_effort=${JSON.stringify(options.reasoningEffort)}`,
    prompt,
  ];
  const childEnvironment = {
    ...process.env,
    RAINSKILLS_TELEMETRY_DISABLED: "1",
    RAINSKILLS_CREDENTIAL_SOURCE: "environment",
    RAINBOND_URL: "",
    RAINBOND_JWT: "",
  };
  delete childEnvironment.OPENAI_API_KEY;
  delete childEnvironment.OPENAI_API_KEY_PATH;
  const child = spawn("codex", args, {
    cwd: workspace,
    env: childEnvironment,
    stdio: ["ignore", "pipe", "pipe"],
  });
  const timer = setTimeout(() => {
    timedOut = true;
    child.kill("SIGTERM");
  }, options.timeoutMs);
  child.stdout.setEncoding("utf8");
  child.stderr.setEncoding("utf8");
  child.stdout.on("data", (chunk) => {
    stdout += chunk;
    artifactBytes += Buffer.byteLength(chunk);
    if (artifactBytes > ARTIFACT_MAX_BYTES) {
      timedOut = true;
      child.kill("SIGTERM");
      return;
    }
    buffered += chunk;
    const lines = buffered.split(/\r?\n/);
    buffered = lines.pop() || "";
    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        timedEvents.push({
          received_ms: Number(process.hrtime.bigint() - started) / 1e6,
          event: JSON.parse(line),
        });
      } catch (_error) {
        // Preserve malformed raw output; normalization reports missing usage instead of inventing it.
      }
    }
  });
  child.stderr.on("data", (chunk) => {
    stderr += chunk;
    artifactBytes += Buffer.byteLength(chunk);
    if (artifactBytes > ARTIFACT_MAX_BYTES) {
      timedOut = true;
      child.kill("SIGTERM");
    }
  });
  const completion = await new Promise((resolve) => {
    child.on("error", (error) => resolve({ exitCode: 1, signal: null, spawnError: error.message }));
    child.on("close", (exitCode, signal) => resolve({ exitCode: exitCode ?? 1, signal, spawnError: null }));
  });
  clearTimeout(timer);
  const processExitMs = Number(process.hrtime.bigint() - started) / 1e6;
  safeWrite(path.join(artifactDirectory, "stdout.jsonl"), redactArtifactText(stdout));
  safeWrite(path.join(artifactDirectory, "stderr.log"), redactArtifactText(stderr));
  safeWrite(path.join(artifactDirectory, "events.timed.jsonl"), timedEvents
    .map((entry) => JSON.stringify(entry)).join("\n") + (timedEvents.length ? "\n" : ""));
  const normalized = normalizeCodexRun({
    timedEvents,
    processExitMs,
    exitCode: completion.exitCode,
    timedOut,
  });
  const markdownPaths = [...normalized.skills_opened, ...normalized.references_opened];
  normalized.markdown_bytes_read = markdownPaths.reduce((sum, observed) => {
    const suffix = observed.replace(/^.*?(?=(?:rainskills|rainbond-[^/]+)\/)/, "");
    const candidate = path.join(workspace, ".agents", "skills", suffix);
    return sum + (fs.existsSync(candidate) ? fs.statSync(candidate).size : 0);
  }, 0);
  fs.rmSync(workspace, { recursive: true, force: true });
  return {
    scenario_id: scenario.id,
    benchmark_layer: "codex_host",
    data_source: "codex_exec_json",
    run_role: "baseline",
    environment: {
      active_skill_bundle_digest: bundle.digest,
      prompt_sha256: sha256(prompt),
      fixture_sha256: sha256(canonicalJson(fixture)),
      session_mode: "fresh_session",
      test_environment: options.fixtureOnly ? "fixture_only" : "unavailable",
      reset_method: "fresh temporary workspace",
      cleanup_result: "success",
    },
    ...normalized,
    timed_out: timedOut,
    exit_code: completion.exitCode,
    signal: completion.signal,
    spawn_error: completion.spawnError,
    artifact_directory: artifactDirectory,
    behavior_assertions: effectCase.expected_behaviors,
  };
}

function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function mad(values) {
  const center = median(values);
  return median(values.map((value) => Math.abs(value - center)));
}

function summarize(records) {
  const grouped = new Map();
  for (const record of records) {
    const list = grouped.get(record.scenario_id) || [];
    list.push(record);
    grouped.set(record.scenario_id, list);
  }
  return [...grouped].map(([scenarioId, values]) => {
    const observed = values.filter((value) => typeof value.timing?.process_exit_ms === "number");
    const timings = observed.map((value) => value.timing.process_exit_ms);
    return {
      scenario_id: scenarioId,
      planned_runs: values.length,
      observed_runs: observed.length,
      process_exit_p50_ms: timings.length ? median(timings) : unavailableValue(),
      process_exit_mad_ms: timings.length ? mad(timings) : unavailableValue(),
      process_exit_p95_ms: timings.length
        ? [...timings].sort((a, b) => a - b)[Math.ceil(timings.length * 0.95) - 1]
        : unavailableValue(),
      failure_rate: observed.length
        ? values.filter((value) => value.result === "failed").length / values.length
        : unavailableValue(),
      timeout_rate: observed.length
        ? values.filter((value) => value.timed_out === true).length / values.length
        : unavailableValue(),
      cleanup_failure_rate: observed.length
        ? values.filter((value) => value.environment?.cleanup_result === "failed").length / values.length
        : unavailableValue(),
    };
  });
}

function parseArgs(argv) {
  const options = {
    execute: false,
    fixtureOnly: false,
    label: "phase0-a-only",
    model: "gpt-5.6-sol",
    reasoningEffort: "high",
    repetitions: 1,
    primaryRepetitions: 3,
    timeoutMs: 180_000,
    output: null,
    artifactRoot: null,
    scenario: null,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--execute") { options.execute = true; continue; }
    if (argument === "--fixture-only") { options.execute = true; options.fixtureOnly = true; continue; }
    const value = argv[index + 1];
    if (!value || value.startsWith("--")) throw new Error(`missing value for ${argument}`);
    if (argument === "--label") options.label = value;
    else if (argument === "--model") options.model = value;
    else if (argument === "--reasoning-effort") options.reasoningEffort = value;
    else if (argument === "--repetitions") options.repetitions = Number(value);
    else if (argument === "--primary-repetitions") options.primaryRepetitions = Number(value);
    else if (argument === "--timeout-ms") options.timeoutMs = Number(value);
    else if (argument === "--output") options.output = path.resolve(value);
    else if (argument === "--artifact-root") options.artifactRoot = path.resolve(value);
    else if (argument === "--scenario") options.scenario = value;
    else throw new Error(`unknown argument: ${argument}`);
    index += 1;
  }
  for (const [name, value, min, max] of [
    ["repetitions", options.repetitions, 1, 20],
    ["primary-repetitions", options.primaryRepetitions, 1, 20],
    ["timeout-ms", options.timeoutMs, 1_000, 900_000],
  ]) if (!Number.isSafeInteger(value) || value < min || value > max) throw new Error(`invalid ${name}`);
  return options;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const git = gitState(root);
  const packageVersion = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8")).version;
  const cases = new Map(loadEffectCases({ root }).map((entry) => [entry.id, entry]));
  const allScenarios = parseScenarioConfig(root);
  const scenarios = options.scenario
    ? allScenarios.filter((scenario) => scenario.id === options.scenario)
    : allScenarios;
  if (options.scenario && scenarios.length !== 1) throw new Error(`unknown scenario: ${options.scenario}`);
  const manifestDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "rainskills-host-manifest-"));
  const manifestPath = path.join(manifestDirectory, "manifest.json");
  buildSkillManifest({ source_root: root, output: manifestPath, revision: git.sha });
  const skillManifestDigest = sha256(fs.readFileSync(manifestPath));
  fs.rmSync(manifestDirectory, { recursive: true, force: true });
  options.artifactRoot ||= path.join(os.tmpdir(), "rainskills-host-evals", options.label);
  fs.mkdirSync(options.artifactRoot, { recursive: true, mode: 0o700 });
  fs.chmodSync(options.artifactRoot, 0o700);
  const records = [];
  const runStartedAt = new Date().toISOString();
  for (const scenario of scenarios) {
    const effectCase = cases.get(scenario.effect_case_id);
    const runs = scenario.id === "deploy-current-project"
      ? options.primaryRepetitions
      : options.repetitions;
    for (let repetition = 1; repetition <= runs; repetition += 1) {
      if (!options.execute) {
        records.push(unavailableScenario({ scenarioId: scenario.id, reason: "host execution not requested" }));
      } else if (!options.fixtureOnly && WRITE_SCENARIOS.has(scenario.id)) {
        records.push(unavailableScenario({
          scenarioId: scenario.id,
          reason: "controlled Rainbond test environment, reset, and cleanup are unavailable",
        }));
      } else {
        records.push(await executeCodex({ root, scenario, effectCase, options, repetition }));
      }
    }
  }
  const output = {
    schema: HOST_SCHEMA,
    benchmark_layer: "codex_host",
    run_role: "baseline",
    control_status: !options.execute ? "unavailable" : options.fixtureOnly ? "uncontrolled" : "controlled",
    environment: {
      base_sha: git.clean ? git.sha : null,
      candidate_sha: null,
      worktree_clean: git.clean,
      model_id: options.model,
      reasoning_effort: options.reasoningEffort,
      codex_build: execFileSync("codex", ["--version"], { encoding: "utf8" }).trim(),
      host_toolset_digest: unavailableValue(),
      rainbond_catalog_digest: unavailableValue(),
      skill_manifest_digest: skillManifestDigest,
      rainskills_package_version: packageVersion,
      rainskills_cli_version: packageVersion,
      rainskills_protocol_version: "rainskills.single-runtime-contract.v1",
      rainbond_platform_version: unavailableValue(),
      validator_digest: sha256(fs.readFileSync(fileURLToPath(import.meta.url))),
      run_started_at: runStartedAt,
      test_environment: options.fixtureOnly ? "fixture_only" : unavailableValue(),
    },
    summary: summarize(records),
    scenarios: records,
  };
  const serialized = `${JSON.stringify(output, null, 2)}\n`;
  if (options.output) {
    fs.mkdirSync(path.dirname(options.output), { recursive: true });
    fs.writeFileSync(options.output, serialized);
  } else process.stdout.write(serialized);
}

if (path.resolve(process.argv[1] || "") === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
    process.exitCode = 1;
  });
}
