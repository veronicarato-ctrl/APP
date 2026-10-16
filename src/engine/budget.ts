// Budget derived from the trip: what the travellers want to spend, what the plan is estimated to cost
// (from structured prices only) and what they actually spent. Nothing is stored here.
import type { BookingKind, ExpenseCategory, Price, Slot, SlotType, Text, TripState } from "../model/types";

export const CATEGORIES: ExpenseCategory[] = ["lodging", "food", "activities", "transport", "other"];

/** Units of each currency for one unit of the home currency; the home currency itself needs no entry. */
export type Rates = Record<string, number>;

const SLOT_CAT: Record<SlotType, ExpenseCategory> = {
  lodging: "lodging", meal: "food", transport: "transport", culture: "activities", nature: "activities", show: "activities", ritual: "activities", rest: "other",
};
const BOOKING_CAT: Record<BookingKind, ExpenseCategory> = {
  lodging: "lodging", flight: "transport", transfer: "transport", fee: "activities", permit: "activities", contact: "other", other: "other",
};

export const convert = (amount: number, currency: string, home: string, rates: Rates): number | undefined =>
  currency === home ? amount : rates[currency] > 0 ? amount / rates[currency] : undefined;

export type Skip = "noAmount" | "noCurrency" | "noRate";
export interface Range { low: number; high: number }
export interface Estimate {
  total: Range;
  byCat: Record<ExpenseCategory, Range>;
  /** Prices that could not be counted, with the reason, so the total never looks more complete than it is. */
  skipped: { title: Text; reason: Skip }[];
  counted: number;
}

const zero = (): Record<ExpenseCategory, Range> => Object.fromEntries(CATEGORIES.map((c) => [c, { low: 0, high: 0 }])) as never;
const travellers = (s: TripState) => s.trip.travellers.adults + s.trip.travellers.children.length;

/** Low and high value of one price in the home currency, for the whole group. */
export function priceRange(p: Price, s: TripState, rates: Rates): Range | Skip {
  if (typeof p.amount !== "number") return "noAmount";
  if (!p.currency) return "noCurrency";
  const k = p.per === "person" ? travellers(s) : 1;
  const low = convert(p.amount * k, p.currency, s.trip.homeCurrency, rates);
  const high = convert((p.max ?? p.amount) * k, p.currency, s.trip.homeCurrency, rates);
  return low === undefined || high === undefined ? "noRate" : { low, high };
}

/** Estimated cost of the plan. A slot linked to a priced booking is not counted twice. */
export function estimate(s: TripState, rates: Rates): Estimate {
  const byCat = zero();
  const skipped: Estimate["skipped"] = [];
  let counted = 0;
  const add = (p: Price | undefined, cat: ExpenseCategory, title: Text) => {
    if (!p || (p.amount === undefined && !p.note)) return;
    const r = priceRange(p, s, rates);
    if (typeof r === "string") { skipped.push({ title, reason: r }); return; }
    byCat[cat].low += r.low; byCat[cat].high += r.high; counted++;
  };
  const priced = new Set(s.bookings.filter((b) => typeof b.price?.amount === "number").map((b) => b.id));
  for (const b of s.bookings) add(b.price, BOOKING_CAT[b.kind], b.title);
  for (const day of Object.values(s.days))
    for (const x of day.slots as Slot[]) if (!(x.bookingId && priced.has(x.bookingId))) add(x.price, SLOT_CAT[x.type], x.title);
  const total = CATEGORIES.reduce((t, c) => ({ low: t.low + byCat[c].low, high: t.high + byCat[c].high }), { low: 0, high: 0 });
  return { total, byCat, skipped, counted };
}

export interface Spent { total: number; byCat: Record<ExpenseCategory, number>; noRate: number }

/** Money actually spent, in the home currency; expenses in a currency without a rate are counted apart. */
export function spent(s: TripState, rates: Rates): Spent {
  const byCat = Object.fromEntries(CATEGORIES.map((c) => [c, 0])) as Record<ExpenseCategory, number>;
  let total = 0, noRate = 0;
  for (const x of s.expenses) {
    const v = convert(x.amount, x.currency, s.trip.homeCurrency, rates);
    if (v === undefined) { noRate++; continue; }
    byCat[x.category] += v; total += v;
  }
  return { total, byCat, noRate };
}

/** Share of the budget the estimate goes over, e.g. 0.63 for 63 %; undefined without a budget or when within it. */
export function overBudget(budget: number | null, cost: number): number | undefined {
  if (!budget || budget <= 0 || cost <= budget) return undefined;
  return (cost - budget) / budget;
}

