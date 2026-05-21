// Pure function. No DOM, no fetch. Tested from Node.
//
// Suggests a Duckwise project category (A–E) by scoring each classification
// dimension and taking the maximum. Dimensions:
//
//   - Person criticality       (multi from data-type)
//   - Customer criticality     (multi from customer-criticality)
//   - Duckwise integrity risk  (single from classify-integrity)
//   - Duckwise availability    (single from classify-downtime)
//
// Society-critical is advisory: it adds a note in the reasons list but does
// not change the score on its own.

const LETTERS = ["A", "B", "C", "D", "E"];

const CATEGORY_INFO = {
  A: { name: "Project A", description: "Lowest tier. Public or anonymous data. No customer requirements, no NDA, multi-day downtime tolerable. Example: a public redesign with no customer data." },
  B: { name: "Project B", description: "Ordinary personal data or customer / IP under contract. Tools restricted to Duckwise / Trifork. Example: user tests with ordinary contact information." },
  C: { name: "Project C", description: "Sensitive personal data alongside ordinary data, NDA and consent required. Moderate integrity and availability needs. Example: user tests including health data." },
  D: { name: "Project D", description: "Secret-tier confidentiality, NDA + consent, high integrity, downtime under 2 days. AVP-style engagements with major-brand clients." },
  E: { name: "Project E", description: "Highest tier. Absolute integrity or sub-1-day availability, often with security-cleared personnel. Example: testing on real patient data." }
};

const INTEGRITY_SCORE = { "no": 0, "low": 1, "moderate": 2, "high": 3, "absolute": 4 };
const DOWNTIME_SCORE  = { "14+": 0, "7-14": 1, "3-7": 2, "1-2": 3, "<1": 4 };

function personScore(personTypes) {
  if (!Array.isArray(personTypes) || personTypes.length === 0) return 0;
  if (personTypes.includes("sensitive")) return 2;
  if (personTypes.includes("personal-non-sensitive")) return 1;
  return 0; // anonymous
}

function customerScore(customerTypes) {
  if (!Array.isArray(customerTypes) || customerTypes.length === 0) return 0;
  if (customerTypes.includes("security-measure")) return 3;
  if (customerTypes.includes("secrets-nda")) return 1;
  if (customerTypes.includes("customer-no-nda")) return 1;
  return 0; // none, internal
}

function describePerson(types) {
  if (!Array.isArray(types) || types.length === 0) return null;
  if (types.includes("sensitive")) return "Sensitive personal data is in scope.";
  if (types.includes("personal-non-sensitive")) return "Ordinary personal data is in scope.";
  return "Only anonymous or public data is in scope.";
}

function describeCustomer(types) {
  if (!Array.isArray(types) || types.length === 0) return null;
  if (types.includes("security-measure")) return "Security measures (red room / security-cleared personnel) required.";
  if (types.includes("secrets-nda")) return "Customer secrets and NDA in scope.";
  if (types.includes("customer-no-nda")) return "Customer / project data under contract, no NDA.";
  if (types.includes("internal")) return "Internal Duckwise project material only.";
  return "No customer-sensitive data or requirements.";
}

function describeIntegrity(level) {
  const labels = {
    "no": null, // not worth mentioning
    "low": "Low integrity requirement — minimal impact if data is incorrect.",
    "moderate": "Moderate integrity requirement — incorrect data must be detectable and easy to remediate.",
    "high": "High integrity requirement — inaccuracies are hard to tolerate.",
    "absolute": "Absolute integrity requirement — no inaccuracies tolerated."
  };
  return labels[level] || null;
}

function describeAvailability(level) {
  const labels = {
    "14+":  null, // not worth mentioning
    "7-14": "Availability tolerance of 7 to 14 days.",
    "3-7":  "Availability tolerance of 3 to 7 days.",
    "1-2":  "Availability tolerance of 1 to 2 days raises the tier.",
    "<1":   "Downtime under 1 day pushes the project to the highest availability tier."
  };
  return labels[level] || null;
}

/**
 * @param {Record<string, string|string[]>} decisions
 * @returns {{ letter, name, description, reasons: string[] } | null}
 *   Returns null if the user has not given any classification signal yet.
 */
export function suggestCategory(decisions) {
  if (!decisions) return null;

  const personTypes   = decisions["data-type"];
  const customerTypes = decisions["customer-criticality"];
  const integrity     = decisions["classify-integrity"];
  const availability  = decisions["classify-downtime"];
  const society       = decisions["classify-society"] === "yes";

  const anyAnswer =
    (Array.isArray(personTypes)   && personTypes.length   > 0) ||
    (Array.isArray(customerTypes) && customerTypes.length > 0) ||
    (integrity    != null && integrity    !== "") ||
    (availability != null && availability !== "");

  if (!anyAnswer) return null;

  const scores = {
    person:       personScore(personTypes),
    customer:     customerScore(customerTypes),
    integrity:    INTEGRITY_SCORE[integrity] ?? 0,
    availability: DOWNTIME_SCORE[availability] ?? 0
  };

  const score  = Math.max(scores.person, scores.customer, scores.integrity, scores.availability);
  const letter = LETTERS[Math.min(score, 4)];

  const reasons = [
    describePerson(personTypes),
    describeCustomer(customerTypes),
    describeIntegrity(integrity),
    describeAvailability(availability),
    society ? "Society-critical sector — expect extra scrutiny on tool selection and tracking." : null
  ].filter(Boolean);

  return { letter, ...CATEGORY_INFO[letter], reasons };
}

export function categoryInfo(letter) {
  return CATEGORY_INFO[letter] ? { letter, ...CATEGORY_INFO[letter] } : null;
}

const CLASSIFY_STEP_IDS = [
  { id: "data-type",            heading: "Person criticality",   multi: true  },
  { id: "customer-criticality", heading: "Customer criticality", multi: true  },
  { id: "classify-society",     heading: "Society critical",     multi: false },
  { id: "classify-integrity",   heading: "Integrity risk",       multi: false },
  { id: "classify-downtime",    heading: "Availability risk",    multi: false }
];

/**
 * Produce a plain-text summary of the user's classification answers, suitable
 * for pasting into the Confluence "Custom project categories" section.
 *
 * @param {Record<string, string|string[]>} decisions
 * @param {Object} processData  Full process.json contents (needed for step+option labels).
 * @param {Object|null} suggestion  Result from suggestCategory(), if any.
 * @returns {string} Multi-line plain text.
 */
export function formatClassification(decisions, processData, suggestion) {
  const phase = processData.phases.find(p => p.id === "before-contract");
  if (!phase) return "";

  const stepsById = Object.fromEntries(phase.steps.map(s => [s.id, s]));
  const lines = [];

  lines.push(suggestion
    ? `Project classification — suggested ${suggestion.name}`
    : "Project classification");

  for (const { id, heading, multi } of CLASSIFY_STEP_IDS) {
    const step = stepsById[id];
    if (!step) continue;
    const value = decisions[id];

    if (multi) {
      if (!Array.isArray(value) || value.length === 0) continue;
      lines.push("");
      lines.push(`${heading}:`);
      for (const v of value) {
        const opt = step.options.find(o => o.value === v);
        lines.push(`- ${opt ? opt.label : v}`);
      }
    } else {
      if (value == null || value === "") continue;
      const opt = step.options.find(o => o.value === value);
      lines.push("");
      lines.push(`${heading}: ${opt ? opt.label : value}`);
    }
  }

  return lines.join("\n") + "\n";
}
