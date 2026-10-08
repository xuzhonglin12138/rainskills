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

test("open-source deploy discovery metadata is compact and preserves routing boundaries", () => {
  const value = description("rainbond-opensource-app-deploy/SKILL.md");
  assert(Buffer.byteLength(value, "utf8") <= 320, "specialist description exceeds 320-byte budget");
  assert.match(value, /Compose/i);
  assert.match(value, /Helm/i);
  assert.match(value, /image-set/i);
  assert.match(value, /named (?:third-party )?open-source suites/i);
  assert.match(value, /rainbond-app-assistant/);
  assert.match(value, /rainbond-template-installer/);
});

test("troubleshooter discovery metadata is compact and preserves routing boundaries", () => {
  const value = description("rainbond-fullstack-troubleshooter/SKILL.md");
  assert(Buffer.byteLength(value, "utf8") <= 320, "specialist description exceeds 320-byte budget");
  assert.match(value, /build/i);
  assert.match(value, /runtime/i);
  assert.match(value, /access/i);
  assert.match(value, /existing Rainbond app/i);
  assert.match(value, /rainbond-app-assistant/);
});

test("delivery verifier discovery metadata is compact and preserves routing boundaries", () => {
  const value = description("rainbond-delivery-verifier/SKILL.md");
  assert(Buffer.byteLength(value, "utf8") <= 320, "specialist description exceeds 320-byte budget");
  assert.match(value, /delivery/i);
  assert.match(value, /access/i);
  assert.match(value, /existing Rainbond app/i);
  assert.match(value, /rainbond-app-assistant/);
});

test("bootstrap discovery metadata is compact and preserves routing boundaries", () => {
  const value = description("rainbond-fullstack-bootstrap/SKILL.md");
  assert(Buffer.byteLength(value, "utf8") <= 320, "specialist description exceeds 320-byte budget");
  assert.match(value, /component topology/i);
  assert.match(value, /current project|manifest/i);
  assert.match(value, /bootstrap only/i);
  assert.match(value, /rainbond-app-assistant/);
});
