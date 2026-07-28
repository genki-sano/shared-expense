import { describe, expect, it } from "vitest";
import {
  addMonths,
  currentMonthInJst,
  formatMonthLabel,
  normalizeMonthParam,
} from "./month";

describe("expense month helpers", () => {
  it("uses a valid month query value", () => {
    expect(normalizeMonthParam("2026-08", "2026-07")).toBe("2026-08");
  });

  it("falls back when the month query value is missing or invalid", () => {
    expect(normalizeMonthParam(undefined, "2026-07")).toBe("2026-07");
    expect(normalizeMonthParam("2026-8", "2026-07")).toBe("2026-07");
    expect(normalizeMonthParam(["2026-09", "2026-10"], "2026-07")).toBe("2026-09");
  });

  it("formats the current month in JST", () => {
    expect(currentMonthInJst(new Date("2026-07-31T15:30:00.000Z"))).toBe(
      "2026-08",
    );
  });

  it("adds months across year boundaries", () => {
    expect(addMonths("2026-01", -1)).toBe("2025-12");
    expect(addMonths("2026-12", 1)).toBe("2027-01");
  });

  it("formats a month for display", () => {
    expect(formatMonthLabel("2026-07")).toBe("2026年7月");
  });
});
