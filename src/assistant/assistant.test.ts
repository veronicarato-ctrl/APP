import { describe, expect, it } from "vitest";
import { importBrazil } from "../data/importBrazil";
import { booking, slot, trip } from "../engine/testkit";
import { applyDraft, applyOps, newIssues } from "./apply";
import { compactState, parseProposal, searchUrl, systemPrompt, type Proposal } from "./protocol";

describe("reading the model's answer", () => {
  it("keeps valid operations, drops broken ones and counts them", () => {
    const text = 'Here you go:\n' + JSON.stringify({
      summary: "Three days in Lisbon.", questions: ["Hotel or flat?", "", 4],
      trip: { name: "Lisboa", budget: 1200, destCurrency: "eur", modes: { gastronomy: 5, luxury: 9 }, adults: 0 },
      ops: [
        { op: "addPlace", place: { ref: "p1", name: "Time Out Market", city: "Lisbon", country: "Portugal", category: "restaurant", tz: "Europe/Lisbon" } },
        { op: "add", date: "2026-12-14", slot: { type: "meal", title: "Lunch", start: "12:30", end: "25:00", place: "p1", price: { amount: 20, currency: "eur", per: "person" } } },
        { op: "add", date: "14/12/2026", slot: { type: "meal", title: "Bad date" } },
        { op: "add", date: "2026-12-14", slot: { type: "party", title: "Unknown type" } },
        { op: "delete", id: "x1", reason: "too much" },
        { op: "rewriteEverything" },
      ],
    }) + "\nEnjoy!";
    const { proposal, dropped } = parseProposal(text);
    expect(dropped).toBe(3);
    expect(proposal!.questions).toEqual(["Hotel or flat?"]);
    expect(proposal!.trip).toEqual({ name: "Lisboa", budget: 1200, destCurrency: "EUR", modes: { gastronomy: 5 } });
    const add = proposal!.ops[1];
    expect(add).toEqual({ op: "add", date: "2026-12-14", slot: { type: "meal", title: "Lunch", start: "12:30", place: "p1", price: { amount: 20, currency: "EUR", per: "person", nature: "estimated" } } });
  });
  it("says when the answer is not JSON", () => {
    expect(parseProposal("Sorry, I cannot.").error).toBe("notJson");
  });
  it("tells the model the principles, the priority order and to never invent", () => {
    const p = systemPrompt("propose");
    expect(p).toContain("Never invent a fact");
    expect(p).toContain("Safety first, then legal obligations, confirmed bookings, must-dos, budget");
    expect(p).toContain('"locked": true');
  });
  it("sends a compact trip that marks confirmed bookings as locked", () => {
    const s = importBrazil();
    const h1 = s.bookings.find((b) => b.key === "h1")!;
    h1.status = "confirmed";
    const c = compactState(s);
    expect(c.bookings.find((b) => b.id === h1.id)!.locked).toBe(true);
    const lockedSlots = c.days.flatMap((d) => d.slots).filter((x) => x.locked);
    expect(lockedSlots.length).toBeGreaterThan(0);
    expect(JSON.stringify(c).length).toBeLessThan(JSON.stringify(s).length);
  });
  it("builds search links that are never presented as the place's own page", () => {
    expect(searchUrl({ name: "Pestana Palace", city: "Lisbon", country: "Portugal", category: "hotel" })).toBe("https://www.booking.com/searchresults.html?ss=Pestana%20Palace%2C%20Lisbon%2C%20Portugal");
    expect(searchUrl({ name: "MAAT", city: "Lisbon", country: "Portugal", category: "museum" })).toBe("https://www.google.com/maps/search/?api=1&query=MAAT%2C%20Lisbon%2C%20Portugal");
  });
});

describe("applying the ticked operations", () => {
  const base = () => trip({
    "2026-12-14": [slot("a", { start: "09:00" }), slot("locked", { start: "11:00", bookingId: "conf" }), slot("c", { start: "15:00" })],
  }, [booking("conf", { status: "confirmed", ref: "X1" })]);
  const proposal: Proposal = {
    summary: "", questions: [],
    ops: [
      { op: "add", date: "2026-12-14", slot: { type: "meal", title: "Lunch", start: "12:30", place: "p1" } },
      { op: "addPlace", place: { ref: "p1", name: "Time Out Market", city: "Lisbon", country: "Portugal", category: "restaurant", tz: "Europe/Lisbon" } },
      { op: "delete", id: "locked", reason: "make room" },
      { op: "update", id: "locked", patch: { start: "13:00" } },
      { op: "update", id: "c", date: "2026-12-15", patch: {} },
      { op: "add", date: "2027-01-01", slot: { type: "culture", title: "Outside" } },
      { op: "daySummary", date: "2026-12-14", text: "Markets and tiles." },
      { op: "addBooking", booking: { ref: "b1", kind: "fee", title: "Museum tickets", place: "p1", date: "2026-12-14" } },
    ],
    checks: { p1: { status: "verified", url: "https://example.org/time-out-market", source: "Directory", checkedAt: "2026-10-13", lat: 38.7, lng: -9.1 } },
  };

  it("creates places first so the slot finds its place, and inserts by time without reordering the rest", () => {
    const r = applyOps(base(), proposal, [0, 1], "en");
    const day = r.state.days["2026-12-14"].slots;
    expect(day.map((x) => x.title.text)).toEqual(["a", "locked", "Lunch", "c"]);
    const lunch = day[2];
    expect([lunch.origin, lunch.info]).toEqual(["ai", "proposed"]);
    const place = r.state.places[lunch.placeId!];
    expect([place.name.text, place.tz, place.approx, place.lat]).toEqual(["Time Out Market, Lisbon", "Europe/Lisbon", false, 38.7]);
    expect(r.state.sources[place.sources![0]].url).toBe("https://example.org/time-out-market");
  });
  it("refuses any change to a locked slot, and anything outside the trip", () => {
    const r = applyOps(base(), proposal, [2, 3, 5], "en");
    expect(r.refused).toEqual([{ index: 2, reason: "locked" }, { index: 3, reason: "locked" }, { index: 5, reason: "outsideTrip" }]);
    expect(r.state.days["2026-12-14"].slots.find((x) => x.id === "locked")!.start).toBe("11:00");
  });
  it("moves a slot to another day only when ticked, and writes everything to the history", () => {
    const r = applyOps(base(), proposal, [4, 6], "en");
    expect(r.state.days["2026-12-15"].slots.map((x) => x.id)).toEqual(["c"]);
    expect(r.state.days["2026-12-14"].summary).toEqual({ text: "Markets and tiles.", lang: "en" });
    expect(r.log).toEqual(["Assistant: moved “c” from 2026-12-14 to 2026-12-15", "Assistant: summary of 2026-12-14"]);
  });
  it("adds a booking to make, never a confirmed one, with its booking link", () => {
    const r = applyOps(base(), proposal, [1, 7], "en");
    const b = r.state.bookings.find((x) => x.title.text === "Museum tickets")!;
    expect(b.status).toBe("todo");
    expect(b.links).toEqual([{ label: "Book", url: "https://example.org/time-out-market" }]);
  });
  it("leaves the original trip untouched", () => {
    const s = base();
    const copy = JSON.stringify(s);
    applyOps(s, proposal, [0, 1, 4, 6, 7], "en");
    expect(JSON.stringify(s)).toBe(copy);
  });
  it("shows the problems a change would create before it is applied", () => {
    const s = base();
    const heavy: Proposal = { summary: "", questions: [], ops: [1, 2, 3].map((n) => ({ op: "add" as const, date: "2026-12-14", slot: { type: "nature" as const, title: `Hike ${n}`, heavy: true } })) };
    const after = applyOps(s, heavy, [0, 1, 2], "en").state;
    expect(newIssues(s, after).map((x) => x.code)).toEqual(["tooManyHeavy"]);
  });
  it("applies only the deduced settings that were ticked", () => {
    const t = base().trip;
    const out = applyDraft(t, { name: "Lisboa", budget: 1200, adults: 3 }, ["budget"]);
    expect([out.name.text, out.budget, out.travellers.adults]).toEqual([t.name.text, 1200, t.travellers.adults]);
  });
});
