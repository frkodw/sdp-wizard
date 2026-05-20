// tests/markdown.test.js
import { test } from "node:test";
import assert from "node:assert/strict";
import { toMarkdown, toPlainText } from "../lib/markdown.js";

const samplePhase = { id: "before-contract", title: "Before contract signing" };

const sampleActions = [
  { id: "a1", title: "Start Article 30 row", destination: "Article 30", link: { label: "Article 30", href: "https://example.com/art30" }, note: "Open and add row." },
  { id: "a2", title: "Sign helper-tools agreement", destination: "Agreements", link: null, note: "Get client signature." },
  { id: "a3", title: "Fill classification files", destination: "Article 30", link: null, note: null }
];

test("toMarkdown groups by destination and includes title", () => {
  const md = toMarkdown(sampleActions, samplePhase);
  assert.match(md, /^## SDP actions for Before contract signing$/m);
  assert.match(md, /^### Article 30$/m);
  assert.match(md, /^### Agreements$/m);
});

test("toMarkdown renders unchecked checkboxes with title", () => {
  const md = toMarkdown(sampleActions, samplePhase);
  assert.match(md, /- \[ \] Start Article 30 row/);
  assert.match(md, /- \[ \] Sign helper-tools agreement/);
});

test("toMarkdown embeds links in markdown syntax when present", () => {
  const md = toMarkdown(sampleActions, samplePhase);
  assert.match(md, /\[Article 30\]\(https:\/\/example\.com\/art30\)/);
});

test("toMarkdown omits note lines when note is null", () => {
  const md = toMarkdown([sampleActions[2]], samplePhase);
  // The line for a3 has no note line under it
  const lines = md.split("\n");
  const a3Idx = lines.findIndex(l => l.includes("Fill classification files"));
  assert.notEqual(a3Idx, -1);
  const next = lines[a3Idx + 1] ?? "";
  assert.ok(!next.startsWith("  "), "no indented note line should follow");
});

test("toPlainText has no markdown syntax", () => {
  const txt = toPlainText(sampleActions, samplePhase);
  assert.ok(!/\[.*\]\(.*\)/.test(txt), "no markdown links");
  assert.ok(!/^#+ /m.test(txt), "no markdown headings");
  assert.match(txt, /SDP actions for Before contract signing/);
  assert.match(txt, /\[ \] Start Article 30 row/);
});

test("empty action list still produces the header", () => {
  const md = toMarkdown([], samplePhase);
  assert.match(md, /## SDP actions for Before contract signing/);
});
