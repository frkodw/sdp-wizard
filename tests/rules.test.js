// tests/rules.test.js
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { computeActions } from "../site/lib/rules.js";

const processData = JSON.parse(await readFile(new URL("../site/process.json", import.meta.url), "utf8"));

test("phase-level rule always fires for matching phase", () => {
  const actions = computeActions({ phase: "before-contract", decisions: {} }, processData);
  assert.ok(actions.includes("start-article-30-row"));
  assert.ok(actions.includes("fill-classification-files"));
});

test("sensitive data triggers SDP escalation (multi-select array)", () => {
  const actions = computeActions({
    phase: "before-contract",
    decisions: { "data-type": ["sensitive"] }
  }, processData);
  assert.ok(actions.includes("contact-sdp-agent-sensitive"));
});

test("multi-select array containing sensitive alongside others still triggers escalation", () => {
  const actions = computeActions({
    phase: "before-contract",
    decisions: { "data-type": ["internal", "personal-non-sensitive", "sensitive"] }
  }, processData);
  assert.ok(actions.includes("contact-sdp-agent-sensitive"));
});

test("multi-select array without sensitive does NOT trigger escalation", () => {
  const actions = computeActions({
    phase: "before-contract",
    decisions: { "data-type": ["anonymous", "internal"] }
  }, processData);
  assert.ok(!actions.includes("contact-sdp-agent-sensitive"));
});

test("empty multi-select array does NOT trigger escalation", () => {
  const actions = computeActions({
    phase: "before-contract",
    decisions: { "data-type": [] }
  }, processData);
  assert.ok(!actions.includes("contact-sdp-agent-sensitive"));
});

test("scalar decision still works (backward compat for non-multi steps)", () => {
  const actions = computeActions({
    phase: "before-contract",
    decisions: { "controller-role": "client-refuses" }
  }, processData);
  assert.ok(actions.includes("contact-sdp-agent-controller-refused"));
});

test("client-refused controller role escalates", () => {
  const actions = computeActions({
    phase: "before-contract",
    decisions: { "controller-role": "client-refuses" }
  }, processData);
  assert.ok(actions.includes("contact-sdp-agent-controller-refused"));
});

test("actions are deduplicated", () => {
  const actions = computeActions({
    phase: "before-contract",
    decisions: { "data-type": ["sensitive"], "ai-tools": "yes", "dpa-needed": "yes" }
  }, processData);
  const counts = {};
  for (const a of actions) counts[a] = (counts[a] || 0) + 1;
  for (const [id, n] of Object.entries(counts)) {
    assert.equal(n, 1, `action ${id} appeared ${n} times`);
  }
});

test("actions from a different phase are not included", () => {
  const actions = computeActions({
    phase: "before-contract",
    decisions: { "team-signoff": "no" }
  }, processData);
  assert.ok(!actions.includes("team-signoff-row"), "team-signoff rule should not fire for before-contract phase");
});
