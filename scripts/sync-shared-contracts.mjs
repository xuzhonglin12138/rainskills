#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const scriptRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const communitySkills = Object.freeze([
  "rainbond-ai-assistant",
  "rainbond-app-assistant",
  "rainbond-app-version-assistant",
  "rainbond-delivery-verifier",
  "rainbond-env-sync",
  "rainbond-fullstack-bootstrap",
  "rainbond-fullstack-troubleshooter",
  "rainbond-opensource-app-deploy",
  "rainbond-platform-plugin-manager",
  "rainbond-project-init",
  "rainbond-template-installer",
]);

function parseArgs(argv) {
  let sourceRoot = scriptRoot;
  let check = false;
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--check") {
      check = true;
      continue;
    }
    if (argument === "--source-root" && argv[index + 1]) {
      sourceRoot = path.resolve(argv[index + 1]);
      index += 1;
      continue;
    }
    throw new Error("Usage: node scripts/sync-shared-contracts.mjs [--source-root <path>] [--check]");
  }
  return { sourceRoot, check };
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function writeAtomically(filePath, content) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true, mode: 0o755 });
  const temporary = `${filePath}.tmp-${process.pid}`;
  fs.writeFileSync(temporary, content, { encoding: "utf8", mode: 0o644 });
  fs.renameSync(temporary, filePath);
}

function markdownFiles(root) {
  const files = [];
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    const entryPath = path.join(root, entry.name);
    if (entry.isDirectory()) files.push(...markdownFiles(entryPath));
    else if (entry.name.endsWith(".md")) files.push(entryPath);
  }
  return files;
}

function run({ sourceRoot, check }) {
  const canonicalPath = path.join(sourceRoot, "contracts", "shared", "community-card.md");
  const canonical = fs.readFileSync(canonicalPath, "utf8");
  if ((canonical.match(/<!-- rainskills-community-card:start -->/g) || []).length !== 1
    || (canonical.match(/<!-- rainskills-community-card:end -->/g) || []).length !== 1) {
    throw new Error("canonical Community Card markers are invalid");
  }
  const digest = sha256(canonical);
  const expected = `<!-- generated-by: scripts/sync-shared-contracts.mjs -->\n<!-- source-sha256: ${digest} -->\n${canonical.trimEnd()}\n`;
  const stale = [];
  for (const skillId of communitySkills) {
    const skillRoot = path.join(sourceRoot, skillId);
    const generatedPath = path.join(skillRoot, "references", "generated", "community-card.md");
    const current = fs.existsSync(generatedPath) ? fs.readFileSync(generatedPath, "utf8") : null;
    if (current !== expected) {
      stale.push(path.relative(sourceRoot, generatedPath));
      if (!check) writeAtomically(generatedPath, expected);
    }
    const editableFiles = markdownFiles(skillRoot).filter((file) => file !== generatedPath);
    for (const file of editableFiles) {
      if (fs.readFileSync(file, "utf8").includes("<!-- rainskills-community-card:start -->")) {
        throw new Error(`editable Community Card remains in ${path.relative(sourceRoot, file)}`);
      }
    }
    if (!editableFiles.some((file) => fs.readFileSync(file, "utf8").includes("generated/community-card.md"))) {
      throw new Error(`${skillId} does not discover its generated Community Card`);
    }
  }
  if (check && stale.length > 0) throw new Error(`generated Community Card is stale: ${stale.join(", ")}`);
}

try {
  run(parseArgs(process.argv.slice(2)));
} catch (error) {
  process.stderr.write(`Shared contract synchronization failed: ${error.message}\n`);
  process.exitCode = 1;
}
