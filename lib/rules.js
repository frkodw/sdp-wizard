// Pure function. No DOM, no fetch. Tested from Node.

/**
 * @param {{phase: string, decisions: Record<string, string|string[]>}} state
 *   Decisions are string for single/yesno steps, string[] for multi steps.
 * @param {{phases: Array, actions: Array, rules: Array}} processData
 * @returns {string[]} action IDs, deduplicated, in rule-declaration order
 */
export function computeActions(state, processData) {
  const stepIdsInPhase = new Set(
    (processData.phases.find(p => p.id === state.phase)?.steps ?? []).map(s => s.id)
  );

  const out = [];
  const seen = new Set();

  for (const rule of processData.rules) {
    let matches = false;

    if (rule.if.phase) {
      matches = rule.if.phase === state.phase;
    } else if (rule.if.step) {
      // Rule fires only if (a) the step belongs to the current phase, AND
      // (b) the user's decision satisfies the rule. For multi-select steps
      // the decision is an array — the rule matches if it includes the
      // expected value. For single/yesno the decision is a scalar string.
      matches =
        stepIdsInPhase.has(rule.if.step) &&
        decisionMatches(state.decisions[rule.if.step], rule.if.equals);
    }

    if (matches) {
      for (const aid of rule.then) {
        if (!seen.has(aid)) {
          seen.add(aid);
          out.push(aid);
        }
      }
    }
  }

  return out;
}

function decisionMatches(decision, expected) {
  if (Array.isArray(decision)) return decision.includes(expected);
  return decision === expected;
}
