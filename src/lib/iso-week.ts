/** ISO 8601 week helpers. Week key format: "2026-W07". */

export function isoWeekKey(date: Date): string {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dayNum = d.getUTCDay() === 0 ? 7 : d.getUTCDay();
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const isoYear = d.getUTCFullYear();
  const yearStart = new Date(Date.UTC(isoYear, 0, 1));
  const weekNum = Math.ceil(((d.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
  return `${isoYear}-W${String(weekNum).padStart(2, "0")}`;
}

export interface Window {
  start: Date;
  end: Date;
}

export function weeklyWindow(runTime: Date, days = 7): Window {
  const end = runTime;
  const start = new Date(runTime.getTime() - days * 86_400_000);
  return { start, end };
}
