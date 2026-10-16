import { describe, expect, it } from "vitest";
import { estimate, overBudget, spent } from "./budget";
import { booking, slot, trip } from "./testkit";
import { importBrazil } from "../data/importBrazil";

const base = () => {
  const s = trip({
    "2026-12-14": [
      slot("dinner", { type: "meal", price: { amount: 30, currency: "EUR", per: "person", nature: "estimated" } }),
      slot("boat", { type: "nature", price: { amount: 100, max: 160, currency: "BRL", per: "group", nature: "range" } }),
      slot("hotel-night", { type: "lodging", bookingId: "hotel", price: { amount: 999, currency: "EUR" } }),
      slot("museum", { type: "culture", price: { note: { text: "around 20 reais", lang: "en" } } }),
    ],
  }, [booking("hotel", { kind: "lodging", price: { amount: 220, currency: "EUR", per: "group", nature: "confirmed" } })]);
  s.trip.homeCurrency = "EUR";
  return s;
};

describe("estimated cost", () => {
  it("adds structured prices in the home currency, per person times travellers, ranges as low and high", () => {
    const e = estimate(base(), { BRL: 5 });
    expect(e.byCat.food).toEqual({ low: 60, high: 60 });
    expect(e.byCat.activities).toEqual({ low: 20, high: 32 });
    expect(e.byCat.lodging).toEqual({ low: 220, high: 220 });
    expect(e.total).toEqual({ low: 300, high: 312 });
  });
  it("never counts a slot twice when its booking already has a price", () => {
    expect(estimate(base(), { BRL: 5 }).byCat.lodging.high).toBe(220);
  });
  it("lists what it could not count: text prices and currencies without a rate", () => {
    const e = estimate(base(), {});
    expect(e.skipped.map((x) => [x.title.text, x.reason])).toEqual([["boat", "noRate"], ["museum", "noAmount"]]);
    expect(e.total).toEqual({ low: 280, high: 280 });
  });
  it("counts nothing for the imported Brazil trip, whose prices are all written as text", () => {
    const e = estimate(importBrazil(), {});
    expect(e.counted).toBe(0);
    expect(e.total).toEqual({ low: 0, high: 0 });
  });
});

describe("money spent and budget", () => {
  it("converts expenses and keeps those without a rate apart", () => {
    const s = base();
    s.expenses = [
      { id: "a", date: "2026-12-14", amount: 50, currency: "EUR", category: "food", who: "" },
      { id: "b", date: "2026-12-14", amount: 100, currency: "BRL", category: "transport", who: "" },
      { id: "c", date: "2026-12-14", amount: 10, currency: "USD", category: "other", who: "" },
    ];
    const r = spent(s, { BRL: 5 });
    expect(r.total).toBe(70);
    expect(r.byCat.transport).toBe(20);
    expect(r.noRate).toBe(1);
  });
  it("says by how much the estimate goes over the budget, as the Emergent example would have", () => {
    expect(overBudget(2000, 3253)).toBeCloseTo(0.6265, 3);
    expect(overBudget(2000, 1800)).toBeUndefined();
    expect(overBudget(null, 3253)).toBeUndefined();
  });
});
