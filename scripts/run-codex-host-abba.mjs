#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { execFileSync, spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const SCENARIOS = [
  "deploy-current-project",
  "deploy-bare-git",
  "create-three-component-topology",
  "diagnose-missing-dependency",
  "verify-same-host-api-failure",
  "initialize-monorepo",
  "install-plugin-and-resume-ai",
  "reject-unsupported-multimodal-bypass",
];

function median(values) {
  if (!values.length) return "unavailable";
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function seededNumber(seed, value) {
  return Number.parseInt(crypto.createHash("sha256").update(`${seed}:${value}`).digest("hex").slice(0, 13), 16);
}

export function buildPairPlan({ primaryPairs = 20, exploratoryPairs = 1, seed }) {
  if (primaryPairs % 2 !== 0) throw new Error("primary-pairs must be even");
  const stablePrimary = Array.from({ length: primaryPairs }, (_, index) => ({
    order: index < primaryPairs / 2 ? "AB" : "BA",
    key: seededNumber(seed, `primary:${index}`),
  })).sort((left, right) => left.key - right.key);

  const plan = stablePrimary.map((entry, index) => ({
    scenario_id: SCENARIOS[0],
    pair_index: index + 1,
    order: entry.order,
    primary: true,
  }));
  for (const [scenarioIndex, scenarioId] of SCENARIOS.slice(1).entries()) {
    for (let pairIndex = 1; pairIndex <= exploratoryPairs; pairIndex += 1) {
      const order = seededNumber(seed, `exploratory:${scenarioId}:${pairIndex}`) % 2 === 0 ? "AB" : "BA";
      plan.push({
        scenario_id: scenarioId,
        pair_index: pairIndex,
        order,
        primary: false,
        scenario_order: scenarioIndex + 2,
      });
    }
  }
  return plan;
}

function numericAt(record, pathParts) {
  let value = record;
  for (const part of pathParts) value = value?.[part];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function summarizePairs(records, plan) {
  const pairs = plan.map((pair) => {
    const matching = records.filter((record) => record.scenario_id === pair.scenario_id
      && record.pair_index === pair.pair_index);
    return {
      ...pair,
      base: matching.find((record) => record.run_role === "base") || null,
      candidate: matching.find((record) => record.run_role === "candidate") || null,
    };
  });
  const metricDefinitions = [
    ["input_tokens", ["usage", "input_tokens"]],
    ["uncached_input_tokens", ["usage", "uncached_input_tokens"]],
    ["cached_input_tokens", ["usage", "cached_input_tokens"]],
    ["output_tokens", ["usage", "output_tokens"]],
    ["total_tokens", ["usage", "total_tokens"]],
    ["process_exit_ms", ["timing", "process_exit_ms"]],
    ["turn_completed_ms", ["timing", "turn_completed_ms"]],
  ];
  const summarizeMetric = (selectedPairs, pathParts) => {
    const observed = selectedPairs.flatMap((pair) => {
      const base = numericAt(pair.base, pathParts);
      const candidate = numericAt(pair.candidate, pathParts);
      return base !== null && candidate !== null && base > 0
        ? [{ order: pair.order, base, candidate, relative_change: (candidate - base) / base }]
        : [];
    });
    const changes = observed.map((entry) => entry.relative_change);
    const byOrder = (order) => observed.filter((entry) => entry.order === order)
      .map((entry) => entry.relative_change);
    return {
      observed_pairs: observed.length,
      base_p50: median(observed.map((entry) => entry.base)),
      candidate_p50: median(observed.map((entry) => entry.candidate)),
      pairwise_relative_change_median: median(changes),
      improved_pairs: observed.filter((entry) => entry.relative_change < 0).length,
      tied_pairs: observed.filter((entry) => entry.relative_change === 0).length,
      worsened_pairs: observed.filter((entry) => entry.relative_change > 0).length,
      ab_relative_change_median: median(byOrder("AB")),
      ba_relative_change_median: median(byOrder("BA")),
    };
  };
  const primaryPairs = pairs.filter((pair) => pair.primary);
  return {
    planned_pairs: pairs.length,
    complete_pairs: pairs.filter((pair) => pair.base && pair.candidate).length,
    planned_runs: pairs.length * 2,
    observed_runs: records.length,
    failures: records.filter((record) => record.result === "failed").length,
    blocked: records.filter((record) => record.result === "blocked").length,
    timeouts: records.filter((record) => record.timed_out === true).length,
    primary: Object.fromEntries(metricDefinitions.map(([name, pathParts]) => [
      name,
      summarizeMetric(primaryPairs, pathParts),
    ])),
    all_pairs: Object.fromEntries(metricDefinitions.map(([name, pathParts]) => [
      name,
      summarizeMetric(pairs, pathParts),
    ])),
  };
}

function parseArgs(argv) {
  const options = {
    baseRoot: null,
    candidateRoot: null,
    baseSha: null,
    candidateSha: null,
    output: null,
    artifactRoot: null,
    seed: "rainskills-phase1-5-abba-2026-10-09-v1",
    model: "gpt-5.6-sol",
    reasoningEffort: "high",
    timeoutMs: 180_000,
    primaryPairs: 20,
    exploratoryPairs: 1,
    providerName: null,
    providerBaseUrl: null,
    providerWireApi: "responses",
    providerRequiresOpenAIAuth: true,
    providerSupportsWebsockets: false,
    planOnly: false,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--plan-only") { options.planOnly = true; continue; }
    const value = argv[index + 1];
    if (!value || value.startsWith("--")) throw new Error(`missing value for ${argument}`);
    if (argument === "--base-root") options.baseRoot = path.resolve(value);
    else if (argument === "--candidate-root") options.candidateRoot = path.resolve(value);
    else if (argument === "--base-sha") options.baseSha = value;
    else if (argument === "--candidate-sha") options.candidateSha = value;
    else if (argument === "--output") options.output = path.resolve(value);
    else if (argument === "--artifact-root") options.artifactRoot = path.resolve(value);
    else if (argument === "--seed") options.seed = value;
    else if (argument === "--model") options.model = value;
    else if (argument === "--reasoning-effort") options.reasoningEffort = value;
    else if (argument === "--timeout-ms") options.timeoutMs = Number(value);
    else if (argument === "--primary-pairs") options.primaryPairs = Number(value);
    else if (argument === "--exploratory-pairs") options.exploratoryPairs = Number(value);
    else if (argument === "--provider-name") options.providerName = value;
    else if (argument === "--provider-base-url") options.providerBaseUrl = value;
    else if (argument === "--provider-wire-api") options.providerWireApi = value;
    else if (argument === "--provider-requires-openai-auth") options.providerRequiresOpenAIAuth = value === "true";
    else if (argument === "--provider-supports-websockets") options.providerSupportsWebsockets = value === "true";
    else throw new Error(`unknown argument: ${argument}`);
    index += 1;
  }
  for (const required of ["baseRoot", "candidateRoot", "baseSha", "candidateSha", "output", "artifactRoot"]) {
    if (!options[required]) throw new Error(`missing --${required.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}`);
  }
  if (options.primaryPairs < 2 || options.primaryPairs > 100 || options.primaryPairs % 2 !== 0) {
    throw new Error("primary-pairs must be an even integer between 2 and 100");
  }
  if (!Number.isSafeInteger(options.exploratoryPairs) || options.exploratoryPairs < 0 || options.exploratoryPairs > 20) {
    throw new Error("exploratory-pairs must be an integer between 0 and 20");
  }
  return options;
}

function safeWriteJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temporary = `${file}.tmp`;
  fs.writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 });
  fs.renameSync(temporary, file);
  fs.chmodSync(file, 0o600);
}

function cleanGitState(root) {
  const sha = execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim();
  const status = execFileSync("git", ["status", "--porcelain"], { cwd: root, encoding: "utf8" }).trim();
  return { sha, clean: status === "" };
}

function runChild(args, cwd) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, args, { cwd, stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.on("error", reject);
    child.on("close", (exitCode) => {
      if (exitCode !== 0) reject(new Error(`host runner exited ${exitCode}: ${stderr.trim()}`));
      else resolve({ stdout, stderr });
    });
  });
}

function outputEnvelope(options, plan, records) {
  return {
    schema: "rainskills.codex-host-abba.v1",
    experiment: {
      experiment_id: "aggregate-phase1-5-host-abba",
      treatment: "cumulative Phase 1-5 candidate versus frozen Phase 0 base",
      base_sha: options.baseSha,
      candidate_sha: options.candidateSha,
      primary_scenario: SCENARIOS[0],
      primary_metric: "input_tokens",
      minimum_effect: "pairwise median reduction >= 40%",
      secondary_latency_target: "pairwise process-exit median reduction >= 20%",
      run_order_seed: options.seed,
      control_status: "uncontrolled_fixture_only",
    },
    environment: {
      model_id: options.model,
      reasoning_effort: options.reasoningEffort,
      session_mode: "fresh_session",
      fixture_only: true,
      provider_name: options.providerName,
      provider_base_url: options.providerBaseUrl,
      provider_wire_api: options.providerWireApi,
      codex_build: options.codexBuild,
      host_runner_sha256: options.hostRunnerDigest,
      base_worktree_clean: options.baseWorktreeClean,
      candidate_worktree_clean: options.candidateWorktreeClean,
    },
    plan,
    summary: summarizePairs(records, plan),
    records,
    updated_at: new Date().toISOString(),
  };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const harnessRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const runner = path.join(harnessRoot, "scripts", "run-codex-host-evals.mjs");
  const baseGit = cleanGitState(options.baseRoot);
  const candidateGit = cleanGitState(options.candidateRoot);
  if (!baseGit.clean || baseGit.sha !== options.baseSha) {
    throw new Error("base source root must be clean and match base-sha");
  }
  if (!candidateGit.clean || candidateGit.sha !== options.candidateSha) {
    throw new Error("candidate source root must be clean and match candidate-sha");
  }
  options.codexBuild = execFileSync("codex", ["--version"], { encoding: "utf8" }).trim();
  options.hostRunnerDigest = crypto.createHash("sha256").update(fs.readFileSync(runner)).digest("hex");
  options.baseWorktreeClean = baseGit.clean;
  options.candidateWorktreeClean = candidateGit.clean;
  const plan = buildPairPlan({
    primaryPairs: options.primaryPairs,
    exploratoryPairs: options.exploratoryPairs,
    seed: options.seed,
  });
  let records = [];
  if (fs.existsSync(options.output)) {
    const existing = JSON.parse(fs.readFileSync(options.output, "utf8"));
    if (existing.experiment?.base_sha !== options.baseSha
      || existing.experiment?.candidate_sha !== options.candidateSha
      || existing.experiment?.run_order_seed !== options.seed) {
      throw new Error("existing output does not match requested experiment");
    }
    records = existing.records || [];
  }
  safeWriteJson(options.output, outputEnvelope(options, plan, records));
  if (options.planOnly) return;

  for (const pair of plan) {
    const roles = pair.order === "AB" ? ["base", "candidate"] : ["candidate", "base"];
    for (const [position, role] of roles.entries()) {
      const existing = records.find((record) => record.scenario_id === pair.scenario_id
        && record.pair_index === pair.pair_index && record.run_role === role);
      if (existing) continue;
      const sourceRoot = role === "base" ? options.baseRoot : options.candidateRoot;
      const runKey = `${pair.scenario_id}/pair-${pair.pair_index}/${role}`;
      process.stdout.write(`[start] ${runKey} order=${pair.order} position=${position + 1}\n`);
      const artifactRoot = path.join(options.artifactRoot, pair.scenario_id, `pair-${pair.pair_index}`, role);
      const temporaryOutput = path.join(artifactRoot, "normalized.json");
      const args = [
        runner,
        "--fixture-only",
        "--source-root", sourceRoot,
        "--run-role", role,
        "--base-sha", options.baseSha,
        "--candidate-sha", options.candidateSha,
        "--run-order-seed", options.seed,
        "--scenario", pair.scenario_id,
        "--repetitions", "1",
        "--primary-repetitions", "1",
        "--model", options.model,
        "--reasoning-effort", options.reasoningEffort,
        "--timeout-ms", String(options.timeoutMs),
        "--artifact-root", path.join(artifactRoot, "raw"),
        "--output", temporaryOutput,
      ];
      if (options.providerName) {
        args.push(
          "--provider-name", options.providerName,
          "--provider-base-url", options.providerBaseUrl,
          "--provider-wire-api", options.providerWireApi,
          "--provider-requires-openai-auth", String(options.providerRequiresOpenAIAuth),
          "--provider-supports-websockets", String(options.providerSupportsWebsockets),
        );
      }
      await runChild(args, harnessRoot);
      const childOutput = JSON.parse(fs.readFileSync(temporaryOutput, "utf8"));
      const record = childOutput.scenarios[0];
      record.pair_index = pair.pair_index;
      record.pair_order = pair.order;
      record.pair_position = position + 1;
      record.primary = pair.primary;
      record.source_sha = role === "base" ? options.baseSha : options.candidateSha;
      records.push(record);
      safeWriteJson(options.output, outputEnvelope(options, plan, records));
      process.stdout.write(`[done] ${runKey} result=${record.result} input=${record.usage?.input_tokens ?? "unavailable"} output=${record.usage?.output_tokens ?? "unavailable"} ms=${Math.round(record.timing?.process_exit_ms || 0)}\n`);
    }
  }
}

if (path.resolve(process.argv[1] || "") === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
    process.exitCode = 1;
  });
}
