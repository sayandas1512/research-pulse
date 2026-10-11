import { describe, expect, it } from "vitest";
import { isoWeekKey, weeklyWindow } from "../src/lib/iso-week";

describe("isoWeekKey", () => {
  it("computes the correct ISO week for a mid-week date", () => {
    // 2026-10-08 is a Thursday in ISO week 41 of 2026.
    expect(isoWeekKey(new Date("2026-10-08T12:00:00Z"))).toBe("2026-W41");
  });

  it("assigns the first days of January to the previous ISO year's last week when applicable", () => {
    // 2027-01-01 is a Friday; ISO week containing it belongs to week 53 of 2026.
    expect(isoWeekKey(new Date("2027-01-01T00:00:00Z"))).toBe("2026-W53");
  });

  it("handles a Monday correctly (start of an ISO week)", () => {
    expect(isoWeekKey(new Date("2026-10-05T00:00:00Z"))).toBe("2026-W41");
  });
});

describe("weeklyWindow", () => {
  it("returns a 7-day window ending at run time", () => {
    const runTime = new Date("2026-10-11T02:00:00Z");
    const { start, end } = weeklyWindow(runTime);
    expect(end).toBe(runTime);
    expect(start.toISOString()).toBe("2026-10-04T02:00:00.000Z");
  });

  it("supports a custom window length", () => {
    const runTime = new Date("2026-10-11T00:00:00Z");
    const { start } = weeklyWindow(runTime, 1);
    expect(start.toISOString()).toBe("2026-10-10T00:00:00.000Z");
  });
});
