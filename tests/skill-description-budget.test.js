"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const YAML = require("yaml");

const root = path.resolve(__dirname, "..");

function description(relativePath) {
  const source = fs.readFileSync(path.join(root, relativePath), "utf8");
  const frontmatter = source.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  assert(frontmatter, `${relativePath} must have frontmatter`);
  return YAML.parse(frontmatter[1]).description;
}

test("app assistant discovery metadata is compact and preserves routing boundaries", () => {
  const value = description("rainbond-app-assistant/SKILL.md");
  assert(Buffer.byteLength(value, "utf8") <= 450, "top-level description exceeds 450-byte budget");
  assert.match(value, /Rainbond|Rainskills/);
  assert.match(value, /rainbond\.app\.json/);
  assert.match(value, /\.rainbond\/local\.json/);
  assert.match(value, /ordinary Git/i);
  assert.match(value, /rainbond-opensource-app-deploy/);
  assert.match(value, /rainbond-template-installer/);
});
