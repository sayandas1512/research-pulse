import { listLogEntries } from "@/src/lib/feedback-repo";
import { toCsv } from "@/src/lib/csv";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const rows = await listLogEntries({
    domainId: url.searchParams.get("domain") || undefined,
    action: url.searchParams.get("action") || undefined,
    isoWeek: url.searchParams.get("week") || undefined,
    savedOnly: url.searchParams.get("saved") === "1",
  });

  const csv = toCsv(
    ["isoWeek", "domain", "arxivId", "title", "significance", "paperType", "evidenceStrength", "action", "absUrl"],
    rows.map((r) => [
      r.isoWeek,
      r.domainName,
      r.paper.arxivId,
      r.paper.title,
      String(r.item.significance),
      r.item.paperType,
      r.item.evidenceStrength,
      r.item.action,
      r.paper.absUrl,
    ]),
  );

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="research-pulse-log.csv"`,
    },
  });
}
