import { describe, expect, it } from "vitest";
import { assignCodes, blindState, proposalCost, summary, verifiedShare, type BlindRun } from "./blind";
import type { Proposal } from "./protocol";

const p = (o: Partial<Proposal>): Proposal => ({ summary: "", questions: [], ops: [], ...o });

describe("blind test", () => {
  it("starts every provider from the same empty trip carrying only the story", () => {
    const a = blindState("Lisbonne en amoureux", "2026-10-13");
    expect(a).toEqual(blindState("Lisbonne en amoureux", "2026-10-13"));
    expect([a.trip.intent, a.trip.start, a.days.length, a.places.length]).toEqual(["Lisbonne en amoureux", "2026-12-12", 7, 0]);
  });
  it("hides the providers behind codes in a random order", () => {
    const codes = assignCodes(["anthropic", "openai", "mistral"], () => 0);
    expect(codes.map((c) => c.code)).toEqual(["A", "B", "C"]);
    expect(new Set(codes.map((c) => c.provider))).toEqual(new Set(["anthropic", "openai", "mistral"]));
    expect(codes.map((c) => c.provider)).not.toEqual(["anthropic", "openai", "mistral"]);
  });
  it("prices a proposal against its own budget, keeping other currencies apart", () => {
    const pr = p({ trip: { budget: 1000, homeCurrency: "EUR", adults: 2 }, ops: [
      { op: "add", date: "2026-12-12", slot: { type: "meal", title: "Dinner", price: { amount: 40, max: 60, currency: "EUR", per: "person", nature: "range" } } },
      { op: "addBooking", booking: { ref: "b", kind: "lodging", title: "Hotel", price: { amount: 900, currency: "EUR", per: "group", nature: "estimated" } } },
      { op: "add", date: "2026-12-12", slot: { type: "culture", title: "Museum", price: { amount: 20, currency: "USD", per: "person", nature: "estimated" } } },
    ] });
    expect(proposalCost(pr)).toEqual({ total: 1020, currency: "EUR", otherCurrency: 1, budget: 1000, adults: 2 });
  });
  it("averages the scores per provider once revealed", () => {
    const answer = p({ ops: [{ op: "addPlace", place: { ref: "x", name: "A", city: "B", country: "C", category: "museum" } }], checks: { x: { status: "verified", url: "u", source: "s", checkedAt: "d" } }, meta: { provider: "openai", model: "m", ms: 4000, inputTokens: 10, outputTokens: 20 } });
    expect(verifiedShare(answer)).toEqual({ verified: 1, places: 1 });
    const runs: BlindRun[] = [
      { story: 0, code: "A", provider: "openai", answer, scores: { fidelity: 4, french: 5, refusals: 0 } },
      { story: 1, code: "B", provider: "openai", error: "failed", scores: { fidelity: 2 } },
    ];
    const [s] = summary(runs);
    expect([s.provider, s.answered, s.failed, s.fidelity, s.french, s.verified, s.seconds]).toEqual(["openai", 1, 1, 3, 5, 1, 4]);
  });
});
