// Minimal trip builder for rule tests.
import type { Booking, Slot, TripState } from "../model/types";

const t = (text: string) => ({ text, lang: "en" as const });

export const slot = (id: string, o: Partial<Slot> = {}): Slot => ({
  id, key: id, type: "culture", title: t(id), start: "", end: "", heavy: false, who: "", origin: "user", ...o,
});

export const booking = (id: string, o: Partial<Booking> = {}): Booking => ({
  id, key: id, kind: "other", title: t(id), status: "todo", ref: "", tel: "", addr: "", checkIn: "", checkOut: "", ...o,
});

/** Two-day trip (one night) covered by a lodging, so it starts with zero issues. */
export function trip(days: Record<string, Slot[]> = {}, bookings: Booking[] = [], rules: Partial<TripState["trip"]["rules"]> = {}): TripState {
  const start = "2026-12-14", end = "2026-12-15";
  return {
    trip: {
      id: "t", name: t("Test"), start, end, travellers: { adults: 2, children: [] }, origin: t("Home"),
      homeTz: "Europe/Zurich", homePlug: { types: ["C", "J"], voltage: 230 }, homeCurrency: "CHF", budget: null,
      rules: { maxHeavy: 2, siesta: false, checkoutBy: "10:00", minMarginMin: null, ...rules },
      regions: [], theme: { dark: "", darker: "", accent: "", accentOnLight: "", regions: {} }, v: 2,
    },
    places: {},
    bookings: [booking("night", { kind: "lodging", from: start, to: end }), ...bookings],
    days: Object.fromEntries([start, end].map((d) => [d, { date: d, slots: days[d] ?? [] }])),
    sources: {}, checks: [], prep: [], log: [],
  };
}
