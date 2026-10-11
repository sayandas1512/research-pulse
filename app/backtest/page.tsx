import { PageHeader, PageShell } from "../components/ui";
import BacktestClient from "./BacktestClient";

export default function BacktestPage() {
  return (
    <PageShell>
      <PageHeader
        title="Backtest"
        description="Replays a past week through the real pipeline (no email, no persistence) and measures recall against an optional list of papers you already know were important that week — at the fetched, shortlisted, and picked funnel levels."
      />
      <BacktestClient />
    </PageShell>
  );
}
