// tests/process.test.js
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const data = JSON.parse(await readFile(new URL("../site/process.json", import.meta.url), "utf8"));

test("process.json has four phases with required fields", () => {
  assert.equal(data.phases.length, 4, "expected 4 phases");
  const expectedIds = ["before-contract", "before-project-start", "during-project", "at-project-finish"];
  assert.deepEqual(data.phases.map(p => p.id), expectedIds);
  for (const phase of data.phases) {
    assert.ok(phase.title, `phase ${phase.id} missing title`);
    assert.ok(phase.intro, `phase ${phase.id} missing intro`);
    assert.ok(Array.isArray(phase.steps), `phase ${phase.id} missing steps[]`);
  }
});

test("process.json has actions[] and rules[] arrays", () => {
  assert.ok(Array.isArray(data.actions), "missing actions[]");
  assert.ok(Array.isArray(data.rules), "missing rules[]");
});

test("process.json has overviewLink and vpnNote", () => {
  assert.ok(data.overviewLink, "missing overviewLink");
  assert.ok(data.overviewLink.label, "overviewLink missing label");
  assert.ok(data.overviewLink.href && data.overviewLink.href.startsWith("https://"), "overviewLink missing valid href");
  assert.ok(typeof data.vpnNote === "string" && data.vpnNote.length > 0, "missing vpnNote string");
});

test("no remaining REPLACE_ placeholder hrefs in actions", () => {
  for (const a of data.actions) {
    if (a.link) {
      assert.ok(!a.link.href.startsWith("REPLACE_"), `action ${a.id} still has placeholder href`);
    }
  }
});

test("every step has id, question, context, type, options", () => {
  for (const phase of data.phases) {
    for (const step of phase.steps) {
      assert.ok(step.id, `step missing id in phase ${phase.id}`);
      assert.ok(step.question, `step ${step.id} missing question`);
      assert.ok(step.context, `step ${step.id} missing context`);
      assert.ok(["single", "yesno", "multi"].includes(step.type), `step ${step.id} bad type`);
      assert.ok(Array.isArray(step.options) && step.options.length >= 2, `step ${step.id} needs >=2 options`);
      for (const opt of step.options) {
        assert.ok(opt.value && opt.label, `step ${step.id} option malformed`);
      }
    }
  }
});

test("every action has id, title, destination", () => {
  for (const a of data.actions) {
    assert.ok(a.id, "action missing id");
    assert.ok(a.title, `action ${a.id} missing title`);
    assert.ok(a.destination, `action ${a.id} missing destination`);
  }
  const ids = data.actions.map(a => a.id);
  assert.equal(new Set(ids).size, ids.length, "duplicate action ids");
});

test("every rule references known step and action ids", () => {
  const stepIds = new Set(data.phases.flatMap(p => p.steps.map(s => s.id)));
  const phaseIds = new Set(data.phases.map(p => p.id));
  const actionIds = new Set(data.actions.map(a => a.id));
  for (const rule of data.rules) {
    if (rule.if.step) {
      assert.ok(stepIds.has(rule.if.step), `rule references unknown step ${rule.if.step}`);
    }
    if (rule.if.phase) {
      assert.ok(phaseIds.has(rule.if.phase), `rule references unknown phase ${rule.if.phase}`);
    }
    for (const aId of rule.then) {
      assert.ok(actionIds.has(aId), `rule references unknown action ${aId}`);
    }
  }
});
