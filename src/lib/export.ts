import type { listLogEntries } from "./feedback-repo";

type LogRow = Awaited<ReturnType<typeof listLogEntries>>[number];

/** Groups saved picks by domain and renders them as a client-ready markdown digest. */
export function buildClientDigestMarkdown(rows: LogRow[]): string {
  if (rows.length === 0) {
    return 'No saved picks yet — click "Save for client" on a brief item to add it here.';
  }

  const byDomain = new Map<string, LogRow[]>();
  for (const row of rows) {
    const list = byDomain.get(row.domainName) ?? [];
    list.push(row);
    byDomain.set(row.domainName, list);
  }

  const generated = new Date().toISOString().slice(0, 10);
  const lines: string[] = ["# Research Pulse — Client Picks", "", `_Generated ${generated}_`, ""];

  for (const [domain, items] of byDomain) {
    lines.push(`## ${domain}`, "");
    for (const row of items) {
      lines.push(`- **${row.paper.title}** (${row.isoWeek})`);
      lines.push(`  ${row.item.soWhat}`);
      lines.push(`  ${row.paper.absUrl}`);
      lines.push("");
    }
  }

  return lines.join("\n").trimEnd() + "\n";
}
