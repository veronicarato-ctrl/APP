// All reads and writes of a trip go through here, so every change is logged.
import { db, type TravelDB } from "./db";
import { importBrazil } from "../data/importBrazil";
import { newId } from "../lib/ids";
import type { Booking, Check, ISODate, Slot, TripState } from "../model/types";

const strip = <T extends { tripId: string }>({ tripId: _t, ...rest }: T) => rest;
const bySort = <T extends { order: number }>(a: T, b: T) => a.order - b.order;

export async function seedIfEmpty(d: TravelDB = db) {
  if ((await d.trips.count()) > 0) return;
  await saveState(importBrazil(), d);
}

export async function saveState(s: TripState, d: TravelDB = db) {
  const tripId = s.trip.id;
  await d.transaction("rw", [d.trips, d.places, d.bookings, d.days, d.sources, d.checks, d.prep, d.log], async () => {
    await d.trips.put(s.trip);
    await d.places.bulkPut(Object.values(s.places).map((p) => ({ ...p, tripId })));
    await d.bookings.bulkPut(s.bookings.map((b, order) => ({ ...b, tripId, order })));
    await d.days.bulkPut(Object.values(s.days).map((x) => ({ ...x, tripId })));
    await d.sources.bulkPut(Object.values(s.sources).map((x) => ({ ...x, tripId })));
    await d.checks.bulkPut(s.checks.map((c, order) => ({ ...c, tripId, order })));
    await d.prep.bulkPut(s.prep.map((p, order) => ({ ...p, tripId, order })));
    await d.log.bulkPut(s.log.map((l) => ({ ...l, tripId })));
  });
}

export async function loadState(tripId: string, d: TravelDB = db): Promise<TripState | undefined> {
  const trip = await d.trips.get(tripId);
  if (!trip) return undefined;
  const [places, bookings, days, sources, checks, prep, log] = await Promise.all([
    d.places.where({ tripId }).toArray(),
    d.bookings.where({ tripId }).toArray(),
    d.days.where({ tripId }).toArray(),
    d.sources.where({ tripId }).toArray(),
    d.checks.where({ tripId }).toArray(),
    d.prep.where({ tripId }).toArray(),
    d.log.where({ tripId }).reverse().sortBy("at"),
  ]);
  return {
    trip,
    places: Object.fromEntries(places.map((p) => [p.id, strip(p)])),
    bookings: bookings.sort(bySort).map(({ order: _o, ...b }) => strip(b)),
    days: Object.fromEntries(days.map((x) => [x.date, strip(x)])),
    sources: Object.fromEntries(sources.map((x) => [x.id, strip(x)])),
    checks: checks.sort(bySort).map(({ order: _o, ...c }) => strip(c)),
    prep: prep.sort(bySort).map(({ order: _o, ...p }) => strip(p)),
    log: log.map(strip),
  };
}

export const firstTripId = async (d: TravelDB = db) => (await d.trips.toCollection().first())?.id;

const logEntry = (d: TravelDB, tripId: string, message: string) =>
  d.log.add({ id: newId(), tripId, at: new Date().toISOString(), who: "me", message });

/** Saves a slot, optionally moving it to another day (appended at the end of that day). */
export async function saveSlot(tripId: string, fromDate: ISODate, slot: Slot, toDate: ISODate, d: TravelDB = db) {
  await d.transaction("rw", [d.days, d.log], async () => {
    const from = await d.days.get([tripId, fromDate]);
    if (!from) throw new Error("Day not found");
    const i = from.slots.findIndex((x) => x.id === slot.id);
    if (toDate === fromDate) {
      if (i >= 0) from.slots[i] = slot;
      else from.slots.push(slot);
      await d.days.put(from);
    } else {
      const to = await d.days.get([tripId, toDate]);
      if (!to) throw new Error("Day not found");
      if (i >= 0) from.slots.splice(i, 1);
      to.slots.push(slot);
      await d.days.bulkPut([from, to]);
    }
    const verb = i >= 0 ? "Edited" : "Added";
    await logEntry(d, tripId, `${verb} “${slot.title.text}”${toDate !== fromDate ? ` and moved from ${fromDate} to ${toDate}` : ` on ${fromDate}`}`);
  });
}

export async function deleteSlot(tripId: string, date: ISODate, slotId: string, d: TravelDB = db) {
  await d.transaction("rw", [d.days, d.log], async () => {
    const day = await d.days.get([tripId, date]);
    if (!day) return;
    const x = day.slots.find((y) => y.id === slotId);
    day.slots = day.slots.filter((y) => y.id !== slotId);
    await d.days.put(day);
    if (x) await logEntry(d, tripId, `Deleted “${x.title.text}” from ${date}`);
  });
}

export async function saveBooking(tripId: string, b: Booking, d: TravelDB = db) {
  await d.transaction("rw", [d.bookings, d.log], async () => {
    const prev = await d.bookings.get(b.id);
    await d.bookings.put({ ...b, tripId, order: prev?.order ?? (await d.bookings.where({ tripId }).count()) });
    const msg = prev && prev.status !== b.status
      ? `“${b.title.text}” status changed from ${prev.status} to ${b.status}`
      : `Booking “${b.title.text}” updated`;
    await logEntry(d, tripId, msg);
  });
}

export async function toggleCheck(tripId: string, id: string, d: TravelDB = db) {
  await d.transaction("rw", [d.checks, d.log], async () => {
    const c = await d.checks.get(id);
    if (!c) return;
    await d.checks.put({ ...c, done: !c.done });
    await logEntry(d, tripId, `${c.done ? "Reopened" : "Completed"} task “${c.text.text}”`);
  });
}

export async function addCheck(tripId: string, text: string, d: TravelDB = db) {
  const c: Check = { id: newId(), key: "", text: { text, lang: "en" }, done: false };
  await d.transaction("rw", [d.checks, d.log], async () => {
    await d.checks.put({ ...c, tripId, order: await d.checks.where({ tripId }).count() });
    await logEntry(d, tripId, `Added task “${text}”`);
  });
}

export async function resetTrip(tripId: string, d: TravelDB = db) {
  await d.transaction("rw", [d.trips, d.places, d.bookings, d.days, d.sources, d.checks, d.prep, d.log], async () => {
    for (const t of [d.places, d.bookings, d.days, d.sources, d.checks, d.prep, d.log]) await t.where({ tripId }).delete();
    await d.trips.delete(tripId);
  });
  await seedIfEmpty(d);
}
