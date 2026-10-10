import { describe, expect, it } from "vitest";
import { callHomeVerdict, diffOnDate, fmtDiff, fmtUtc, tzOffsetMin, wallClock, zonedInstant } from "./time";

describe("time zones", () => {
  it("knows the December 2026 offsets", () => {
    const i = new Date("2026-12-20T15:00:00Z");
    expect(tzOffsetMin("America/Fortaleza", i)).toBe(-180);
    expect(tzOffsetMin("America/Manaus", i)).toBe(-240);
    expect(tzOffsetMin("Europe/Zurich", i)).toBe(60);
  });

  it("computes the gap with home on a date, following European clock changes", () => {
    expect(diffOnDate("America/Fortaleza", "Europe/Zurich", "2026-12-15")).toBe(-240);
    expect(diffOnDate("America/Manaus", "Europe/Zurich", "2026-12-21")).toBe(-300);
    // In July, Zurich is on summer time (UTC+2).
    expect(diffOnDate("America/Manaus", "Europe/Zurich", "2026-07-01")).toBe(-360);
  });

  it("converts a wall-clock time to an instant and back", () => {
    const i = zonedInstant("2026-12-20", "18:30", "America/Fortaleza");
    expect(i.toISOString()).toBe("2026-12-20T21:30:00.000Z");
    expect(wallClock("America/Manaus", i)).toEqual({ date: "2026-12-20", time: "17:30" });
    expect(wallClock("Europe/Zurich", i)).toEqual({ date: "2026-12-20", time: "22:30" });
  });

  it("formats differences with a true minus sign", () => {
    expect(fmtDiff(-300)).toBe("−5 h");
    expect(fmtDiff(60)).toBe("+1 h");
    expect(fmtDiff(-210)).toBe("−3 h 30");
    expect(fmtUtc(-180)).toBe("UTC−3");
  });

  it("judges whether calling home is reasonable", () => {
    expect(callHomeVerdict("19:05")).toBe("good");
    expect(callHomeVerdict("22:00")).toBe("borderline");
    expect(callHomeVerdict("02:00")).toBe("late");
  });
});
