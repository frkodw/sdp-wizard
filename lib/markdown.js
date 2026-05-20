// Pure function. No DOM, no fetch. Tested from Node.

/**
 * @param {Array} actions  Array of action objects (id, title, destination, link, note).
 * @param {{title: string}} phase
 * @returns {string} Markdown checklist grouped by destination.
 */
export function toMarkdown(actions, phase) {
  const groups = groupByDestination(actions);
  const lines = [`## SDP actions for ${phase.title}`, ""];
  for (const [destination, items] of groups) {
    lines.push(`### ${destination}`);
    for (const a of items) {
      const linkSuffix = a.link ? ` [${a.link.label}](${a.link.href})` : "";
      lines.push(`- [ ] ${a.title}${linkSuffix}`);
      if (a.note) lines.push(`  ${a.note}`);
    }
    lines.push("");
  }
  return lines.join("\n").trimEnd() + "\n";
}

/**
 * @param {Array} actions
 * @param {{title: string}} phase
 * @returns {string} Plain-text checklist, same content as Markdown but without markup.
 */
export function toPlainText(actions, phase) {
  const groups = groupByDestination(actions);
  const lines = [`SDP actions for ${phase.title}`, ""];
  for (const [destination, items] of groups) {
    lines.push(destination);
    for (const a of items) {
      const linkSuffix = a.link ? ` (${a.link.label}: ${a.link.href})` : "";
      lines.push(`  [ ] ${a.title}${linkSuffix}`);
      if (a.note) lines.push(`      ${a.note}`);
    }
    lines.push("");
  }
  return lines.join("\n").trimEnd() + "\n";
}

function groupByDestination(actions) {
  const groups = new Map();
  for (const a of actions) {
    if (!groups.has(a.destination)) groups.set(a.destination, []);
    groups.get(a.destination).push(a);
  }
  return groups;
}
