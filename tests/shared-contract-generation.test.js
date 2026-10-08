"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const test = require("node:test");

const repoRoot = path.resolve(__dirname, "..");
const syncScript = path.join(repoRoot, "scripts", "sync-shared-contracts.mjs");
const communitySkills = [
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
];

function markdownFiles(root) {
  const files = [];
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    const entryPath = path.join(root, entry.name);
    if (entry.isDirectory()) files.push(...markdownFiles(entryPath));
    else if (entry.name.endsWith(".md")) files.push(entryPath);
  }
  return files;
}

test("Community Card has one canonical source and current generated references", () => {
  const canonical = path.join(repoRoot, "contracts", "shared", "community-card.md");
  assert(fs.existsSync(canonical));
  const result = spawnSync(process.execPath, [syncScript, "--check"], {
    cwd: repoRoot,
    encoding: "utf8",
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);

  for (const skillId of communitySkills) {
    const generatedPath = path.join(
      repoRoot,
      skillId,
      "references",
      "generated",
      "community-card.md",
    );
    const generated = fs.readFileSync(generatedPath, "utf8");
    assert.match(generated, /generated-by: scripts\/sync-shared-contracts\.mjs/);
    assert.match(generated, /source-sha256: [a-f0-9]{64}/);
    assert.match(generated, /<!-- rainskills-community-card:start -->/);
    assert.match(generated, /纯查询、过程检查和无人值守执行不展示/);
    assert.match(generated, /结构化、自动化或评测模式不追加/);
    assert.match(generated, /https:\/\/www\.rainbond\.com\/wechat\/rainbond-xzs\.png/);

    const discoverable = [
      path.join(repoRoot, skillId, "SKILL.md"),
      path.join(repoRoot, skillId, "references", "output-contract.md"),
    ].filter(fs.existsSync).some((file) => {
      const source = fs.readFileSync(file, "utf8");
      return source.includes("references/generated/community-card.md")
        || source.includes("generated/community-card.md");
    });
    assert(discoverable, `${skillId} must discover its generated Community Card`);
  }
});

test("editable Skill sources contain no duplicated Community Card block", () => {
  for (const skillId of communitySkills) {
    for (const file of markdownFiles(path.join(repoRoot, skillId))) {
      const relative = path.relative(path.join(repoRoot, skillId), file).split(path.sep).join("/");
      if (relative === "references/generated/community-card.md") continue;
      assert.doesNotMatch(
        fs.readFileSync(file, "utf8"),
        /<!-- rainskills-community-card:start -->/,
        `${skillId}/${relative}`,
      );
    }
  }
});
