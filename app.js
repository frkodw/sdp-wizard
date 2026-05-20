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

function phaseNumber(phaseId) {
  return state.process.phases.findIndex(p => p.id === phaseId) + 1;
}

function shortLabel(step) {
  return step.shortLabel || step.question;
}

// For each action, return human-readable reasons explaining which step+answer triggered it.
// Phase-level rules are omitted from reasons — they're always-on for the current phase
// and don't tell the user anything useful.
function reasonsForAction(actionId, state_, processData) {
  const phase = processData.phases.find(p => p.id === state_.phase);
  if (!phase) return [];
  const stepsById = Object.fromEntries(phase.steps.map(s => [s.id, s]));
  const reasons = [];
  for (const rule of processData.rules) {
    if (!rule.then.includes(actionId)) continue;
    if (!rule.if.step) continue;
    const step = stepsById[rule.if.step];
    if (!step) continue;
    const decision = state_.decisions[rule.if.step];
    const matches = Array.isArray(decision)
      ? decision.includes(rule.if.equals)
      : decision === rule.if.equals;
    if (!matches) continue;
    const option = step.options.find(o => o.value === rule.if.equals);
    const optionLabel = option ? option.label : rule.if.equals;
    reasons.push(`${shortLabel(step)}: ${optionLabel}`);
  }
  return reasons;
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
  document.body.className = "view-" + route.view;
  updateHeader(route);
  switch (route.view) {
    case "phase-picker": renderPhasePicker(); break;
    case "explainer":    renderExplainer();   break;
    case "wizard":       renderWizard(route); break;
    case "summary":      renderSummary(route); break;
  }
  window.scrollTo({ top: 0, behavior: "instant" });
}

function updateHeader(route) {
  const titleEl = document.getElementById("header-title");
  const actionEl = document.getElementById("header-action");
  if (!titleEl || !actionEl) return;

  if ((route.view === "wizard" || route.view === "summary") && route.phase) {
    const phase = state.process.phases.find(p => p.id === route.phase);
    if (phase) {
      const phaseNo = phaseNumber(phase.id);
      titleEl.innerHTML = `<span class="phase-prefix">Phase ${phaseNo}</span>${escapeHtml(phase.title)}`;
      actionEl.innerHTML = `<a href="#/">← Back to phases</a>`;
      return;
    }
  }
  titleEl.innerHTML = "";
  actionEl.innerHTML = "";
}

function renderPhasePicker() {
  const overview = state.process.overviewLink;
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

      <h2 class="picker-heading">Phases</h2>
      <p class="section-intro">Start by selecting the phase your project is in. Each phase walks you through the decisions for that part of the SDP process. Nothing about your project is stored, only the choices you make in the wizard.</p>

      <ol class="phase-list">
        ${state.process.phases.map((p, i) => {
          const num = String(i + 1).padStart(2, "0");
          return `
          <li><a class="phase-card" href="${buildHash({ view: "wizard", phase: p.id })}">
            <div class="phase-card-visual">
              <span class="phase-card-num">${num}</span>
            </div>
            <div class="phase-card-body">
              <div class="phase-card-head">
                <h3 class="phase-card-title">${escapeHtml(p.title)}</h3>
                ${p.responsible ? `<span class="responsible-label">${escapeHtml(p.responsible)}</span>` : ""}
              </div>
              <p class="phase-card-desc">${escapeHtml(p.intro)}</p>
              <div class="phase-card-foot">
                <span class="phase-card-cta">Start →</span>
              </div>
            </div>
          </a></li>
        `;}).join("")}
      </ol>

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
      <div class="explainer-cta">
        <a class="btn primary" href="#/">Start the wizard →</a>
      </div>
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

  const stepIndex = phase.steps.findIndex(s => s.id === step.id);
  const totalSteps = phase.steps.length;
  const progressPct = Math.round(((stepIndex + 1) / totalSteps) * 100);

  const nextLabel = isLastStep(phase, step) ? "View summary →" : "Next →";
  const nextHref = nextStepHash(phase, step);

  root.innerHTML = `
    <section class="wizard">
      <div class="wizard-grid">
        <nav class="step-list" aria-label="Steps in this phase">
          <ol>
            ${phase.steps.map(s => {
              const isCurrent = s.id === step.id;
              const answered = isAnswered(state.decisions[s.id]);
              const cls = isCurrent ? "current" : (answered ? "answered" : "future");
              return `<li class="${cls}">
                <a href="${buildHash({ view: "wizard", phase: phase.id, step: s.id })}">
                  <span class="marker">${answered && !isCurrent ? "✓" : ""}</span>
                  <span class="step-title">${escapeHtml(shortLabel(s))}</span>
                </a>
              </li>`;
            }).join("")}
            <li class="summary-link">
              <a href="${buildHash({ view: "summary", phase: phase.id })}">
                <span class="marker"></span>
                <span>Summary</span>
              </a>
            </li>
          </ol>
        </nav>

        <div class="wizard-main">
<article class="question">
        <h2>${escapeHtml(step.question)}</h2>
        <p class="context-text">${escapeHtml(step.context)}</p>
        ${isMulti ? `<p class="question-hint">Tick every option that applies.</p>` : ""}

        <form id="decision-form">
          <fieldset>
            <legend class="sr-only">${escapeHtml(step.question)}</legend>
            ${step.options.map(opt => {
              const checked = isOptionChecked(selected, opt.value);
              return `
              <label class="option ${checked ? "selected" : ""}">
                <div class="option-content">
                  <span class="option-label">${escapeHtml(opt.label)}</span>
                  ${opt.hint ? `<span class="option-hint">${escapeHtml(opt.hint)}</span>` : ""}
                </div>
                <input type="${inputType}" name="answer" value="${escapeHtml(opt.value)}" ${checked ? "checked" : ""}>
              </label>
            `;}).join("")}
          </fieldset>
        </form>
      </article>
        </div>
      </div>
    </section>

    <nav class="wizard-footer" aria-label="Step navigation">
      <div class="wizard-footer-inner">
        ${prev
          ? `<a class="btn ghost" href="${prev}">← Previous</a>`
          : `<span class="nav-spacer"></span>`}
        <span class="step-counter">Step ${stepIndex + 1} of ${totalSteps}</span>
        <div class="progress-bar" role="progressbar" aria-valuenow="${progressPct}" aria-valuemin="0" aria-valuemax="100"><div class="progress-fill" style="width: ${progressPct}%"></div></div>
        <button type="button" id="next-btn" class="btn primary" ${isAnswered(selected) ? "" : "disabled"}>
          ${nextLabel}
        </button>
      </div>
    </nav>
  `;

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
    render();
  });
  document.getElementById("next-btn").addEventListener("click", () => {
    if (!isAnswered(state.decisions[step.id])) return;
    location.hash = nextHref;
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

  const actionCount = actions.length;
  const destinationCount = groups.size;
  const countLine = actionCount === 0
    ? "No actions to take based on your answers."
    : `${actionCount} ${actionCount === 1 ? "action" : "actions"} across ${destinationCount} ${destinationCount === 1 ? "destination" : "destinations"}.`;

  const lastStepId = phase.steps[phase.steps.length - 1].id;
  const prevHref = buildHash({ view: "wizard", phase: phase.id, step: lastStepId });

  root.innerHTML = `
    <section class="summary">
      <div class="wizard-grid">
        <nav class="step-list" aria-label="Steps in this phase">
          <ol>
            ${phase.steps.map(s => {
              const answered = isAnswered(state.decisions[s.id]);
              const cls = answered ? "answered" : "future";
              return `<li class="${cls}">
                <a href="${buildHash({ view: "wizard", phase: phase.id, step: s.id })}">
                  <span class="marker">${answered ? "✓" : ""}</span>
                  <span class="step-title">${escapeHtml(shortLabel(s))}</span>
                </a>
              </li>`;
            }).join("")}
            <li class="summary-link current">
              <a href="${buildHash({ view: "summary", phase: phase.id })}">
                <span class="marker"></span>
                <span>Summary</span>
              </a>
            </li>
          </ol>
        </nav>

        <div class="wizard-main">
          <h1>Summary</h1>
          <p class="subtitle">${countLine} Tick items as you work through them. Use the buttons below to copy the list into your Confluence project page.</p>

          ${vpnNote ? `<p class="vpn-note">${escapeHtml(vpnNote)}</p>` : ""}

          ${actions.length === 0 ? `<p class="empty">Adjust your answers in the wizard to see what to do next.</p>` : ""}

          ${Array.from(groups.entries()).map(([dest, items]) => `
            <section class="action-group">
              <h2>${escapeHtml(dest)}</h2>
              <ul class="action-list">
                ${items.map(a => {
                  const reasons = reasonsForAction(a.id, { phase: phase.id, decisions: state.decisions }, state.process);
                  return `
                  <li>
                    <label>
                      <input type="checkbox" class="action-check" data-id="${escapeHtml(a.id)}">
                      <div class="action-body">
                        <div class="action-head">
                          <span class="action-title">${escapeHtml(a.title)}</span>
                          ${a.link ? `<a class="action-link" href="${escapeHtml(a.link.href)}" target="_blank" rel="noopener noreferrer">${escapeHtml(a.link.label)} ↗</a>` : ""}
                          ${a.link && a.link.href.startsWith("REPLACE_") ? `<span class="placeholder-badge" title="Replace this URL in process.json">link not configured</span>` : ""}
                        </div>
                        ${a.note ? `<p class="action-note">${escapeHtml(a.note)}</p>` : ""}
                        ${reasons.length ? `<p class="action-reason">Because: ${reasons.map(escapeHtml).join("; ")}</p>` : ""}
                      </div>
                    </label>
                  </li>
                `;}).join("")}
              </ul>
            </section>
          `).join("")}

          <div class="actions-row">
            <button id="copy-md" class="btn ghost">Copy as Markdown</button>
            <button id="copy-txt" class="btn ghost">Copy as plain text</button>
            <span id="copy-feedback" class="copy-feedback" aria-live="polite"></span>
          </div>
        </div>
      </div>
    </section>

    <nav class="wizard-footer" aria-label="Summary navigation">
      <div class="wizard-footer-inner">
        <a class="btn ghost" href="${prevHref}">← Previous</a>
        <span class="step-counter">All ${phase.steps.length} steps answered</span>
        <div class="progress-bar" role="progressbar" aria-valuenow="100" aria-valuemin="0" aria-valuemax="100"><div class="progress-fill" style="width: 100%"></div></div>
        <button type="button" id="finish-btn" class="btn primary" title="Clears all answers and returns you to the phase picker.">Finish ✓</button>
      </div>
    </nav>

    <div id="done-flash" class="done-flash" aria-hidden="true">
      <div class="done-flash-card">Done. See you next time.</div>
    </div>
  `;

  document.getElementById("copy-md").addEventListener("click", () => copy(toMarkdown(actions, phase), "md"));
  document.getElementById("copy-txt").addEventListener("click", () => copy(toPlainText(actions, phase), "txt"));
  document.getElementById("finish-btn").addEventListener("click", () => {
    const flash = document.getElementById("done-flash");
    flash.classList.add("visible");
    flash.setAttribute("aria-hidden", "false");
    setTimeout(() => {
      resetDecisions();
      location.hash = "#/";
    }, 850);
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
