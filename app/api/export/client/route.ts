import { listLogEntries } from "@/src/lib/feedback-repo";
import { buildClientDigestMarkdown } from "@/src/lib/export";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const rows = await listLogEntries({
    domainId: url.searchParams.get("domain") || undefined,
    isoWeek: url.searchParams.get("week") || undefined,
    savedOnly: true,
  });

  const markdown = buildClientDigestMarkdown(rows);

  return new Response(markdown, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": `attachment; filename="research-pulse-client-picks.md"`,
    },
  });
}
