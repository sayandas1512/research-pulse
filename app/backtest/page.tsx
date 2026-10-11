import BacktestClient from "./BacktestClient";

export default function BacktestPage() {
  return (
    <main className="mx-auto max-w-3xl flex-1 p-6">
      <h1 className="text-2xl font-semibold">Backtest</h1>
      <p className="mt-1 text-sm text-gray-500">
        Replays a past week through the real pipeline (no email, no persistence) and measures
        recall against an optional list of papers you already know were important that week —
        at the fetched, shortlisted, and picked funnel levels.
      </p>
      <BacktestClient />
    </main>
  );
}
