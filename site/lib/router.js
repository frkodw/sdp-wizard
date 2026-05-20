// Pure function. No DOM. Tested from Node.

/**
 * @param {string} hash  e.g. "#/phase/before-contract/step/data-type"
 * @returns {{view: string, phase?: string, step?: string}}
 */
export function parseHash(hash) {
  const path = (hash || "").replace(/^#/, "").replace(/^\/+/, "");
  if (!path) return { view: "phase-picker" };

  const parts = path.split("/");
  if (parts[0] === "explain") return { view: "explainer" };

  if (parts[0] === "phase" && parts[1]) {
    if (parts[2] === "step" && parts[3]) {
      return { view: "wizard", phase: parts[1], step: parts[3] };
    }
    if (parts[2] === "summary") {
      return { view: "summary", phase: parts[1] };
    }
    return { view: "wizard", phase: parts[1] };
  }

  return { view: "phase-picker" };
}

/**
 * @param {{view: string, phase?: string, step?: string}} route
 * @returns {string} hash string starting with "#/"
 */
export function buildHash(route) {
  switch (route.view) {
    case "phase-picker": return "#/";
    case "explainer":    return "#/explain";
    case "wizard":
      return route.step
        ? `#/phase/${route.phase}/step/${route.step}`
        : `#/phase/${route.phase}`;
    case "summary":      return `#/phase/${route.phase}/summary`;
    default:             return "#/";
  }
}
