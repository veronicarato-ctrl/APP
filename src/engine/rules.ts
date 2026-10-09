// Rules engine (SPEC section 8). Pure function of the trip state, run on every change.
// Issues carry a code and parameters, never a sentence, so the UI translates them.
import { dateRange, toMinutes, weekday } from "../lib/dates";
import type { Booking, ISODate, TripState } from "../model/types";

export type IssueLevel = "error" | "warning";

export type IssueCode =
  | "overlap"
  | "checkinNotAfterArrival"
  | "lateCheckout"
  | "tooManyHeavy"
  | "noSiesta"
  | "nightUncovered"
  | "nightMultiple"
  | "confirmedNoRef"
  | "lodgingNoContact"
  | "brokenBookingRef"
  | "flightNoRoute"
  | "flightOffDay"
  | "flightWarn"
  | "shortMargin";

export interface Issue {
  level: IssueLevel;
  code: IssueCode;
  date?: ISODate;
  slotId?: string;
  bookingId?: string;
  params: Record<string, string | number | number[]>;
}

export const isLocked = (bookingId: string | undefined, bookings: Record<string, Booking>) =>
  !!bookingId && bookings[bookingId]?.status === "confirmed";

export const bookingMap = (s: TripState): Record<string, Booking> =>
  Object.fromEntries(s.bookings.map((b) => [b.id, b]));

export function runRules(s: TripState): Issue[] {
  const out: Issue[] = [];
  const bm = bookingMap(s);
  const R = s.trip.rules;
  const dates = dateRange(s.trip.start, s.trip.end);

  for (const d of dates) {
    const sl = s.days[d]?.slots ?? [];

    // 1. Overlapping slots without saying who does what.
    for (let i = 0; i < sl.length; i++)
      for (let j = i + 1; j < sl.length; j++) {
        const a = sl[i], b = sl[j];
        if (!(a.start && a.end && b.start && b.end)) continue;
        if (!(a.who === b.who || !a.who || !b.who)) continue;
        if (toMinutes(a.start)! < toMinutes(b.end)! && toMinutes(b.start)! < toMinutes(a.end)!)
          out.push({ level: "error", code: "overlap", date: d, slotId: b.id, params: { a: a.title.text, b: b.title.text } });
      }

    sl.forEach((x, i) => {
      const bk = x.bookingId ? bm[x.bookingId] : undefined;
      if (x.type !== "lodging" || bk?.kind !== "lodging") return;
      // 2. Check-in must come right after the last transport of the arrival day.
      if (bk.from === d) {
        let arrival = -1;
        for (let k = 0; k < i; k++) if (sl[k].type === "transport") arrival = k;
        if (arrival >= 0 && arrival !== i - 1)
          out.push({ level: "error", code: "checkinNotAfterArrival", date: d, slotId: x.id, params: { booking: bk.title.text } });
      }
      // 3. Check-out after the configured hour.
      if (bk.to === d && x.start && toMinutes(x.start)! > toMinutes(R.checkoutBy)!)
        out.push({ level: "warning", code: "lateCheckout", date: d, slotId: x.id, params: { by: R.checkoutBy } });
    });

    // 4. Too many heavy activities.
    const heavy = sl.filter((x) => x.heavy).length;
    if (heavy > R.maxHeavy) out.push({ level: "warning", code: "tooManyHeavy", date: d, params: { count: heavy, max: R.maxHeavy } });

    // 5. Intense day without rest between 13:00 and 15:00.
    if (R.siesta && heavy >= 2) {
      const rested = sl.some((x) => {
        const st = toMinutes(x.start), en = toMinutes(x.end);
        return x.type === "rest" && st !== null && en !== null && st <= 15 * 60 && en >= 13 * 60;
      });
      if (!rested) out.push({ level: "warning", code: "noSiesta", date: d, params: {} });
    }

    // 10. Margin between an arrival and the next activity.
    if (R.minMarginMin !== null) {
      sl.forEach((x, i) => {
        const next = sl[i + 1];
        const arr = toMinutes(x.end), nxt = next ? toMinutes(next.start) : null;
        if (x.type === "transport" && arr !== null && nxt !== null && nxt - arr < R.minMarginMin!)
          out.push({ level: "warning", code: "shortMargin", date: d, slotId: next.id, params: { minutes: nxt - arr, min: R.minMarginMin! } });
      });
    }
  }

  // 6. Every night covered by exactly one lodging.
  for (const d of dates.slice(0, -1)) {
    const c = s.bookings.filter((b) => b.kind === "lodging" && b.from && b.to && b.from <= d && d < b.to);
    if (c.length === 0) out.push({ level: "error", code: "nightUncovered", date: d, params: {} });
    if (c.length > 1) out.push({ level: "error", code: "nightMultiple", date: d, params: { count: c.length } });
  }

  // 7. Confirmed bookings missing practical data.
  for (const b of s.bookings) {
    if (b.status !== "confirmed") continue;
    if (!b.ref) out.push({ level: "warning", code: "confirmedNoRef", bookingId: b.id, params: { booking: b.title.text } });
    if (b.kind === "lodging" && (!b.addr || !b.tel))
      out.push({ level: "warning", code: "lodgingNoContact", bookingId: b.id, params: { booking: b.title.text } });
  }

  // 9. Flights without a known route, off their operating days, or flagged.
  for (const b of s.bookings) {
    if (b.kind !== "flight" || b.status === "confirmed") continue;
    if (b.noRoute) out.push({ level: "error", code: "flightNoRoute", date: b.date, bookingId: b.id, params: { booking: b.title.text } });
    else if (b.opDays && b.date && !b.opDays.includes(weekday(b.date)))
      out.push({ level: "error", code: "flightOffDay", date: b.date, bookingId: b.id, params: { booking: b.title.text, days: b.opDays, date: b.date } });
    else if (b.warn) out.push({ level: "warning", code: "flightWarn", date: b.date, bookingId: b.id, params: { booking: b.title.text, warn: b.warn.text } });
  }

  // 8. Slot pointing to a booking that does not exist.
  for (const d of dates)
    for (const x of s.days[d]?.slots ?? [])
      if (x.bookingId && !bm[x.bookingId])
        out.push({ level: "error", code: "brokenBookingRef", date: d, slotId: x.id, params: { slot: x.title.text } });

  return out;
}
