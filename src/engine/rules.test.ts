import { describe, expect, it } from "vitest";
import { runRules } from "./rules";
import { booking, slot, trip } from "./testkit";
import { importBrazil } from "../data/importBrazil";

const codes = (s: ReturnType<typeof trip>) => runRules(s).map((i) => `${i.level}:${i.code}`);
const D1 = "2026-12-14", D2 = "2026-12-15";

describe("baseline", () => {
  it("a covered trip with no slots has no issues", () => expect(runRules(trip())).toEqual([]));
});

describe("rule 1, overlap", () => {
  it("flags overlapping slots without who", () => {
    expect(codes(trip({ [D1]: [slot("a", { start: "09:00", end: "11:00" }), slot("b", { start: "10:00", end: "12:00" })] }))).toEqual(["error:overlap"]);
  });
  it("accepts overlap when two different people are named", () => {
    expect(codes(trip({ [D1]: [slot("a", { start: "09:00", end: "11:00", who: "A" }), slot("b", { start: "10:00", end: "12:00", who: "B" })] }))).toEqual([]);
  });
  it("ignores slots touching end to start", () => {
    expect(codes(trip({ [D1]: [slot("a", { start: "09:00", end: "10:00" }), slot("b", { start: "10:00", end: "11:00" })] }))).toEqual([]);
  });
});

describe("rule 2, check-in right after arrival", () => {
  const checkin = slot("ci", { type: "lodging", bookingId: "night" });
  it("flags an activity between arrival and check-in", () => {
    expect(codes(trip({ [D1]: [slot("tr", { type: "transport" }), slot("x"), checkin] }))).toEqual(["error:checkinNotAfterArrival"]);
  });
  it("accepts check-in right after the transport", () => {
    expect(codes(trip({ [D1]: [slot("tr", { type: "transport" }), checkin, slot("x")] }))).toEqual([]);
  });
});

describe("rule 3, late checkout", () => {
  it("warns after checkoutBy", () => {
    expect(codes(trip({ [D2]: [slot("co", { type: "lodging", bookingId: "night", start: "11:00" })] }))).toEqual(["warning:lateCheckout"]);
  });
  it("accepts checkout at checkoutBy", () => {
    expect(codes(trip({ [D2]: [slot("co", { type: "lodging", bookingId: "night", start: "10:00" })] }))).toEqual([]);
  });
});

describe("rule 4, heavy activities", () => {
  it("warns above maxHeavy", () => {
    const h = (id: string) => slot(id, { heavy: true });
    expect(codes(trip({ [D1]: [h("a"), h("b"), h("c")] }))).toEqual(["warning:tooManyHeavy"]);
    expect(codes(trip({ [D1]: [h("a"), h("b")] }))).toEqual([]);
  });
});

describe("rule 5, siesta", () => {
  const h = (id: string) => slot(id, { heavy: true });
  it("warns on an intense day without rest 13 to 15 when siesta is on", () => {
    expect(codes(trip({ [D1]: [h("a"), h("b")] }, [], { siesta: true }))).toEqual(["warning:noSiesta"]);
  });
  it("accepts a rest slot covering the window", () => {
    expect(codes(trip({ [D1]: [h("a"), h("b"), slot("r", { type: "rest", start: "13:30", end: "15:30" })] }, [], { siesta: true }))).toEqual([]);
  });
  it("is silent when siesta is off", () => expect(codes(trip({ [D1]: [h("a"), h("b")] }))).toEqual([]));
});

describe("rule 6, night coverage", () => {
  it("flags an uncovered night", () => {
    const s = trip(); s.bookings = [];
    expect(codes(s)).toEqual(["error:nightUncovered"]);
  });
  it("flags a night with two lodgings", () => {
    expect(codes(trip({}, [booking("other", { kind: "lodging", from: D1, to: D2 })]))).toEqual(["error:nightMultiple"]);
  });
});

describe("rule 7, confirmed booking data", () => {
  it("warns on confirmed without reference", () => {
    expect(codes(trip({}, [booking("f", { kind: "flight", status: "confirmed" })]))).toEqual(["warning:confirmedNoRef"]);
  });
  it("warns on confirmed lodging without address or phone", () => {
    const s = trip(); s.bookings[0] = { ...s.bookings[0], status: "confirmed", ref: "R1", addr: "Rua", tel: "" };
    expect(codes(s)).toEqual(["warning:lodgingNoContact"]);
  });
});

describe("rule 8, broken booking reference", () => {
  it("flags a slot pointing to a missing booking", () => {
    expect(codes(trip({ [D1]: [slot("a", { bookingId: "ghost" })] }))).toEqual(["error:brokenBookingRef"]);
  });
});

describe("rule 9, flights", () => {
  it("flags noRoute", () => expect(codes(trip({}, [booking("f", { kind: "flight", date: D1, noRoute: true })]))).toEqual(["error:flightNoRoute"]));
  it("flags a flight off its operating days (14 Dec 2026 is a Monday)", () => {
    expect(codes(trip({}, [booking("f", { kind: "flight", date: D1, opDays: [6] })]))).toEqual(["error:flightOffDay"]);
    expect(codes(trip({}, [booking("f", { kind: "flight", date: D1, opDays: [1] })]))).toEqual([]);
  });
  it("warns on warn", () => expect(codes(trip({}, [booking("f", { kind: "flight", date: D1, warn: { text: "x", lang: "en" } })]))).toEqual(["warning:flightWarn"]));
  it("skips confirmed flights", () => {
    expect(codes(trip({}, [booking("f", { kind: "flight", date: D1, noRoute: true, status: "confirmed", ref: "R" })]))).toEqual([]);
  });
});

describe("rule 10, margin after arrival", () => {
  const day = [slot("tr", { type: "transport", start: "08:00", end: "10:00" }), slot("a", { start: "10:30", end: "11:00" })];
  it("warns when the margin is below minMarginMin", () => expect(codes(trip({ [D1]: day }, [], { minMarginMin: 60 }))).toEqual(["warning:shortMargin"]));
  it("is inactive when minMarginMin is null", () => expect(codes(trip({ [D1]: day }))).toEqual([]));
});

describe("Brazil 2026 seed (SPEC section 8 acceptance)", () => {
  const issues = runRules(importBrazil());
  const s = importBrazil();
  const key = (id?: string) => s.bookings.find((b) => b.id === id)?.key;

  it("has exactly two errors, both on 20 December", () => {
    const errors = issues.filter((i) => i.level === "error");
    expect(errors.map((e) => [e.code, e.date, key(e.bookingId)])).toEqual([
      ["flightNoRoute", "2026-12-20", "f2"],
      ["flightOffDay", "2026-12-20", "f3"],
    ]);
  });

  it("has exactly three warnings, São Gabriel flights and Manaus Lisbon", () => {
    const warnings = issues.filter((i) => i.level === "warning");
    expect(warnings.map((w) => [w.code, w.date, key(w.bookingId)])).toEqual([
      ["flightWarn", "2026-12-23", "f4"],
      ["flightWarn", "2026-12-25", "f5"],
      ["flightWarn", "2026-12-26", "f6"],
    ]);
  });
});
