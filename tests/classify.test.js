// tests/classify.test.js
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { suggestCategory, categoryInfo, formatClassification } from "../lib/classify.js";

const processData = JSON.parse(await readFile(new URL("../process.json", import.meta.url), "utf8"));

test("no answers → null (cannot guess)", () => {
  assert.equal(suggestCategory({}), null);
  assert.equal(suggestCategory(null), null);
});

test("reference Project A: anonymous + no customer + no integrity + 14+ days → A", () => {
  const result = suggestCategory({
    "data-type": ["anonymous"],
    "customer-criticality": ["none"],
    "classify-society": "no",
    "classify-integrity": "no",
    "classify-downtime": "14+"
  });
  assert.equal(result.letter, "A");
});

test("reference Project B: ordinary + secrets-NDA + society yes + LOW + 7-14 → B", () => {
  const result = suggestCategory({
    "data-type": ["personal-non-sensitive"],
    "customer-criticality": ["secrets-nda"],
    "classify-society": "yes",
    "classify-integrity": "low",
    "classify-downtime": "7-14"
  });
  assert.equal(result.letter, "B");
  // Society-critical advisory should appear in reasons.
  assert.ok(result.reasons.some(r => /[Ss]ociety/.test(r)));
});

test("reference Project C: sensitive + secrets-NDA + MODERATE + 3-7 → C", () => {
  const result = suggestCategory({
    "data-type": ["personal-non-sensitive", "sensitive"],
    "customer-criticality": ["secrets-nda"],
    "classify-society": "no",
    "classify-integrity": "moderate",
    "classify-downtime": "3-7"
  });
  assert.equal(result.letter, "C");
});

test("reference Project D: ordinary + secrets-NDA + society yes + HIGH + 1-2 → D", () => {
  const result = suggestCategory({
    "data-type": ["personal-non-sensitive"],
    "customer-criticality": ["secrets-nda"],
    "classify-society": "yes",
    "classify-integrity": "high",
    "classify-downtime": "1-2"
  });
  assert.equal(result.letter, "D");
});

test("reference Project E (via ABSOLUTE integrity): sensitive + security-measure + ABSOLUTE → E", () => {
  const result = suggestCategory({
    "data-type": ["sensitive"],
    "customer-criticality": ["security-measure"],
    "classify-society": "no",
    "classify-integrity": "absolute",
    "classify-downtime": "1-2"
  });
  assert.equal(result.letter, "E");
});

test("reference Project E (via <1 day availability): sensitive + <1 day → E", () => {
  const result = suggestCategory({
    "data-type": ["sensitive"],
    "customer-criticality": ["security-measure"],
    "classify-society": "no",
    "classify-integrity": "high",
    "classify-downtime": "<1"
  });
  assert.equal(result.letter, "E");
});

test("only person criticality answered → still produces a guess (sensitive → C)", () => {
  const result = suggestCategory({ "data-type": ["sensitive"] });
  assert.equal(result.letter, "C");
});

test("customer security-measure alone reaches D tier", () => {
  const result = suggestCategory({ "customer-criticality": ["security-measure"] });
  assert.equal(result.letter, "D");
});

test("integrity ABSOLUTE alone reaches E", () => {
  const result = suggestCategory({ "classify-integrity": "absolute" });
  assert.equal(result.letter, "E");
});

test("availability <1 day alone reaches E", () => {
  const result = suggestCategory({ "classify-downtime": "<1" });
  assert.equal(result.letter, "E");
});

test("reasons array includes one item per answered dimension", () => {
  const result = suggestCategory({
    "data-type": ["sensitive"],
    "customer-criticality": ["secrets-nda"],
    "classify-society": "yes",
    "classify-integrity": "high",
    "classify-downtime": "1-2"
  });
  // Person, customer, integrity, availability, society = 5 reasons
  assert.ok(result.reasons.length >= 4);
  assert.ok(result.reasons.some(r => /[Ss]ensitive/.test(r)));
  assert.ok(result.reasons.some(r => /NDA/.test(r)));
});

test("categoryInfo returns details for a letter", () => {
  const info = categoryInfo("D");
  assert.equal(info.letter, "D");
  assert.match(info.name, /Project D/);
  assert.ok(info.description.length > 10);
});

test("categoryInfo returns null for unknown letter", () => {
  assert.equal(categoryInfo("Z"), null);
});

test("formatClassification renders selected answers with labels", () => {
  const decisions = {
    "data-type": ["sensitive", "personal-non-sensitive"],
    "customer-criticality": ["secrets-nda"],
    "classify-society": "yes",
    "classify-integrity": "moderate",
    "classify-downtime": "3-7"
  };
  const suggestion = suggestCategory(decisions);
  const text = formatClassification(decisions, processData, suggestion);

  assert.match(text, /Project classification — suggested Project C/);
  assert.match(text, /Person criticality:/);
  assert.match(text, /- Sensitive personal data/);
  assert.match(text, /- Non-sensitive personal data/);
  assert.match(text, /Customer criticality:/);
  assert.match(text, /- Secrets and NDA/);
  assert.match(text, /Society critical: Yes/);
  assert.match(text, /Integrity risk: Moderate/);
  assert.match(text, /Availability risk: 3 to 7 days/);
});

test("formatClassification skips dimensions with no answers", () => {
  const decisions = { "data-type": ["anonymous"] };
  const text = formatClassification(decisions, processData, suggestCategory(decisions));
  assert.match(text, /Person criticality:\n- Anonymous \/ public/);
  assert.ok(!/Customer criticality/.test(text));
  assert.ok(!/Society critical/.test(text));
});
