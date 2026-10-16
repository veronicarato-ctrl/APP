// Applies the operations the travellers ticked, on a copy of the trip. Locked slots are refused here too,
// whatever the interface did, and every applied operation is described for the history.
import { bookingMap, isLocked, runRules, type Issue } from "../engine/rules";
import { newId } from "../lib/ids";
import { ZONES } from "../lib/zones";
import type { Booking, Lang, Place, Slot, Source, Text, Trip, TripState } from "../model/types";
import type { Op, PlaceCategory, Proposal, TripDraft, Verification } from "./protocol";

export type Refusal = "locked" | "notFound" | "outsideTrip" | "unknownPlace";
export interface Applied { state: TripState; log: string[]; refused: { index: number; reason: Refusal }[] }

const KIND: Record<PlaceCategory, Place["kind"]> = { hotel: "lodging", restaurant: "restaurant", museum: "activity", activity: "activity", transport: "station", other: "other" };
const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x));

/** Applies the chosen operations (by index in proposal.ops). Places and bookings are created first so references resolve. */
export function applyOps(s0: TripState, proposal: Proposal, chosen: number[], lang: Lang): Applied {
  const s = clone(s0);
  const log: string[] = [];
  const refused: Applied["refused"] = [];
  const txt = (text: string): Text => ({ text, lang });
  const refs: Record<string, string> = {};
  const bm = bookingMap(s0);
  const inTrip = (d: string) => d >= s.trip.start && d <= s.trip.end && !!s.days[d];
  const lastTz = () => Object.values(s.places).at(-1)?.tz ?? s.trip.destTz ?? s.trip.homeTz;
  const placeId = (ref?: string) => (ref ? refs[ref] ?? (s.places[ref] ? ref : undefined) : undefined);
  const order = [...chosen].sort((a, b) => rank(proposal.ops[a]) - rank(proposal.ops[b]) || a - b);

  for (const i of order) {
    const op = proposal.ops[i];
    if (!op) continue;
    switch (op.op) {
      case "addPlace": {
        const v: Verification | undefined = proposal.checks?.[op.place.ref];
        const id = newId();
        let sources: string[] | undefined;
        if (v?.status === "verified") {
          const src: Source = { id: newId(), key: "", title: v.source, url: v.url, checkedAt: v.checkedAt };
          s.sources[src.id] = src; sources = [src.id];
        }
        const located = v?.status === "verified" && typeof v.lat === "number" && typeof v.lng === "number";
        s.places[id] = {
          id, key: "", name: txt(op.place.name + (op.place.city && !op.place.name.includes(op.place.city) ? `, ${op.place.city}` : "")),
          tz: op.place.tz && ZONES.includes(op.place.tz) ? op.place.tz : lastTz(), region: "", approx: !located,
          kind: KIND[op.place.category], ...(located ? { lat: v.lat, lng: v.lng } : {}), ...(sources ? { sources } : {}),
        };
        refs[op.place.ref] = id;
        log.push(`Assistant: added place “${op.place.name}”${v?.status === "verified" ? "" : " (not verified)"}`);
        break;
      }
      case "addBooking": {
        const b = op.booking, id = newId();
        const pid = placeId(b.place);
        const v = b.place ? proposal.checks?.[b.place] : undefined;
        const booking: Booking = {
          id, key: "", kind: b.kind, title: txt(b.title), status: "todo", ref: "", tel: "", addr: v?.status === "verified" ? v.address ?? "" : "", checkIn: "", checkOut: "",
          ...(b.kind === "lodging" ? { from: b.from ?? s.trip.start, to: b.to ?? s.trip.end } : b.date ? { date: b.date } : {}),
          ...(pid ? { placeId: pid } : {}), ...(b.price ? { price: b.price } : {}),
          ...(v ? { links: [v.status === "verified" ? { label: "Book", url: v.url } : { label: "Search", url: v.searchUrl }] } : {}),
          note: txt("Proposed by the assistant."),
        };
        s.bookings.push(booking);
        refs[b.ref] = id;
        log.push(`Assistant: added booking to make “${b.title}”`);
        break;
      }
      case "add": {
        if (!inTrip(op.date)) { refused.push({ index: i, reason: "outsideTrip" }); break; }
        const pid = placeId(op.slot.place);
        if (op.slot.place && !pid) { refused.push({ index: i, reason: "unknownPlace" }); break; }
        const x: Slot = {
          id: newId(), key: "", type: op.slot.type, title: txt(op.slot.title), start: op.slot.start ?? "", end: op.slot.end ?? "",
          heavy: !!op.slot.heavy, who: "", origin: "ai", info: "proposed",
          ...(pid ? { placeId: pid } : {}), ...(op.slot.desc ? { desc: txt(op.slot.desc) } : {}), ...(op.slot.price ? { price: op.slot.price } : {}),
        };
        insertByTime(s.days[op.date].slots, x);
        log.push(`Assistant: added “${op.slot.title}” on ${op.date}`);
        break;
      }
      case "update":
      case "delete": {
        const found = findSlot(s, op.id);
        if (!found) { refused.push({ index: i, reason: "notFound" }); break; }
        if (isLocked(found.slot.bookingId, bm)) { refused.push({ index: i, reason: "locked" }); break; }
        const day = s.days[found.date];
        if (op.op === "delete") {
          day.slots = day.slots.filter((y) => y.id !== op.id);
          log.push(`Assistant: deleted “${found.slot.title.text}” from ${found.date}${op.reason ? ` (${op.reason})` : ""}`);
          break;
        }
        if (op.date && !inTrip(op.date)) { refused.push({ index: i, reason: "outsideTrip" }); break; }
        const pid = op.patch.place ? placeId(op.patch.place) : undefined;
        if (op.patch.place && !pid) { refused.push({ index: i, reason: "unknownPlace" }); break; }
        const x = found.slot;
        if (op.patch.type) x.type = op.patch.type;
        if (op.patch.title) x.title = txt(op.patch.title);
        if (op.patch.start !== undefined) x.start = op.patch.start;
        if (op.patch.end !== undefined) x.end = op.patch.end;
        if (op.patch.desc) x.desc = txt(op.patch.desc);
        if (op.patch.heavy !== undefined) x.heavy = op.patch.heavy;
        if (op.patch.price) x.price = op.patch.price;
        if (pid) x.placeId = pid;
        const to = op.date ?? found.date;
        if (to !== found.date || op.patch.start !== undefined) {
          day.slots = day.slots.filter((y) => y.id !== x.id);
          insertByTime(s.days[to].slots, x);
        }
        log.push(to !== found.date ? `Assistant: moved “${x.title.text}” from ${found.date} to ${to}` : `Assistant: changed “${x.title.text}” on ${found.date}`);
        break;
      }
      case "daySummary": {
        if (!inTrip(op.date)) { refused.push({ index: i, reason: "outsideTrip" }); break; }
        s.days[op.date].summary = txt(op.text);
        log.push(`Assistant: summary of ${op.date}`);
        break;
      }
    }
  }
  return { state: s, log, refused };
}

/** Problems the chosen operations would create, compared with the trip as it is. */
export function newIssues(before: TripState, after: TripState): Issue[] {
  const key = (x: Issue) => `${x.level}|${x.code}|${x.date ?? ""}|${x.slotId ?? ""}`;
  const had = new Set(runRules(before).map(key));
  return runRules(after).filter((x) => !had.has(key(x)));
}

/** Applies the deduced trip settings the travellers ticked. Dates are left to the trip settings, which keep days safe. */
export function applyDraft(trip: Trip, draft: TripDraft, fields: (keyof TripDraft)[]): Trip {
  const t = clone(trip);
  for (const f of fields) {
    if (f === "name" && draft.name) t.name = { ...t.name, text: draft.name };
    if (f === "adults" && draft.adults) t.travellers.adults = draft.adults;
    if (f === "children" && draft.children) t.travellers.children = draft.children;
    if (f === "budget" && draft.budget) t.budget = draft.budget;
    if (f === "homeCurrency" && draft.homeCurrency) t.homeCurrency = draft.homeCurrency;
    if (f === "destCurrency" && draft.destCurrency) t.destCurrency = draft.destCurrency;
    if (f === "modes" && draft.modes) t.modes = draft.modes;
  }
  return t;
}

const rank = (op?: Op) => (op?.op === "addPlace" ? 0 : op?.op === "addBooking" ? 1 : 2);

function findSlot(s: TripState, id: string) {
  for (const [date, day] of Object.entries(s.days)) {
    const slot = day.slots.find((x) => x.id === id);
    if (slot) return { date, slot };
  }
  return undefined;
}

/** Puts a slot before the first one that starts later; an untimed slot goes last. Other slots keep their order. */
function insertByTime(slots: Slot[], x: Slot) {
  const at = x.start ? slots.findIndex((y) => y.start && y.start > x.start) : -1;
  if (at < 0) slots.push(x); else slots.splice(at, 0, x);
}
