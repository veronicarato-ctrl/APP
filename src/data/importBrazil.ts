// Maps the Brazil 2026 prototype seed (extracted verbatim from guiao-viagem-brasil.jsx)
// onto the app data model. No value is added, completed or translated: every Portuguese
// text keeps lang "pt", and fields the prototype does not have stay empty.
import raw from "./brazil-2026.prototype.json";
import { importId } from "../lib/ids";
import type {
  Booking,
  BookingKind,
  Check,
  Day,
  Place,
  PrepSection,
  Slot,
  SlotType,
  Source,
  Text,
  TripState,
} from "../model/types";

export const BRAZIL_TRIP_KEY = "brasil-2026";

// --- Raw prototype shapes ---------------------------------------------------
export interface RawPlace { n: string; lat: number; lng: number; r: string; ap?: number }
export interface RawBooking {
  id: string; k: string; t: string; status: string; ref: string; tel: string; addr: string;
  ci: string; co: string; note: string; from?: string; to?: string; date?: string; p?: string;
  links?: [string, string][]; src?: string[]; days?: number[]; noRoute?: number; warn?: string;
}
export interface RawSlot {
  id: string; ty: string; t: string; d: string; st: string; en: string; p: string; b: string;
  h: number; who: string; desc?: string; tips?: string[]; price?: string; src?: string[];
}
export interface RawSeed {
  v: number;
  trip: { name: string; start: string; end: string; party: string; origin: string;
    rules: { maxHeavy: number; siesta: boolean; checkoutBy: string } };
  places: Record<string, RawPlace>;
  bookings: RawBooking[];
  days: Record<string, { note: string; slots: RawSlot[] }>;
  checks: { id: string; t: string; done: boolean }[];
  log: unknown[];
}
export interface RawPrototype {
  seed: RawSeed;
  sources: Record<string, [string, string]>;
  prep: [string, [string, string[]][]][];
  prepNote: string;
}

export const PROTOTYPE = raw as unknown as RawPrototype;

// --- Code tables --------------------------------------------------------------
export const KIND_MAP: Record<string, BookingKind> = {
  voo: "flight", hotel: "lodging", transfer: "transfer", contacto: "contact",
  "autorização": "permit", taxa: "fee",
};
export const TYPE_MAP: Record<string, SlotType> = {
  x: "transport", l: "lodging", f: "meal", c: "culture", n: "nature", s: "show", w: "rest", r: "ritual",
};
/** IANA zones per region, as named in SPEC section 3.8. */
const REGION_TZ: Record<string, string> = { ce: "America/Fortaleza", am: "America/Manaus" };

// Sources header in the prototype: "FONTES (consultadas em Out 2026)".
const SOURCES_CHECKED_AT = "2026-10";

const pt = (text: string): Text => ({ text, lang: "pt" });
const ptOpt = (text: string | undefined): Text | undefined => (text ? pt(text) : undefined);

/**
 * `scope` salts the generated UUIDs. The default keeps the historical ids; loading the example
 * as a new trip passes a fresh scope so every copy is an independent trip.
 */
export function importBrazil(data: RawPrototype = PROTOTYPE, scope: string = BRAZIL_TRIP_KEY): TripState {
  const { seed } = data;
  const tripId = importId(scope, "trip", BRAZIL_TRIP_KEY);
  const id = (kind: string, key: string) => importId(scope, kind, key);
  const placeId = (k: string) => (k ? id("place", k) : undefined);
  const bookingId = (k: string) => (k ? id("booking", k) : undefined);
  const sourceIds = (keys?: string[]) => (keys ? keys.map((k) => id("source", k)) : undefined);

  const sources: Record<string, Source> = {};
  for (const [key, [title, url]] of Object.entries(data.sources)) {
    const sid = id("source", key);
    sources[sid] = { id: sid, key, title, url, checkedAt: SOURCES_CHECKED_AT };
  }

  const places: Record<string, Place> = {};
  for (const [key, p] of Object.entries(seed.places)) {
    const pid = id("place", key);
    places[pid] = {
      id: pid, key, name: pt(p.n), lat: p.lat, lng: p.lng, region: p.r,
      tz: REGION_TZ[p.r], approx: !!p.ap,
    };
  }

  const bookings: Booking[] = seed.bookings.map((b) => ({
    id: id("booking", b.id),
    key: b.id,
    kind: KIND_MAP[b.k] ?? "other",
    title: pt(b.t),
    status: b.status as Booking["status"],
    ref: b.ref,
    tel: b.tel,
    addr: b.addr,
    checkIn: b.ci,
    checkOut: b.co,
    from: b.from,
    to: b.to,
    date: b.date,
    placeId: b.p ? placeId(b.p) : undefined,
    note: ptOpt(b.note),
    links: b.links?.map(([label, url]) => ({ label, url })),
    sources: sourceIds(b.src),
    opDays: b.days,
    noRoute: b.noRoute ? true : undefined,
    warn: ptOpt(b.warn),
  }));

  const toSlot = (s: RawSlot): Slot => ({
    id: id("slot", s.id),
    key: s.id,
    type: TYPE_MAP[s.ty],
    title: pt(s.t),
    detail: ptOpt(s.d),
    start: s.st,
    end: s.en,
    placeId: placeId(s.p),
    bookingId: bookingId(s.b),
    heavy: !!s.h,
    who: s.who,
    desc: ptOpt(s.desc),
    tips: s.tips?.map(pt),
    price: s.price ? { note: pt(s.price) } : undefined,
    sources: sourceIds(s.src),
    origin: "import",
  });

  const days: Record<string, Day> = {};
  for (const [date, d] of Object.entries(seed.days)) {
    days[date] = { date, note: ptOpt(d.note), slots: d.slots.map(toSlot) };
  }

  const checks: Check[] = seed.checks.map((c) => ({ id: id("check", c.id), key: c.id, text: pt(c.t), done: c.done }));

  const prep: PrepSection[] = data.prep.map(([title, items], i) => ({
    id: id("prep", String(i)),
    title: pt(title),
    items: items.map(([text, src]) => ({ text: pt(text), sources: sourceIds(src) ?? [] })),
  }));

  return {
    trip: {
      id: tripId,
      name: pt(seed.trip.name),
      start: seed.trip.start,
      end: seed.trip.end,
      travellers: { adults: 2, children: [], label: pt(seed.trip.party) },
      origin: pt(seed.trip.origin),
      // Home settings stated in SPEC section 4.1.
      homeTz: "Europe/Zurich",
      homePlug: { types: ["C", "J"], voltage: 230 },
      homeCurrency: "CHF",
      budget: null,
      rules: { ...seed.trip.rules, minMarginMin: null },
      regions: [
        { id: "ce", name: "Ceará", color: "ce" },
        { id: "am", name: "Amazónia", color: "am" },
      ],
      // Brazil identity colours, SPEC section 10.3.
      theme: {
        dark: "#114027",
        darker: "#0d3d24",
        accent: "#e0a815",
        accentOnLight: "#a8780a",
        regions: {
          ce: { onDark: "#e0a815", onLight: "#a8780a" },
          am: { onDark: "#2a7d4f", onLight: "#2a7d4f" },
        },
      },
      prepNote: pt(data.prepNote),
      destTz: "America/Fortaleza",
      v: seed.v,
    },
    places,
    bookings,
    days,
    sources,
    checks,
    prep,
    log: [],
  };
}
