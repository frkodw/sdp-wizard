// tests/router.test.js
import { test } from "node:test";
import assert from "node:assert/strict";
import { parseHash, buildHash } from "../site/lib/router.js";

test("empty hash maps to phase picker", () => {
  assert.deepEqual(parseHash(""), { view: "phase-picker" });
  assert.deepEqual(parseHash("#"), { view: "phase-picker" });
  assert.deepEqual(parseHash("#/"), { view: "phase-picker" });
});

test("phase route parses phase id", () => {
  assert.deepEqual(parseHash("#/phase/before-contract"), {
    view: "wizard",
    phase: "before-contract"
  });
});

test("step route parses phase + step", () => {
  assert.deepEqual(parseHash("#/phase/before-contract/step/data-type"), {
    view: "wizard",
    phase: "before-contract",
    step: "data-type"
  });
});

test("summary route parses", () => {
  assert.deepEqual(parseHash("#/phase/before-contract/summary"), {
    view: "summary",
    phase: "before-contract"
  });
});

test("explainer route parses", () => {
  assert.deepEqual(parseHash("#/explain"), { view: "explainer" });
});

test("unknown route falls back to phase picker", () => {
  assert.deepEqual(parseHash("#/garbage"), { view: "phase-picker" });
});

test("buildHash inverts parseHash for known shapes", () => {
  assert.equal(buildHash({ view: "phase-picker" }), "#/");
  assert.equal(buildHash({ view: "wizard", phase: "x" }), "#/phase/x");
  assert.equal(buildHash({ view: "wizard", phase: "x", step: "y" }), "#/phase/x/step/y");
  assert.equal(buildHash({ view: "summary", phase: "x" }), "#/phase/x/summary");
  assert.equal(buildHash({ view: "explainer" }), "#/explain");
});
