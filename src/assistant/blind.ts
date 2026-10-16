// Blind test of the AI providers (change list of 10 October 2026): the same stories go to each provider,
// answers are shown under a code, scored by the travellers, and the provider is revealed only at the end.
import { addDays } from "../lib/dates";
import type { TripState } from "../model/types";
import { compactState, type CompactState, type Proposal, type ProviderName } from "./protocol";

export interface BlindRun {
  story: number;
  code: string;
  provider: ProviderName;
  answer?: Proposal & { dropped?: number };
  error?: string;
  /** Scores given by the travellers: refusals contradicted (count), faithfulness and French quality (0 to 5). */
  scores: { refusals?: number; fidelity?: number; french?: number };
}
export interface BlindTestState { stories: string[]; runs: BlindRun[]; revealed: boolean }

/** A neutral empty trip carrying only the story, so every provider starts from the same point. */
export function blindState(story: string, today: string): CompactState {
  const start = addDays(today, 60), end = addDays(start, 6);
  const s: TripState = {
    trip: {
      id: "blind", name: { text: "Test", lang: "fr" }, start, end, travellers: { adults: 2, children: [] }, origin: { text: "", lang: "fr" },
      homeTz: "Europe/Paris", homePlug: { types: [], voltage: 0 }, homeCurrency: "EUR", budget: null, intent: { text: story, lang: "fr" },
      rules: { maxHeavy: 2, siesta: false, checkoutBy: "10:00", minMarginMin: null }, regions: [], theme: { dark: "", darker: "", accent: "", accentOnLight: "", regions: {} }, v: 2,
    },
    places: {}, bookings: [], days: Object.fromEntries(Array.from({ length: 7 }, (_, i) => addDays(start, i)).map((d) => [d, { date: d, slots: [] }])),
    sources: {}, checks: [], prep: [], log: [], expenses: [],
  };
  return compactState(s);
}

/** Codes for one story: providers in a random order, labelled A, B, C… */
export function assignCodes(providers: ProviderName[], random: () => number = Math.random): { code: string; provider: ProviderName }[] {
  const order = [...providers];
  for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
  return order.map((provider, i) => ({ code: String.fromCharCode(65 + i), provider }));
}

/**
 * Cost of a proposal in the budget's currency, from its own prices. Prices in another currency are counted apart,
 * since no rate is applied in the test; the travellers see both.
 */
export function proposalCost(p: Proposal): { total: number; currency?: string; otherCurrency: number; budget?: number; adults: number } {
  const currency = p.trip?.homeCurrency ?? "EUR";
  const people = (p.trip?.adults ?? 2) + (p.trip?.children?.length ?? 0);
  let total = 0, otherCurrency = 0;
  const prices = p.ops.flatMap((o) => (o.op === "add" ? [o.slot.price] : o.op === "addBooking" ? [o.booking.price] : [])).filter(Boolean);
  for (const pr of prices) {
    if (pr!.currency !== currency) { otherCurrency++; continue; }
    total += (pr!.max ?? pr!.amount ?? 0) * (pr!.per === "person" ? people : 1);
  }
  return { total, currency, otherCurrency, budget: p.trip?.budget, adults: people };
}

/** Share of proposed places found in the directory. */
export function verifiedShare(p: Proposal): { verified: number; places: number } {
  const refs = p.ops.flatMap((o) => (o.op === "addPlace" ? [o.place.ref] : []));
  return { verified: refs.filter((r) => p.checks?.[r]?.status === "verified").length, places: refs.length };
}

/** Average per provider, once revealed. */
export function summary(runs: BlindRun[]) {
  const by = new Map<ProviderName, BlindRun[]>();
  for (const r of runs) by.set(r.provider, [...(by.get(r.provider) ?? []), r]);
  const avg = (xs: (number | undefined)[]) => { const v = xs.filter((x): x is number => typeof x === "number"); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : undefined; };
  return [...by.entries()].map(([provider, rs]) => {
    const ok = rs.filter((r) => r.answer);
    return {
      provider, answered: ok.length, failed: rs.length - ok.length,
      fidelity: avg(rs.map((r) => r.scores.fidelity)), french: avg(rs.map((r) => r.scores.french)), refusals: avg(rs.map((r) => r.scores.refusals)),
      overBudget: ok.filter((r) => { const c = proposalCost(r.answer!); return c.budget !== undefined && c.total > c.budget; }).length,
      verified: avg(ok.map((r) => { const v = verifiedShare(r.answer!); return v.places ? v.verified / v.places : undefined; })),
      seconds: avg(ok.map((r) => (r.answer!.meta?.ms ?? 0) / 1000)),
      inputTokens: avg(ok.map((r) => r.answer!.meta?.inputTokens)), outputTokens: avg(ok.map((r) => r.answer!.meta?.outputTokens)),
    };
  });
}
