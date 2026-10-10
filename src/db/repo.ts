// All reads and writes of a trip go through here, so every change is logged.
import { db, type TravelDB } from "./db";
import { importBrazil, PROTOTYPE } from "../data/importBrazil";
import { THEMES } from "../data/themes";
import { dateRange } from "../lib/dates";
import { newId } from "../lib/ids";
import type { Booking, Check, ISODate, Place, Slot, TravelMode, Trip, TripState } from "../model/types";

type WriteListener = (tripId: string, d: TravelDB, opts: { baseline?: boolean }) => void | Promise<void>;
const listeners = new Set<WriteListener>();
/** Called after every local write (used by the sync layer to stamp changed fields). */
export const onLocalWrite = (l: WriteListener) => { listeners.add(l); return () => listeners.delete(l); };
const wrote = async (tripId: string, d: TravelDB, opts: { baseline?: boolean } = {}) => {
  for (const l of listeners) await l(tripId, d, opts);
};

let actor = "me";
/** Name written in the history log for local changes (the signed-in e-mail when there is one). */
export const setActor = (who: string) => { actor = who; };

const strip = <T extends { tripId: string }>({ tripId: _t, ...rest }: T) => rest;
const bySort = <T extends { order: number }>(a: T, b: T) => a.order - b.order;

/** Adds the Brazil 2026 trip from the reference prototype as an ordinary trip (fresh ids by default). */
export async function loadExampleTrip(d: TravelDB = db, scope: string = newId()) {
  const s = importBrazil(PROTOTYPE, scope);
  await saveState(s, d);
  await wrote(s.trip.id, d);
  await setActiveTripId(s.trip.id, d);
  return s.trip.id;
}

export interface NewTrip {
  name: string;
  lang: Trip["name"]["lang"];
  start: ISODate;
  end: ISODate;
  adults: number;
  children: number[];
  origin: string;
  homeTz: string;
  homeCurrency: string;
  /** Currency of the visited country; empty when not known yet. */
  destCurrency: string;
  /** Total for all travellers, in homeCurrency. */
  budget: number | null;
  /** The traveller's wishes, kept verbatim; empty when not given. */
  intent: string;
  modes: Partial<Record<TravelMode, number>>;
}

/** Creates an empty trip with one day per date and the default rules of SPEC section 8. */
export async function createTrip(input: NewTrip, d: TravelDB = db) {
  if (input.end < input.start) throw new Error("endBeforeStart");
  const id = newId();
  const trip: Trip = {
    id,
    name: { text: input.name, lang: input.lang },
    start: input.start,
    end: input.end,
    travellers: { adults: input.adults, children: input.children },
    origin: { text: input.origin, lang: input.lang },
    homeTz: input.homeTz,
    homePlug: { types: [], voltage: 0 },
    homeCurrency: input.homeCurrency,
    ...(input.destCurrency ? { destCurrency: input.destCurrency } : {}),
    budget: input.budget,
    ...(input.intent.trim() ? { intent: { text: input.intent, lang: input.lang } } : {}),
    modes: input.modes,
    rules: { maxHeavy: 2, siesta: false, checkoutBy: "10:00", minMarginMin: null },
    regions: [],
    // Colours are set by the app, not chosen in the form (change request of 10 October 2026).
    theme: THEMES.neutral,
    v: 2,
  };
  const days = Object.fromEntries(dateRange(input.start, input.end).map((date) => [date, { date, slots: [] }]));
  await saveState({ trip, places: {}, bookings: [], days, sources: {}, checks: [], prep: [], log: [] }, d);
  await d.log.add({ id: newId(), tripId: id, at: new Date().toISOString(), who: actor, message: `Created trip “${input.name}”` });
  await wrote(id, d);
  await setActiveTripId(id, d);
  return id;
}

/**
 * Saves trip settings. New dates get empty days; dates removed from the trip must be empty,
 * otherwise the change is refused (nothing is deleted without the user moving it first).
 */
export async function updateTrip(trip: Trip, d: TravelDB = db) {
  if (trip.end < trip.start) throw new Error("endBeforeStart");
  await d.transaction("rw", [d.trips, d.days, d.log], async () => {
    const tripId = trip.id;
    const wanted = new Set(dateRange(trip.start, trip.end));
    const existing = await d.days.where({ tripId }).toArray();
    const dropped = existing.filter((x) => !wanted.has(x.date));
    if (dropped.some((x) => x.slots.length || x.note)) throw new Error("daysNotEmpty");
    for (const x of dropped) await d.days.delete([tripId, x.date]);
    const have = new Set(existing.map((x) => x.date));
    for (const date of wanted) if (!have.has(date)) await d.days.put({ tripId, date, slots: [] });
    await d.trips.put(trip);
    await logEntry(d, tripId, `Trip settings updated`);
  });
  await wrote(trip.id, d);
}

/** Deletes a trip on this phone; once synced, the deletion reaches the other members too. */
export async function deleteTrip(tripId: string, d: TravelDB = db) {
  await d.transaction("rw", [d.trips, d.settings, ...TRIP_TABLES(d)], async () => {
    for (const t of TRIP_TABLES(d)) await t.where({ tripId }).delete();
    await d.trips.delete(tripId);
    if ((await getActiveTripId(d)) === tripId) await d.settings.delete("activeTrip");
  });
  await wrote(tripId, d);
}

export const listTrips = async (d: TravelDB = db) => (await d.trips.toArray()).sort((a, b) => a.start.localeCompare(b.start));

/** Trip shown on this phone (a per-device choice, kept in IndexedDB). Falls back to the next trip. */
export async function getActiveTripId(d: TravelDB = db): Promise<string | undefined> {
  const v = (await d.settings.get("activeTrip"))?.value as string | undefined;
  if (v && (await d.trips.get(v))) return v;
  const trips = await listTrips(d);
  const today = new Date().toISOString().slice(0, 10);
  return (trips.find((t) => t.end >= today) ?? trips[trips.length - 1])?.id;
}
export const setActiveTripId = (id: string, d: TravelDB = db) => d.settings.put({ key: "activeTrip", value: id });

export async function savePlace(tripId: string, place: Place, d: TravelDB = db) {
  await d.transaction("rw", [d.places, d.log], async () => {
    const prev = await d.places.get(place.id);
    await d.places.put({ ...place, tripId });
    await logEntry(d, tripId, `${prev ? "Edited" : "Added"} place “${place.name.text}”`);
  });
  await wrote(tripId, d);
}

/** Refuses to delete a place still used by an activity or a booking. */
export async function deletePlace(tripId: string, placeId: string, d: TravelDB = db) {
  const s = await loadState(tripId, d);
  const used = !!s && (s.bookings.some((b) => b.placeId === placeId) || Object.values(s.days).some((x) => x.slots.some((y) => y.placeId === placeId)));
  if (used) throw new Error("placeInUse");
  const p = await d.places.get(placeId);
  await d.places.delete(placeId);
  if (p) await logEntry(d, tripId, `Deleted place “${p.name.text}”`);
  await wrote(tripId, d);
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

const TRIP_TABLES = (d: TravelDB) => [d.places, d.bookings, d.days, d.sources, d.checks, d.prep, d.log];

/** Replaces the whole local copy of a trip (used when merging server changes). */
export async function replaceTrip(tripId: string, s: TripState, d: TravelDB = db) {
  await d.transaction("rw", [d.trips, ...TRIP_TABLES(d)], async () => {
    for (const t of TRIP_TABLES(d)) await t.where({ tripId }).delete();
    await saveState(s, d);
  });
}

/** Removes a trip from this phone without stamping anything (used when it was deleted elsewhere). */
export async function removeTripLocal(tripId: string, d: TravelDB = db) {
  await d.transaction("rw", [d.trips, ...TRIP_TABLES(d)], async () => {
    for (const t of TRIP_TABLES(d)) await t.where({ tripId }).delete();
    await d.trips.delete(tripId);
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

async function logEntry(d: TravelDB, tripId: string, message: string) {
  await d.log.add({ id: newId(), tripId, at: new Date().toISOString(), who: actor, message });
}

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
  await wrote(tripId, d);
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
  await wrote(tripId, d);
}

export async function saveBooking(tripId: string, b: Booking, d: TravelDB = db) {
  await d.transaction("rw", [d.bookings, d.log], async () => {
    const prev = await d.bookings.get(b.id);
    await d.bookings.put({ ...b, tripId, order: prev?.order ?? (await d.bookings.where({ tripId }).count()) });
    const msg = !prev ? `Added booking “${b.title.text}”`
      : prev.status !== b.status ? `“${b.title.text}” status changed from ${prev.status} to ${b.status}`
      : `Booking “${b.title.text}” updated`;
    await logEntry(d, tripId, msg);
  });
  await wrote(tripId, d);
}

export async function toggleCheck(tripId: string, id: string, d: TravelDB = db) {
  await d.transaction("rw", [d.checks, d.log], async () => {
    const c = await d.checks.get(id);
    if (!c) return;
    await d.checks.put({ ...c, done: !c.done });
    await logEntry(d, tripId, `${c.done ? "Reopened" : "Completed"} task “${c.text.text}”`);
  });
  await wrote(tripId, d);
}

export async function addCheck(tripId: string, text: string, d: TravelDB = db) {
  const c: Check = { id: newId(), key: "", text: { text, lang: "en" }, done: false };
  await d.transaction("rw", [d.checks, d.log], async () => {
    await d.checks.put({ ...c, tripId, order: await d.checks.where({ tripId }).count() });
    await logEntry(d, tripId, `Added task “${text}”`);
  });
  await wrote(tripId, d);
}

