import { describe, expect, it } from "vitest";
import { importBrazil, KIND_MAP, PROTOTYPE, TYPE_MAP, type RawSeed } from "./importBrazil";
import { formatDay, weekday } from "../lib/dates";
import type { TripState } from "../model/types";

const invert = (m: Record<string, string>) => Object.fromEntries(Object.entries(m).map(([k, v]) => [v, k]));

/** Rebuilds the prototype seed from the app model, to prove the import is lossless. */
function toPrototype(s: TripState): Omit<RawSeed, "trip" | "v" | "log"> {
  const kind = invert(KIND_MAP), type = invert(TYPE_MAP);
  const placeKey = (id?: string) => (id ? s.places[id].key : "");
  const bookingKey = (id?: string) => (id ? s.bookings.find((b) => b.id === id)!.key : "");
  const srcKeys = (ids?: string[]) => ids?.map((i) => s.sources[i].key);
  const strip = <T extends object>(o: T) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as T;
  return {
    places: Object.fromEntries(Object.values(s.places).map((p) => [p.key, strip({ n: p.name.text, lat: p.lat, lng: p.lng, r: p.region, ap: p.approx ? 1 : undefined })])),
    bookings: s.bookings.map((b) => strip({
      id: b.key, k: kind[b.kind], t: b.title.text, status: b.status, ref: b.ref, tel: b.tel, addr: b.addr,
      ci: b.checkIn, co: b.checkOut, note: b.note?.text ?? "", from: b.from, to: b.to, date: b.date,
      p: b.placeId ? placeKey(b.placeId) : undefined, links: b.links?.map((l) => [l.label, l.url] as [string, string]),
      src: srcKeys(b.sources), days: b.opDays, noRoute: b.noRoute ? 1 : undefined, warn: b.warn?.text,
    })),
    days: Object.fromEntries(Object.values(s.days).map((d) => [d.date, {
      note: d.note?.text ?? "",
      slots: d.slots.map((x) => strip({
        id: x.key, ty: type[x.type], t: x.title.text, d: x.detail?.text ?? "", st: x.start, en: x.end,
        p: placeKey(x.placeId), b: bookingKey(x.bookingId), h: x.heavy ? 1 : 0, who: x.who,
        desc: x.desc?.text, tips: x.tips?.map((t) => t.text), price: x.price?.note?.text, src: srcKeys(x.sources),
      })),
    }])),
    checks: s.checks.map((c) => ({ id: c.key, t: c.text.text, done: c.done })),
  };
}

// Key order is irrelevant for equality of the data, so compare canonical JSON.
const canon = (v: unknown): unknown =>
  Array.isArray(v) ? v.map(canon) : v && typeof v === "object"
    ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, canon((v as Record<string, unknown>)[k])])) : v;

describe("Brazil import", () => {
  const s = importBrazil();
  const raw = PROTOTYPE.seed;

  it("is lossless for places, bookings, days, slots and checks", () => {
    const { places, bookings, days, checks } = raw;
    expect(canon(toPrototype(s))).toEqual(canon({ places, bookings, days, checks }));
  });

  it("keeps sources and preparation verbatim", () => {
    expect(Object.values(s.sources).map((x) => [x.key, x.title, x.url])).toEqual(Object.entries(PROTOTYPE.sources).map(([k, [t, u]]) => [k, t, u]));
    expect(s.prep.map((p) => [p.title.text, p.items.map((i) => [i.text.text, i.sources.map((id) => s.sources[id].key)])])).toEqual(PROTOTYPE.prep);
  });

  it("keeps trip settings and marks all imported text as Portuguese", () => {
    expect(s.trip.rules).toEqual({ ...raw.trip.rules, minMarginMin: null });
    expect([s.trip.name.text, s.trip.start, s.trip.end, s.trip.origin.text]).toEqual([raw.trip.name, raw.trip.start, raw.trip.end, raw.trip.origin]);
    const texts = [s.trip.name, ...s.bookings.map((b) => b.title), ...Object.values(s.days).flatMap((d) => d.slots.map((x) => x.title))];
    expect(texts.every((t) => t.lang === "pt")).toBe(true);
  });

  it("uses unique UUIDs", () => {
    const ids = [...Object.keys(s.places), ...s.bookings.map((b) => b.id), ...Object.values(s.days).flatMap((d) => d.slots.map((x) => x.id))];
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.every((i) => /^[0-9a-f-]{36}$/.test(i))).toBe(true);
  });

  it("computes weekdays from dates (14 Dec 2026 is a Monday, 20 Dec a Sunday)", () => {
    expect(weekday("2026-12-14")).toBe(1);
    expect(weekday("2026-12-20")).toBe(0);
    expect(formatDay("2026-12-20", "en-GB")).toBe("Sun 20 Dec");
  });
});
