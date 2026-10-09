// The trip is synchronised as small independent records (one slot, one booking, one day note…),
// so two people editing different things never overwrite each other. Conflicts are resolved per field.
import type { TripState } from "../model/types";

export type Kind = "trip" | "place" | "booking" | "day" | "slot" | "source" | "check" | "prep" | "log";
export type Data = Record<string, unknown>;
export interface Rec { kind: Kind; id: string; data: Data }

export const DELETED = "_deleted";
export const recKey = (kind: Kind, id: string) => `${kind}:${id}`;

/** JSON-clean copy: undefined fields are dropped so they compare equal to absent ones. */
const clean = (o: object): Data => JSON.parse(JSON.stringify(o));

export function explode(s: TripState): Rec[] {
  const out: Rec[] = [{ kind: "trip", id: s.trip.id, data: clean(s.trip) }];
  for (const p of Object.values(s.places)) out.push({ kind: "place", id: p.id, data: clean(p) });
  s.bookings.forEach((b, pos) => out.push({ kind: "booking", id: b.id, data: clean({ ...b, pos }) }));
  for (const d of Object.values(s.days)) {
    out.push({ kind: "day", id: d.date, data: clean({ date: d.date, note: d.note }) });
    d.slots.forEach((x, pos) => out.push({ kind: "slot", id: x.id, data: clean({ ...x, date: d.date, pos }) }));
  }
  for (const x of Object.values(s.sources)) out.push({ kind: "source", id: x.id, data: clean(x) });
  s.checks.forEach((c, pos) => out.push({ kind: "check", id: c.id, data: clean({ ...c, pos }) }));
  s.prep.forEach((p, pos) => out.push({ kind: "prep", id: p.id, data: clean({ ...p, pos }) }));
  for (const l of s.log) out.push({ kind: "log", id: l.id, data: clean(l) });
  return out;
}

const withoutFlag = (d: Data): Data => Object.fromEntries(Object.entries(d).filter(([k]) => k !== DELETED));
const byPos = (a: Data, b: Data) => (a.pos as number) - (b.pos as number) || String(a.id).localeCompare(String(b.id));
const noPos = ({ pos: _p, ...rest }: Data) => rest;

/** Rebuilds a trip from records. Deleted records are skipped. Throws if the trip record is missing. */
export function implode(recs: Rec[]): TripState {
  const live = recs.filter((r) => !r.data[DELETED]).map((r) => ({ ...r, data: withoutFlag(r.data) }));
  const of = (k: Kind) => live.filter((r) => r.kind === k).map((r) => r.data);
  const trip = of("trip")[0];
  if (!trip) throw new Error("Trip record missing");
  const days: TripState["days"] = {};
  for (const d of of("day")) days[d.date as string] = { date: d.date as string, ...(d.note ? { note: d.note } : {}), slots: [] } as TripState["days"][string];
  for (const x of of("slot").sort(byPos)) {
    const { date, ...slot } = noPos(x);
    (days[date as string] ??= { date: date as string, slots: [] }).slots.push(slot as never);
  }
  return {
    trip: trip as never,
    places: Object.fromEntries(of("place").map((p) => [p.id, p])) as never,
    bookings: of("booking").sort(byPos).map(noPos) as never,
    days,
    sources: Object.fromEntries(of("source").map((x) => [x.id, x])) as never,
    checks: of("check").sort(byPos).map(noPos) as never,
    prep: of("prep").sort(byPos).map(noPos) as never,
    log: (of("log") as { at: string }[]).sort((a, b) => b.at.localeCompare(a.at)) as never,
  };
}
