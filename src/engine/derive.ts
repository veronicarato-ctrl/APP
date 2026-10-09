// Views derived from the single trip state (nothing here is stored).
import { dateRange, toMinutes } from "../lib/dates";
import { zonedInstant } from "../lib/time";
import type { Booking, ISODate, Place, Slot, TripState } from "../model/types";

export interface TrailPoint { date: ISODate; slot: Slot; place: Place }

/** Every slot that has a place, in trip order. */
export function trail(s: TripState): TrailPoint[] {
  return dateRange(s.trip.start, s.trip.end).flatMap((date) =>
    (s.days[date]?.slots ?? []).flatMap((slot) => {
      const place = slot.placeId ? s.places[slot.placeId] : undefined;
      return place ? [{ date, slot, place }] : [];
    }),
  );
}

/** Place where the traveller is before a given slot (last place reached before it). */
export function placeBefore(s: TripState, date: ISODate, slotId?: string): Place | undefined {
  let last: Place | undefined;
  for (const p of trail(s)) {
    if (p.date > date || (p.date === date && (!slotId || p.slot.id === slotId))) break;
    last = p.place;
  }
  return last;
}

/** Places of the day in slot order, starting with where the day begins. */
export function dayPath(s: TripState, date: ISODate): Place[] {
  const start = placeBefore(s, date);
  const out: Place[] = start ? [start] : [];
  for (const p of trail(s)) if (p.date === date && out[out.length - 1]?.id !== p.place.id) out.push(p.place);
  return out;
}

/** Time zone change within a day (start zone differs from end zone). */
export function tzChange(s: TripState, date: ISODate): { from: Place; to: Place } | undefined {
  const path = dayPath(s, date);
  if (path.length < 2) return undefined;
  const from = path[0], to = path[path.length - 1];
  return from.tz !== to.tz ? { from, to } : undefined;
}

/** Departure and arrival places of a transport slot. */
export function transportEnds(s: TripState, date: ISODate, slot: Slot): { from?: Place; to?: Place } {
  return { from: placeBefore(s, date, slot.id), to: slot.placeId ? s.places[slot.placeId] : undefined };
}

/** Lodging booked for the night starting on this date. */
export const lodgingForNight = (s: TripState, date: ISODate): Booking | undefined =>
  s.bookings.find((b) => b.kind === "lodging" && b.from && b.to && b.from <= date && date < b.to);

/** Transport slots of a day, with their bookings. */
export const dayTransports = (s: TripState, date: ISODate) =>
  (s.days[date]?.slots ?? []).filter((x) => x.type === "transport").map((slot) => ({
    slot, booking: slot.bookingId ? s.bookings.find((b) => b.id === slot.bookingId) : undefined, ...transportEnds(s, date, slot),
  }));

/** Zone used for a slot's times: its own place, else where the traveller is at that point. */
export const slotTz = (s: TripState, date: ISODate, slot: Slot) =>
  (slot.placeId && s.places[slot.placeId]?.tz) || placeBefore(s, date, slot.id)?.tz || dayPath(s, date)[0]?.tz;

export interface Upcoming { date: ISODate; slot: Slot; at: Date }

/** Next timed slots after an instant (slots without a time cannot be placed and are skipped). */
export function upcoming(s: TripState, now: Date, filter: (x: Slot) => boolean = () => true): Upcoming[] {
  const out: Upcoming[] = [];
  for (const date of dateRange(s.trip.start, s.trip.end))
    for (const slot of s.days[date]?.slots ?? []) {
      const tz = slotTz(s, date, slot);
      if (!slot.start || !tz || !filter(slot)) continue;
      const at = zonedInstant(date, slot.start, tz);
      if (at > now) out.push({ date, slot, at });
    }
  return out.sort((a, b) => a.at.getTime() - b.at.getTime());
}

/** Time in transport compared with time on site, from slots that have both times. */
export function dayTimeSplit(s: TripState, date: ISODate) {
  let travel = 0, onSite = 0, untimed = 0;
  for (const x of s.days[date]?.slots ?? []) {
    const a = toMinutes(x.start), b = toMinutes(x.end);
    if (a === null || b === null || b <= a) { if (x.type !== "lodging") untimed++; continue; }
    if (x.type === "transport") travel += b - a; else onSite += b - a;
  }
  return { travel, onSite, untimed };
}

export interface Stop { n: number; place: Place; dates: ISODate[] }
export interface Segment { from: Place; to: Place; date: ISODate }

/** Numbered stops (first appearance order) and route segments between consecutive places. */
export function route(s: TripState, onlyDate?: ISODate): { stops: Stop[]; segments: Segment[] } {
  const stops: Stop[] = [];
  const segments: Segment[] = [];
  let prev: Place | undefined;
  for (const p of trail(s)) {
    let stop = stops.find((x) => x.place.id === p.place.id);
    if (!stop) stops.push((stop = { n: stops.length + 1, place: p.place, dates: [] }));
    if (!stop.dates.includes(p.date)) stop.dates.push(p.date);
    if (prev && prev.id !== p.place.id && (!onlyDate || p.date === onlyDate)) segments.push({ from: prev, to: p.place, date: p.date });
    prev = p.place;
  }
  return { stops, segments };
}
