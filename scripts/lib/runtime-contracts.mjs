import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import YAML from "yaml";

export const RUNTIME_SKILL_IDS = Object.freeze([
  "rainbond-ai-assistant", "rainbond-app-assistant", "rainbond-app-version-assistant",
  "rainbond-delivery-verifier", "rainbond-env-sync", "rainbond-fullstack-bootstrap",
  "rainbond-fullstack-troubleshooter", "rainbond-opensource-app-deploy",
  "rainbond-platform-plugin-manager", "rainbond-platform-query", "rainbond-project-init",
  "rainbond-template-installer",
]);
const OVERLAY_KEYS = Object.freeze([
  "schema", "skill_id", "profiles", "command_set", "version_guard",
  "missing_runtime_mode", "scope_discriminator", "resume_target", "invariants",
]);
const PROFILES = new Set(["cli", "embedded"]);
const COMMANDS = new Set([
  "context_resolve", "list", "describe", "read", "query", "package_upload",
  "delivery_probe", "call", "call_confirm",
]);
const VERSION_GUARDS = new Set(["required", "none"]);
const MISSING_RUNTIME_MODES = new Set([
  "new_application", "existing_application", "linked_project", "ai_workload",
  "plugin_management", "read_only_query",
]);
const SCOPES = new Set(["workspace", "enterprise", "read_only"]);

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function assertEnum(value, values, label) {
  if (!values.has(value)) throw new Error(`${label} is invalid: ${value}`);
}

export function validateRuntimeOverlay(overlay, expectedSkillId = overlay?.skill_id) {
  if (!overlay || typeof overlay !== "object" || Array.isArray(overlay)) throw new Error("runtime overlay must be an object");
  const unknown = Object.keys(overlay).filter((key) => !OVERLAY_KEYS.includes(key));
  if (unknown.length > 0) throw new Error(`unknown overlay key: ${unknown.join(", ")}`);
  const missing = OVERLAY_KEYS.filter((key) => !(key in overlay));
  if (missing.length > 0) throw new Error(`missing overlay key: ${missing.join(", ")}`);
  if (overlay.schema !== "rainskills.runtime-overlay.v1") throw new Error("runtime overlay schema is invalid");
  if (overlay.skill_id !== expectedSkillId || !/^rainbond-[a-z0-9-]+$/.test(overlay.skill_id)) {
    throw new Error(`runtime overlay skill_id is invalid: ${overlay.skill_id}`);
  }
  for (const [label, values, allowed] of [["profiles", overlay.profiles, PROFILES], ["command_set", overlay.command_set, COMMANDS]]) {
    if (!Array.isArray(values) || values.length === 0 || new Set(values).size !== values.length) {
      throw new Error(`${label} must be a non-empty unique array`);
    }
    for (const value of values) assertEnum(value, allowed, label);
  }
  if (!overlay.profiles.includes("cli")) throw new Error("profiles must include cli");
  assertEnum(overlay.version_guard, VERSION_GUARDS, "version_guard");
  assertEnum(overlay.missing_runtime_mode, MISSING_RUNTIME_MODES, "missing_runtime_mode");
  assertEnum(overlay.scope_discriminator, SCOPES, "scope_discriminator");
  if (typeof overlay.resume_target !== "string" || !overlay.resume_target || overlay.resume_target.length > 80) throw new Error("resume_target is invalid");
  if (!Array.isArray(overlay.invariants) || overlay.invariants.length < 1 || overlay.invariants.length > 5 || overlay.invariants.some((value) => typeof value !== "string" || !value || value.length > 320)) {
    throw new Error("invariants must contain one to five bounded strings");
  }
  if (overlay.command_set.includes("query") && overlay.command_set.length !== 1) throw new Error("query is an exclusive read-only command set");
  if (overlay.command_set.includes("call_confirm") !== overlay.command_set.includes("call")) throw new Error("call and call_confirm must be declared together");
  if (!overlay.profiles.includes("embedded") && overlay.scope_discriminator === "enterprise") throw new Error("enterprise plugin management must support embedded profile");
  return overlay;
}

export function readRuntimeOverlay(sourceRoot, skillId) {
  const overlayPath = path.join(sourceRoot, "contracts", "runtime", "skills", `${skillId}.yaml`);
  return validateRuntimeOverlay(YAML.parse(fs.readFileSync(overlayPath, "utf8")), skillId);
}

function commandArgv(skillId, ...args) {
  return ["node", "<home>/.rainbond/bin/rainskills-tools.js", ...args, "--skill-id", skillId];
}

function buildCommand(skillId, command) {
  if (command === "context_resolve") return {
    argv: commandArgv(skillId, "context", "resolve", "--input", "-"),
    stdin: {
      default: { required: ["enterprise", "workspace"] },
      with_hints: { required: ["enterprise", "workspace"], hints: { team_name: "<team-name>" } },
      with_selection: { required: ["enterprise", "workspace"], selection: { option_id: "<option-id>" } },
    },
  };
  if (command === "list") return { argv: commandArgv(skillId, "list", "--prefix", "<tool-prefix>") };
  if (command === "describe") return { argv: commandArgv(skillId, "describe", "<tool-name>") };
  if (command === "read") return { argv: commandArgv(skillId, "read", "<tool>", "--input", "-"), stdin_schema_source: "tool-catalog" };
  if (command === "query") return { argv: commandArgv(skillId, "query", "<tool>", "--input", "-"), stdin_schema_source: "platform-query-allowlist" };
  if (command === "package_upload") return { argv: commandArgv(skillId, "package-upload", "--archive", "<archive-path>", "--input", "-"), stdin_schema_source: "rainbond_init_package_upload.upload_request" };
  if (command === "delivery_probe") return {
    argv: commandArgv(skillId, "delivery", "probe", "--input", "-"),
    policy_schema_source: "schemas/delivery-probe-policy.schema.yaml",
    stdin_schema_source: "schemas/delivery-probe-input.schema.yaml",
    result_schema_source: "schemas/delivery-probe-result.schema.yaml",
  };
  if (command === "call") return { argv: commandArgv(skillId, "call", "<tool>", "--input", "-"), stdin_schema_source: "tool-catalog" };
  if (command === "call_confirm") return { argv: [...commandArgv(skillId, "call", "<tool>", "--input", "-"), "--confirm", "<confirmation-id>"], stdin_schema_source: "same-confirmed-input" };
  throw new Error(`unsupported command: ${command}`);
}

function runtimeContract(packageVersion, overlay) {
  const inputCommands = {};
  for (const command of overlay.command_set) inputCommands[command] = buildCommand(overlay.skill_id, command);
  return {
    schema: "rainskills.single-runtime-contract.v1",
    package_version: `rainskills@${packageVersion}`,
    runtime_status: ["node", "<home>/.rainbond/lib/rainskills/bin/rainskills.js", "runtime", "status", "--json"],
    runtime_connect: {
      saas: ["node", "<home>/.rainbond/lib/rainskills/bin/rainskills.js", "runtime", "connect", "<target>", "--saas"],
      private_existing: ["node", "<home>/.rainbond/lib/rainskills/bin/rainskills.js", "runtime", "connect", "<target>", "--rainbond-url", "<console-origin>"],
      install_private: ["node", "<home>/.rainbond/lib/rainskills/bin/rainskills.js", "runtime", "connect", "<target>", "--install-private", "--location", "<local-or-server>"],
      reconnect: ["node", "<home>/.rainbond/lib/rainskills/bin/rainskills.js", "runtime", "reconnect", "<target>"],
    },
    input_commands: inputCommands,
  };
}

function fillTemplate(template, replacements) {
  let output = template;
  for (const [key, value] of Object.entries(replacements)) output = output.replaceAll(`{{${key}}}`, value);
  const unresolved = output.match(/\{\{[A-Z0-9_]+\}\}/g);
  if (unresolved) throw new Error(`unresolved runtime template value: ${unresolved.join(", ")}`);
  return output;
}

export function renderRuntimeGate({ sourceRoot, packageVersion, overlay, profile }) {
  validateRuntimeOverlay(overlay, overlay.skill_id);
  assertEnum(profile, PROFILES, "profile");
  if (!overlay.profiles.includes(profile)) throw new Error(`${overlay.skill_id} does not support ${profile} profile`);
  const baseName = profile === "cli" ? "cli-base.md" : "embedded-base.md";
  const base = fs.readFileSync(path.join(sourceRoot, "contracts", "runtime", baseName), "utf8");
  const schema = fs.readFileSync(path.join(sourceRoot, "contracts", "runtime", "overlay.schema.json"), "utf8");
  const canonicalOverlay = `${JSON.stringify(overlay, null, 2)}\n`;
  const sourceDigest = sha256(`${base}\0${schema}\0${canonicalOverlay}\0${packageVersion}\0${profile}`);
  const contextGuidance = overlay.command_set.includes("context_resolve")
    ? "`context resolve` 是无状态调用。首次 stdin 固定为 `{\"required\":[\"enterprise\",\"workspace\"]}` 字面请求体；显式 team/region 放入 `hints`，多候选选择通过 `selection.option_id` 重新查询验证。不得执行 `context select` 或写本地 context。所有可变 `call` 必须先取得 confirmation ID，再以完全相同输入追加 `--confirm` 执行一次。"
    : "本 Skill 不解析或持久化 workspace context，也不拥有 mutation 命令；只可执行 overlay 声明的固定只读命令。";
  const versionGuard = overlay.version_guard === "required"
    ? `运行状态的 \`package_version\` 必须与下方 JSON contract 完全一致；缺失或不一致时先执行固定版本 \`rainskills@${packageVersion}\` 的更新/修复流程。不得在版本错配时继续业务调用。`
    : "运行状态必须来自固定 launcher；不得使用未验证的替代 CLI 或传输。";
  const body = fillTemplate(base, {
    VERSION_GUARD: versionGuard,
    CONTEXT_GUIDANCE: contextGuidance,
    SKILL_ID: overlay.skill_id,
    SUPPORTED_PROFILES: overlay.profiles.join(", "),
    COMMAND_SET: overlay.command_set.join(", "),
    VERSION_GUARD_MODE: overlay.version_guard,
    MISSING_RUNTIME_MODE: overlay.missing_runtime_mode,
    SCOPE_DISCRIMINATOR: overlay.scope_discriminator,
    RESUME_TARGET: overlay.resume_target,
    INVARIANTS: overlay.invariants.map((value) => `- ${value}`).join("\n"),
    CONTRACT_JSON: profile === "cli" ? JSON.stringify(runtimeContract(packageVersion, overlay), null, 2) : "",
  });
  return `<!-- generated-by: scripts/sync-runtime-contracts.mjs -->\n<!-- source-sha256: ${sourceDigest} -->\n<!-- profile: ${profile} -->\n${body.trimEnd()}\n`;
}

function writeAtomically(filePath, content) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true, mode: 0o755 });
  const temporary = `${filePath}.tmp-${process.pid}`;
  fs.writeFileSync(temporary, content, { encoding: "utf8", mode: 0o644 });
  fs.renameSync(temporary, filePath);
}

export function syncRuntimeContracts({ sourceRoot, check = false, profile = "cli", skillIds = RUNTIME_SKILL_IDS }) {
  const packageInfo = JSON.parse(fs.readFileSync(path.join(sourceRoot, "package.json"), "utf8"));
  const stale = [];
  for (const skillId of skillIds) {
    const overlay = readRuntimeOverlay(sourceRoot, skillId);
    if (!overlay.profiles.includes(profile)) continue;
    const expected = renderRuntimeGate({ sourceRoot, packageVersion: packageInfo.version, overlay, profile });
    const generatedPath = path.join(sourceRoot, skillId, "references", "generated", "runtime-gate.md");
    const current = fs.existsSync(generatedPath) ? fs.readFileSync(generatedPath, "utf8") : null;
    if (current !== expected) {
      stale.push(path.relative(sourceRoot, generatedPath));
      if (!check) writeAtomically(generatedPath, expected);
    }
    if (profile === "cli") {
      const entrypoint = fs.readFileSync(path.join(sourceRoot, skillId, "SKILL.md"), "utf8");
      if (entrypoint.includes("<!-- rainskills-runtime-gate:start -->")) throw new Error(`${skillId} source SKILL.md still embeds the complete Runtime Gate`);
      if (!entrypoint.includes("references/generated/runtime-gate.md")) throw new Error(`${skillId} source SKILL.md does not load its generated Runtime Gate`);
      if (fs.existsSync(path.join(sourceRoot, skillId, "references", "runtime-gate.md"))) throw new Error(`${skillId} retains a legacy editable Runtime Gate`);
    }
  }
  if (check && stale.length > 0) throw new Error(`generated Runtime Gate is stale: ${stale.join(", ")}`);
  return stale;
}
