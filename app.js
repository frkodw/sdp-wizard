import { parseHash, buildHash } from "./lib/router.js";
import { computeActions } from "./lib/rules.js";
import { toMarkdown, toPlainText } from "./lib/markdown.js";

const state = {
  process: null,
  // step id → option value (string for single/yesno, string[] for multi).
  // In-memory only — refresh wipes everything by design.
  decisions: {}
};

function isAnswered(value) {
  if (value == null) return false;
  if (Array.isArray(value)) return value.length > 0;
  return true;
}

function isOptionChecked(selected, value) {
  if (Array.isArray(selected)) return selected.includes(value);
  return selected === value;
}

function resetDecisions() {
  state.decisions = {};
}

const root = document.getElementById("app");

async function init() {
  const res = await fetch("process.json");
  state.process = await res.json();
  window.addEventListener("hashchange", render);
  render();
}

function render() {
  const route = parseHash(location.hash);
  switch (route.view) {
    case "phase-picker": renderPhasePicker(); break;
    case "explainer":    renderExplainer();   break;
    case "wizard":       renderWizard(route); break;
    case "summary":      renderSummary(route); break;
  }
}

function renderPhasePicker() {
  const overview = state.process.overviewLink;
  const vpnNote = state.process.vpnNote;
  root.innerHTML = `
    <section class="phase-picker">
      <h1>Duckwise SDP process for projects</h1>
      <p class="subtitle">Use this wizard before, during, and after any internal or external project to work through the SDP process step by step.</p>

      ${overview ? `
        <div class="external-callout">
          <p>Note: This wizard is a guide. It does not replace the official SDP process overview. You will need to be on Trifork's network or connected via VPN to access the linked pages.</p>
          <a class="btn cta" href="${escapeHtml(overview.href)}" target="_blank" rel="noopener noreferrer">${escapeHtml(overview.label)} ↗</a>
        </div>
      ` : ""}

      <h2 class="picker-heading">Start by selecting the phase your project is in</h2>
      <p>Each phase walks you through the decisions for that part of the SDP process. Nothing about your project is stored. Only the choices you make in the wizard.</p>

      <ul class="phase-list">
        ${state.process.phases.map(p => `
          <li><a class="phase-card" href="${buildHash({ view: "wizard", phase: p.id })}">
            <h2>${escapeHtml(p.title)}</h2>
            <p>${escapeHtml(p.intro)}</p>
            ${p.responsible ? `<span class="responsible-label">Responsible: ${escapeHtml(p.responsible)}</span>` : ""}
          </a></li>
        `).join("")}
      </ul>

      <p class="stuck-hint">Stuck on a question? Check the helper text on the step, consult the SDP process overview, or reach out to your SDP agent.</p>

      <p class="extra-link"><a href="${buildHash({ view: "explainer" })}">What is Article 30, and why do we do this? →</a></p>
    </section>
  `;
}

function renderExplainer() {
  root.innerHTML = `
    <section class="explainer">
      <a href="#/" class="back">← Back to phases</a>
      <h1>Article 30 explained</h1>
      <h2>What</h2>
      <p>Article 30 of the GDPR requires organizations that process personal data to maintain a Record of Processing Activities (RoPA). This document details how, why, and where personal data is processed within the organization. Duckwise is required to keep this overview up to date.</p>
      <p>A project is subject to GDPR if personal data is processed. To comply with ISO 27001 we also keep an updated list of all active and completed projects not related to GDPR.</p>
      <h2>Why</h2>
      <p>Regular updates demonstrate accountability, facilitate audits, and reduce risks associated with outdated or incomplete documentation. Customers choose companies that are GDPR compliant and ISO certified over those that are not.</p>
      <h2>Who</h2>
      <p>Product/project leads are responsible for keeping Article 30 current. The work can be delegated to other members of the team.</p>
    </section>
  `;
}

function renderWizard(route) {
  const phase = state.process.phases.find(p => p.id === route.phase);
  if (!phase) { location.hash = "#/"; return; }

  // Pick the active step. If route has no step, use the first one.
  const stepId = route.step ?? phase.steps[0]?.id;
  const step = phase.steps.find(s => s.id === stepId);
  if (!step) { renderSummary({ view: "summary", phase: phase.id }); return; }

  const selected = state.decisions[step.id] ?? (step.type === "multi" ? [] : null);
  const isMulti = step.type === "multi";
  const inputType = isMulti ? "checkbox" : "radio";
  const prev = prevStepHash(phase, step);

  root.innerHTML = `
    <section class="wizard">
      <a href="#/" class="back">← Back to phases</a>
      <h1>${escapeHtml(phase.title)}</h1>
      ${phase.responsible ? `<p class="responsible-line"><span class="responsible-label">Responsible: ${escapeHtml(phase.responsible)}</span></p>` : ""}
      <p class="subtitle">${escapeHtml(phase.intro)}</p>

      <div class="wizard-grid">
        <nav class="sidebar" aria-label="Phase steps">
          <ol>
            ${phase.steps.map(s => {
              const isCurrent = s.id === step.id;
              const answered = isAnswered(state.decisions[s.id]);
              const cls = [
                isCurrent ? "current" : "",
                answered ? "answered" : "future"
              ].filter(Boolean).join(" ");
              return `<li class="${cls}">
                <a href="${buildHash({ view: "wizard", phase: phase.id, step: s.id })}">
                  <span class="marker">${answered ? "✓" : "·"}</span>
                  <span class="step-title">${escapeHtml(s.question)}</span>
                </a>
              </li>`;
            }).join("")}
            <li class="summary-link">
              <a href="${buildHash({ view: "summary", phase: phase.id })}">
                <span class="marker">→</span><span class="step-title">View summary</span>
              </a>
            </li>
          </ol>
        </nav>

        <article class="question">
          <h2>${escapeHtml(step.question)}</h2>
          ${isMulti ? `<p class="multi-hint">Tick every option that applies.</p>` : ""}
          <details class="context">
            <summary>Definitions / why we ask</summary>
            <p>${escapeHtml(step.context)}</p>
          </details>

          <form id="decision-form">
            <fieldset>
              <legend class="sr-only">${escapeHtml(step.question)}</legend>
              ${step.options.map(opt => {
                const checked = isOptionChecked(selected, opt.value);
                return `
                <label class="option ${checked ? "selected" : ""}">
                  <input type="${inputType}" name="answer" value="${escapeHtml(opt.value)}" ${checked ? "checked" : ""}>
                  <span class="option-label">${escapeHtml(opt.label)}</span>
                  ${opt.hint ? `<span class="option-hint">${escapeHtml(opt.hint)}</span>` : ""}
                </label>
              `;}).join("")}
            </fieldset>
            <div class="nav-row">
              ${prev ? `<a class="btn ghost" href="${prev}">← Previous</a>` : `<span></span>`}
              <button type="button" id="next-btn" class="btn primary" ${isAnswered(selected) ? "" : "disabled"}>
                ${isLastStep(phase, step) ? "View summary →" : "Next →"}
              </button>
            </div>
          </form>
        </article>
      </div>
    </section>
  `;

  // Wire up: input change updates state; Next advances.
  const form = document.getElementById("decision-form");
  form.addEventListener("change", e => {
    if (e.target.name !== "answer") return;
    if (isMulti) {
      const checked = Array.from(form.querySelectorAll('input[name="answer"]:checked'))
        .map(input => input.value);
      state.decisions[step.id] = checked;
    } else {
      state.decisions[step.id] = e.target.value;
    }
    render(); // re-render so sidebar check appears + Next enables/disables
  });
  document.getElementById("next-btn").addEventListener("click", () => {
    if (!isAnswered(state.decisions[step.id])) return;
    location.hash = nextStepHash(phase, step);
  });
}

function prevStepHash(phase, step) {
  const i = phase.steps.findIndex(s => s.id === step.id);
  if (i <= 0) return null;
  return buildHash({ view: "wizard", phase: phase.id, step: phase.steps[i - 1].id });
}

function nextStepHash(phase, step) {
  const i = phase.steps.findIndex(s => s.id === step.id);
  if (i === phase.steps.length - 1) return buildHash({ view: "summary", phase: phase.id });
  return buildHash({ view: "wizard", phase: phase.id, step: phase.steps[i + 1].id });
}

function isLastStep(phase, step) {
  return phase.steps[phase.steps.length - 1].id === step.id;
}

function renderSummary(route) {
  const phase = state.process.phases.find(p => p.id === route.phase);
  if (!phase) { location.hash = "#/"; return; }

  const actionIds = computeActions(
    { phase: phase.id, decisions: state.decisions },
    state.process
  );
  const actions = actionIds
    .map(id => state.process.actions.find(a => a.id === id))
    .filter(Boolean);

  const groups = groupBy(actions, "destination");
  const vpnNote = state.process.vpnNote;

  root.innerHTML = `
    <section class="summary">
      <a href="${buildHash({ view: "wizard", phase: phase.id, step: phase.steps[0].id })}" class="back">← Back to wizard</a>
      <h1>Actions for ${escapeHtml(phase.title.toLowerCase())}</h1>
      <p class="subtitle">Tick items as you work through them. Use the buttons below to copy the list into your Confluence project page.</p>

      ${vpnNote ? `<p class="vpn-note">${escapeHtml(vpnNote)}</p>` : ""}

      ${actions.length === 0 ? `<p class="empty">No actions triggered by your current answers.</p>` : ""}

      ${Array.from(groups.entries()).map(([dest, items]) => `
        <h2>${escapeHtml(dest)}</h2>
        <ul class="action-list">
          ${items.map(a => `
            <li>
              <label>
                <input type="checkbox" class="action-check" data-id="${escapeHtml(a.id)}">
                <span class="action-title">${escapeHtml(a.title)}</span>
                ${a.link ? `<a class="action-link" href="${escapeHtml(a.link.href)}" target="_blank" rel="noopener noreferrer">${escapeHtml(a.link.label)} ↗</a>` : ""}
                ${a.link && a.link.href.startsWith("REPLACE_") ? `<span class="placeholder-badge" title="Replace this URL in process.json">link not configured</span>` : ""}
                ${a.note ? `<p class="action-note">${escapeHtml(a.note)}</p>` : ""}
              </label>
            </li>
          `).join("")}
        </ul>
      `).join("")}

      <div class="actions-row">
        <button id="copy-md" class="btn ghost">Copy as Markdown</button>
        <button id="copy-txt" class="btn ghost">Copy as plain text</button>
        <span id="copy-feedback" class="copy-feedback" aria-live="polite"></span>
        <span class="finish-spacer"></span>
        <button id="finish-btn" class="btn finish" title="Clears all answers and returns you to the phase picker.">Finish &amp; start over</button>
      </div>
    </section>
  `;

  document.getElementById("copy-md").addEventListener("click", () => copy(toMarkdown(actions, phase), "md"));
  document.getElementById("copy-txt").addEventListener("click", () => copy(toPlainText(actions, phase), "txt"));
  document.getElementById("finish-btn").addEventListener("click", () => {
    resetDecisions();
    location.hash = "#/";
  });
}

async function copy(text, kind) {
  const feedback = document.getElementById("copy-feedback");
  try {
    await navigator.clipboard.writeText(text);
    feedback.textContent = kind === "md" ? "Markdown copied." : "Plain text copied.";
  } catch (err) {
    feedback.textContent = "Copy failed. Your browser blocked clipboard access.";
  }
  setTimeout(() => { feedback.textContent = ""; }, 2500);
}

function groupBy(arr, key) {
  const m = new Map();
  for (const item of arr) {
    if (!m.has(item[key])) m.set(item[key], []);
    m.get(item[key]).push(item);
  }
  return m;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;"
  }[c]));
}

init();
