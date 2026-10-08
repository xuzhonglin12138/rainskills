#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDirectory, "..", "..");

const SKILLS = Object.freeze([
  "rainskills",
  "rainbond-ai-assistant",
  "rainbond-app-assistant",
  "rainbond-app-version-assistant",
  "rainbond-delivery-verifier",
  "rainbond-env-sync",
  "rainbond-fullstack-bootstrap",
  "rainbond-fullstack-troubleshooter",
  "rainbond-opensource-app-deploy",
  "rainbond-platform-installer",
  "rainbond-platform-plugin-manager",
  "rainbond-platform-query",
  "rainbond-project-init",
  "rainbond-template-installer",
]);

const CONTROL_PROMPT = "Do not use tools or skills. Reply with exactly READY.";

function skillPrompt(skill) {
  return [
    `Use the $${skill} skill.`,
    "Do not call Rainbond, shell, web, browser, or any external tool.",
    "Do not modify files or read supporting references.",
    "Reply with exactly READY.",
  ].join(" ");
}

function parseArgs(argv) {
  const result = {
    label: "before",
    model: "gpt-5.6-sol",
    reasoningEffort: "high",
    repetitions: 1,
    output: null,
  };
  const allowed = new Set([
    "--label",
    "--model",
    "--reasoning-effort",
    "--repetitions",
    "--output",
  ]);
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (!allowed.has(argument)) throw new Error(`unknown argument: ${argument}`);
    const value = argv[index + 1];
    if (!value || value.startsWith("--")) throw new Error(`missing value for ${argument}`);
    if (argument === "--label") result.label = value;
    if (argument === "--model") result.model = value;
    if (argument === "--reasoning-effort") result.reasoningEffort = value;
    if (argument === "--repetitions") result.repetitions = Number(value);
    if (argument === "--output") result.output = path.resolve(value);
    index += 1;
  }
  if (!/^[a-zA-Z0-9._-]+$/.test(result.label)) {
    throw new Error("label must contain only letters, digits, dot, underscore, or dash");
  }
  if (!Number.isSafeInteger(result.repetitions) || result.repetitions < 1 || result.repetitions > 20) {
    throw new Error("repetitions must be an integer between 1 and 20");
  }
  result.output ||= path.join(scriptDirectory, "results", result.label);
  return result;
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function readFileIfPresent(file) {
  return fs.existsSync(file) ? fs.readFileSync(file) : Buffer.alloc(0);
}

function skillDigest(skill) {
  const skillRoot = path.join(os.homedir(), ".codex", "skills", skill);
  const skillFile = path.join(skillRoot, "SKILL.md");
  if (!fs.existsSync(skillFile)) throw new Error(`installed Skill is missing: ${skillFile}`);
  const content = fs.readFileSync(skillFile);
  return {
    path: skillFile,
    bytes: content.length,
    sha256: sha256(content),
  };
}

export function parseJsonl(text) {
  const events = [];
  for (const [index, line] of String(text).split(/\r?\n/).entries()) {
    if (!line.trim()) continue;
    try {
      events.push(JSON.parse(line));
    } catch (error) {
      throw new Error(`invalid JSONL at line ${index + 1}: ${error.message}`);
    }
  }
  return events;
}

function requireNonNegativeInteger(value, label) {
  if (!Number.isSafeInteger(value) || value < 0) throw new Error(`invalid ${label}`);
  return value;
}

export function summarizeCodexEvents(events) {
  const completed = events.filter((event) => event?.type === "turn.completed");
  if (completed.length !== 1 || !completed[0].usage) {
    throw new Error("missing turn.completed usage");
  }
  const usage = completed[0].usage;
  const inputTokens = requireNonNegativeInteger(usage.input_tokens, "input_tokens");
  const cachedInputTokens = requireNonNegativeInteger(
    usage.cached_input_tokens ?? 0,
    "cached_input_tokens"
  );
  const cacheWriteInputTokens = requireNonNegativeInteger(
    usage.cache_write_input_tokens ?? 0,
    "cache_write_input_tokens"
  );
  const outputTokens = requireNonNegativeInteger(usage.output_tokens, "output_tokens");
  const reasoningOutputTokens = requireNonNegativeInteger(
    usage.reasoning_output_tokens ?? 0,
    "reasoning_output_tokens"
  );
  if (cachedInputTokens > inputTokens) throw new Error("cached input exceeds input tokens");
  if (reasoningOutputTokens > outputTokens) throw new Error("reasoning output exceeds output tokens");
  const threadId = events.find((event) => event?.type === "thread.started")?.thread_id ?? null;
  const messages = events
    .filter((event) => event?.type === "item.completed" && event.item?.type === "agent_message")
    .map((event) => event.item.text);
  return {
    threadId,
    agentMessage: messages.at(-1) ?? null,
    usage: {
      inputTokens,
      cachedInputTokens,
      cacheWriteInputTokens,
      uncachedInputTokens: inputTokens - cachedInputTokens,
      outputTokens,
      reasoningOutputTokens,
      totalTokens: inputTokens + outputTokens,
    },
  };
}

function runCodex({ prompt, model, reasoningEffort }) {
  return new Promise((resolve, reject) => {
    const started = process.hrtime.bigint();
    let firstItemAt = null;
    let stdout = "";
    let stderr = "";
    const child = spawn(
      "codex",
      [
        "exec",
        "--json",
        "--ephemeral",
        "-m",
        model,
        "-c",
        `model_reasoning_effort=${JSON.stringify(reasoningEffort)}`,
        "-s",
        "read-only",
        "-C",
        repositoryRoot,
        prompt,
      ],
      {
        cwd: repositoryRoot,
        env: { ...process.env, RAINSKILLS_TELEMETRY_DISABLED: "1" },
        stdio: ["ignore", "pipe", "pipe"],
      }
    );
    let pending = "";
    child.stdout.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
      pending += chunk;
      const lines = pending.split(/\r?\n/);
      pending = lines.pop() ?? "";
      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const event = JSON.parse(line);
          if (firstItemAt === null && (event.type === "item.started" || event.type === "item.completed")) {
            firstItemAt = process.hrtime.bigint();
          }
        } catch {
          // The complete parser reports malformed JSONL after process exit.
        }
      }
    });
    child.stderr.setEncoding("utf8");
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("error", reject);
    child.on("close", (exitCode, signal) => {
      const finished = process.hrtime.bigint();
      if (exitCode !== 0) {
        reject(new Error(`codex exec failed with exit=${exitCode} signal=${signal ?? "none"}`));
        return;
      }
      try {
        const summary = summarizeCodexEvents(parseJsonl(stdout));
        resolve({
          ...summary,
          endToEndMs: Number(finished - started) / 1e6,
          timeToFirstItemMs: firstItemAt === null ? null : Number(firstItemAt - started) / 1e6,
          stderrLineCount: stderr.split(/\r?\n/).filter(Boolean).length,
          stderrSha256: sha256(stderr),
        });
      } catch (error) {
        reject(error);
      }
    });
  });
}

function average(values) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function median(values) {
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[middle - 1] + sorted[middle]) / 2
    : sorted[middle];
}

function aggregateRuns(runs, controlInputMedian) {
  const byScenario = new Map();
  for (const run of runs) {
    const list = byScenario.get(run.scenarioId) ?? [];
    list.push(run);
    byScenario.set(run.scenarioId, list);
  }
  return [...byScenario.entries()].map(([scenarioId, values]) => ({
    scenarioId,
    skill: values[0].skill,
    repetitions: values.length,
    inputTokensMedian: median(values.map((value) => value.usage.inputTokens)),
    inputTokensAverage: average(values.map((value) => value.usage.inputTokens)),
    inputDeltaVsControl: scenarioId === "control"
      ? 0
      : median(values.map((value) => value.usage.inputTokens)) - controlInputMedian,
    outputTokensMedian: median(values.map((value) => value.usage.outputTokens)),
    cachedInputTokensMedian: median(values.map((value) => value.usage.cachedInputTokens)),
    endToEndMsMedian: median(values.map((value) => value.endToEndMs)),
    timeToFirstItemMsMedian: median(
      values.map((value) => value.timeToFirstItemMs).filter((value) => value !== null)
    ),
  }));
}

function renderReport(record) {
  const lines = [
    `# Rainskills Skill Token Baseline — ${record.label}`,
    "",
    `- Recorded at: ${record.recordedAt}`,
    `- Git commit: \`${record.environment.gitCommit}\``,
    `- Codex: \`${record.environment.codexVersion}\``,
    `- Model: \`${record.environment.model}\``,
    `- Reasoning effort: \`${record.environment.reasoningEffort}\``,
    `- Repetitions: ${record.environment.repetitions}`,
    `- Config SHA-256: \`${record.environment.codexConfigSha256}\``,
    "",
    "This is a fresh-session, read-only entrypoint measurement. It measures the real Codex input usage after explicitly selecting each installed Skill. It does not measure a full Rainbond deployment workflow.",
    "",
    "| Skill | SKILL.md bytes | Input tokens | Δ vs control | Output tokens | Cached input | End-to-end ms | First item ms |",
    "|---|---:|---:|---:|---:|---:|---:|---:|",
  ];
  for (const item of record.aggregates) {
    const digest = item.skill ? record.skillDigests[item.skill] : null;
    lines.push(
      `| ${item.skill ?? "control"} | ${digest?.bytes ?? "-"} | ${Math.round(item.inputTokensMedian)} | ${Math.round(item.inputDeltaVsControl)} | ${Math.round(item.outputTokensMedian)} | ${Math.round(item.cachedInputTokensMedian)} | ${item.endToEndMsMedian.toFixed(0)} | ${item.timeToFirstItemMsMedian.toFixed(0)} |`
    );
  }
  lines.push(
    "",
    "## Interpretation boundary",
    "",
    "- Cached input is already included in input tokens; reasoning output is already included in output tokens.",
    "- The control includes the global Codex instructions, tool schemas, conversation scaffold, and all discovered Skill metadata.",
    "- The per-Skill delta estimates the additional input caused by activating that Skill entrypoint for this fixed prompt.",
    "- One repetition is a baseline snapshot, not a statistically stable latency benchmark. Use paired AB/BA repetitions for performance claims.",
    "- No raw Codex JSONL or stderr is stored in the repository.",
    ""
  );
  return `${lines.join("\n")}\n`;
}

async function main(argv) {
  const options = parseArgs(argv);
  if (fs.existsSync(options.output)) throw new Error(`output already exists: ${options.output}`);
  const codexVersion = await new Promise((resolve, reject) => {
    const child = spawn("codex", ["--version"], { stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    child.stdout.setEncoding("utf8");
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.on("error", reject);
    child.on("close", (code) => code === 0 ? resolve(stdout.trim()) : reject(new Error("codex --version failed")));
  });
  const gitCommit = await new Promise((resolve, reject) => {
    const child = spawn("git", ["rev-parse", "HEAD"], { cwd: repositoryRoot, stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    child.stdout.setEncoding("utf8");
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.on("error", reject);
    child.on("close", (code) => code === 0 ? resolve(stdout.trim()) : reject(new Error("git rev-parse failed")));
  });
  const gitStatus = await new Promise((resolve, reject) => {
    const child = spawn("git", ["status", "--porcelain"], {
      cwd: repositoryRoot,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    child.stdout.setEncoding("utf8");
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.on("error", reject);
    child.on("close", (code) => code === 0 ? resolve(stdout) : reject(new Error("git status failed")));
  });
  const configFile = path.join(os.homedir(), ".codex", "config.toml");
  const skillDigests = Object.fromEntries(SKILLS.map((skill) => [skill, skillDigest(skill)]));
  const scenarios = [
    { scenarioId: "control", skill: null, prompt: CONTROL_PROMPT },
    ...SKILLS.map((skill) => ({ scenarioId: skill, skill, prompt: skillPrompt(skill) })),
  ];
  const runs = [];
  for (const scenario of scenarios) {
    for (let repetition = 1; repetition <= options.repetitions; repetition += 1) {
      process.stderr.write(`running ${scenario.scenarioId} (${repetition}/${options.repetitions})\n`);
      const result = await runCodex({
        prompt: scenario.prompt,
        model: options.model,
        reasoningEffort: options.reasoningEffort,
      });
      if (result.agentMessage !== "READY") {
        throw new Error(`${scenario.scenarioId} returned unexpected message`);
      }
      runs.push({
        scenarioId: scenario.scenarioId,
        skill: scenario.skill,
        repetition,
        promptSha256: sha256(scenario.prompt),
        ...result,
      });
    }
  }
  const controlRuns = runs.filter((run) => run.scenarioId === "control");
  const controlInputMedian = median(controlRuns.map((run) => run.usage.inputTokens));
  const record = {
    schema: "rainskills.skill-token-baseline.v1",
    label: options.label,
    recordedAt: new Date().toISOString(),
    environment: {
      repositoryRoot,
      gitCommit,
      worktreeClean: gitStatus.trim().length === 0,
      codexVersion,
      codexConfigSha256: sha256(readFileIfPresent(configFile)),
      model: options.model,
      reasoningEffort: options.reasoningEffort,
      repetitions: options.repetitions,
      sandbox: "read-only",
      sessionMode: "fresh_ephemeral",
    },
    skillDigests,
    runs,
    aggregates: aggregateRuns(runs, controlInputMedian),
  };
  fs.mkdirSync(options.output, { recursive: true, mode: 0o700 });
  fs.writeFileSync(path.join(options.output, "summary.json"), `${JSON.stringify(record, null, 2)}\n`, {
    encoding: "utf8",
    mode: 0o600,
    flag: "wx",
  });
  fs.writeFileSync(path.join(options.output, "report.md"), renderReport(record), {
    encoding: "utf8",
    mode: 0o600,
    flag: "wx",
  });
  process.stdout.write(`${path.join(options.output, "report.md")}\n`);
}

if (path.resolve(process.argv[1] || "") === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2)).catch((error) => {
    process.stderr.write(`error: ${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}
