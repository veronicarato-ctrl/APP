// Assistant protocol (SPEC section 9), shared by the phone and the server function.
// The AI receives a compact copy of the trip and answers with proposed operations only; it never writes
// to the trip. Every answer is checked here before the travellers see it, and applied only once they tick it.
import { bookingMap, isLocked } from "../engine/rules";
import type { BookingKind, ISODate, Price, SlotType, TravelMode, TripState } from "../model/types";

export type Mode = "propose" | "mood" | "ask";
export type ProviderName = "anthropic" | "openai" | "mistral";
export const PROVIDERS: ProviderName[] = ["anthropic", "openai", "mistral"];

/** What a proposed place is, so the right booking site can be offered. */
export type PlaceCategory = "hotel" | "restaurant" | "museum" | "activity" | "transport" | "other";

export interface ProposedPlace {
  ref: string; // temporary id used by the other operations of the same answer
  name: string;
  city: string;
  country: string;
  category: PlaceCategory;
  tz?: string;
  lat?: number;
  lng?: number;
}

export interface ProposedSlot {
  type: SlotType;
  title: string;
  start?: string;
  end?: string;
  place?: string; // ref of a proposed place, or id of an existing place
  desc?: string;
  heavy?: boolean;
  price?: Price;
}

export type Op =
  | { op: "addPlace"; place: ProposedPlace }
  | { op: "add"; date: ISODate; slot: ProposedSlot; why?: string }
  | { op: "update"; id: string; date?: ISODate; patch: Partial<ProposedSlot>; why?: string }
  | { op: "delete"; id: string; reason: string }
  | { op: "addBooking"; booking: { ref: string; kind: BookingKind; title: string; place?: string; from?: ISODate; to?: ISODate; date?: ISODate; price?: Price } }
  | { op: "daySummary"; date: ISODate; text: string };

/** Trip settings the assistant deduced from the travellers' words, each shown as deduced. */
export interface TripDraft {
  name?: string; start?: ISODate; end?: ISODate; adults?: number; children?: number[];
  budget?: number; homeCurrency?: string; destCurrency?: string; modes?: Partial<Record<TravelMode, number>>;
}

/** Where a proposed place can be checked and booked. Search links are never presented as the place's own page. */
export type Verification =
  | { status: "verified"; url: string; source: string; checkedAt: string; address?: string; lat?: number; lng?: number }
  | { status: "unverified"; searchUrl: string };

export interface Proposal {
  summary: string;
  ops: Op[];
  questions: string[];
  trip?: TripDraft;
  /** Filled by the server: verification of each proposed place, by ref. */
  checks?: Record<string, Verification>;
  /** Filled by the server. */
  meta?: { provider: ProviderName; model: string; ms: number; inputTokens: number; outputTokens: number };
}

export interface AssistantRequest {
  mode: Mode;
  text: string;
  date?: ISODate;
  state: CompactState;
  provider?: ProviderName;
}

/** Compact copy of the trip sent to the AI: enough to plan, nothing it does not need. */
export interface CompactState {
  trip: {
    name: string; lang: string; start: ISODate; end: ISODate; adults: number; children: number[]; origin: string;
    homeTz: string; homeCurrency: string; destCurrency?: string; budget: number | null; intent?: string;
    modes?: Partial<Record<TravelMode, number>>; rules: TripState["trip"]["rules"];
  };
  places: { id: string; name: string; tz: string; kind?: string }[];
  bookings: { id: string; kind: BookingKind; title: string; status: string; locked: boolean; from?: string; to?: string; date?: string; place?: string }[];
  days: { date: ISODate; summary?: string; slots: { id: string; type: SlotType; title: string; start: string; end: string; place?: string; locked: boolean; done?: boolean; heavy: boolean }[] }[];
}

export function compactState(s: TripState): CompactState {
  const bm = bookingMap(s);
  const tr = s.trip;
  return {
    trip: {
      name: tr.name.text, lang: tr.name.lang, start: tr.start, end: tr.end, adults: tr.travellers.adults, children: tr.travellers.children,
      origin: tr.origin.text, homeTz: tr.homeTz, homeCurrency: tr.homeCurrency, destCurrency: tr.destCurrency, budget: tr.budget,
      intent: tr.intent?.text, modes: tr.modes, rules: tr.rules,
    },
    places: Object.values(s.places).map((p) => ({ id: p.id, name: p.name.text, tz: p.tz, kind: p.kind })),
    bookings: s.bookings.map((b) => ({ id: b.id, kind: b.kind, title: b.title.text, status: b.status, locked: b.status === "confirmed", from: b.from, to: b.to, date: b.date, place: b.placeId })),
    days: Object.values(s.days).sort((a, b) => a.date.localeCompare(b.date)).map((d) => ({
      date: d.date, summary: d.summary?.text,
      slots: d.slots.map((x) => ({ id: x.id, type: x.type, title: x.title.text, start: x.start, end: x.end, place: x.placeId, locked: isLocked(x.bookingId, bm), done: x.done, heavy: x.heavy })),
    })),
  };
}

const MODE_TASK: Record<Mode, string> = {
  propose: `Build a complete trip from the travellers' own words (trip.intent), their themes (trip.modes, 0 = not for us, 5 = essential) and their budget.
Answer with: the trip settings you deduced in "trip" (only what the words or the state really say, never a guess), the places, the bookings to make (status is always "to book"), one activity list per day, a one-sentence summary per day, and a "summary" that tells the trip as a short story and says what is estimated and what is not included.
If dates, travellers or budget are missing, ask in "questions" (three at most) and still propose what you can.`,
  mood: `The travellers tell you how they feel today and what they want. Change only the day given in "date" (or the next hours), never another day, and keep every locked activity exactly as it is.`,
  ask: `Answer the travellers' request about this trip with proposed operations. Change only what the request needs.`,
};

/** System prompt: the principles of SPEC section 2, the priority order and the answer format. */
export function systemPrompt(mode: Mode): string {
  return `You help two travellers prepare and live their trip. You propose; they decide, operation by operation.

Principles, never broken:
1. Safety first, then legal obligations, confirmed bookings, must-dos, budget, preferences, pace, geographic coherence, optimisation. Follow this order when they conflict.
2. A slot or booking marked "locked": true is a confirmed booking. Never update, move or delete it.
3. Never invent a fact. Flight times, opening hours, prices, addresses, entry rules, health data and transport frequencies you do not know stay empty or become a question. A price you give is an estimate with "nature": "estimated" (or "range" with "max"), a currency, and "per": "person" or "group".
4. Only propose places that really exist and are well known, named exactly as they are known locally, with their city and country. They will be checked against a directory before the travellers see them; anything not found is shown as unverified.
5. Respect the budget (trip.budget, in trip.homeCurrency, for all travellers). If the wishes cannot fit, say so in "summary" with the gap, and propose what to give up.
6. Respect every refusal in the travellers' words (for example "no pasta, no pizza"): no proposal may contradict it.
7. Keep the pace in trip.rules (at most maxHeavy heavy activities a day, siesta if set).
8. Write in the language of trip.lang.

Task: ${MODE_TASK[mode]}

Answer with one JSON object and nothing else:
{"summary": string, "questions": string[], "trip"?: {"name"?, "start"?, "end"?, "adults"?, "children"?, "budget"?, "homeCurrency"?, "destCurrency"?, "modes"?},
 "ops": [
  {"op":"addPlace","place":{"ref":"p1","name":string,"city":string,"country":string,"category":"hotel"|"restaurant"|"museum"|"activity"|"transport"|"other","tz"?:IANA zone}},
  {"op":"addBooking","booking":{"ref":"b1","kind":"lodging"|"flight"|"transfer"|"fee"|"permit"|"other","title":string,"place"?:ref or id,"from"?:date,"to"?:date,"date"?:date,"price"?:price}},
  {"op":"add","date":"YYYY-MM-DD","slot":{"type":"transport"|"lodging"|"meal"|"culture"|"nature"|"show"|"rest"|"ritual","title":string,"start"?:"HH:MM","end"?:"HH:MM","place"?:ref or id,"desc"?:string,"heavy"?:boolean,"price"?:price},"why"?:string},
  {"op":"update","id":slot id,"date"?:new date,"patch":{...slot fields},"why"?:string},
  {"op":"delete","id":slot id,"reason":string},
  {"op":"daySummary","date":"YYYY-MM-DD","text":string}
 ]}
price = {"amount":number,"max"?:number,"currency":"EUR","per":"person"|"group","nature":"estimated"|"range"}`;
}

export function userMessage(req: AssistantRequest): string {
  return JSON.stringify({ request: req.text, date: req.date, state: req.state });
}

// ---- Checking the answer ----

const SLOT_TYPES: SlotType[] = ["transport", "lodging", "meal", "culture", "nature", "show", "rest", "ritual"];
const KINDS: BookingKind[] = ["lodging", "flight", "transfer", "contact", "permit", "fee", "other"];
const CATS: PlaceCategory[] = ["hotel", "restaurant", "museum", "activity", "transport", "other"];
const isDate = (v: unknown): v is string => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v);
const isTime = (v: unknown): v is string => typeof v === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(v);
const str = (v: unknown, max = 400) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : undefined);
const obj = (v: unknown): Record<string, unknown> | undefined => (v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : undefined);

function price(v: unknown): Price | undefined {
  const p = obj(v);
  if (!p || typeof p.amount !== "number" || !(p.amount >= 0) || !str(p.currency, 3)) return undefined;
  const max = typeof p.max === "number" && p.max > p.amount ? p.max : undefined;
  return { amount: p.amount, ...(max ? { max } : {}), currency: String(p.currency).toUpperCase(), per: p.per === "person" ? "person" : "group", nature: max ? "range" : "estimated" };
}

function slot(v: unknown, partial: boolean): ProposedSlot | Partial<ProposedSlot> | undefined {
  const x = obj(v);
  if (!x) return undefined;
  const out: Partial<ProposedSlot> = {};
  if (x.type !== undefined) { if (!SLOT_TYPES.includes(x.type as SlotType)) return undefined; out.type = x.type as SlotType; }
  if (x.title !== undefined) { const t = str(x.title, 120); if (!t) return undefined; out.title = t; }
  if (isTime(x.start)) out.start = x.start;
  if (isTime(x.end)) out.end = x.end;
  if (str(x.place, 80)) out.place = str(x.place, 80);
  if (str(x.desc, 600)) out.desc = str(x.desc, 600);
  if (typeof x.heavy === "boolean") out.heavy = x.heavy;
  const p = price(x.price); if (p) out.price = p;
  if (!partial && (!out.type || !out.title)) return undefined;
  return out;
}

/** Turns the model's text into a checked proposal. Unusable operations are dropped and counted. */
export function parseProposal(text: string): { proposal?: Proposal; dropped: number; error?: "notJson" } {
  const a = text.indexOf("{"), b = text.lastIndexOf("}");
  let raw: Record<string, unknown> | undefined;
  try { raw = a >= 0 && b > a ? obj(JSON.parse(text.slice(a, b + 1))) : undefined; } catch { raw = undefined; }
  if (!raw) return { dropped: 0, error: "notJson" };
  const ops: Op[] = [];
  let dropped = 0;
  for (const v of Array.isArray(raw.ops) ? raw.ops : []) {
    const o = obj(v);
    const op = parseOp(o);
    if (op) ops.push(op); else dropped++;
  }
  const t = obj(raw.trip);
  const trip: TripDraft | undefined = t ? {
    ...(str(t.name, 80) ? { name: str(t.name, 80) } : {}),
    ...(isDate(t.start) ? { start: t.start } : {}), ...(isDate(t.end) ? { end: t.end } : {}),
    ...(Number.isInteger(t.adults) && (t.adults as number) > 0 ? { adults: t.adults as number } : {}),
    ...(Array.isArray(t.children) ? { children: t.children.filter((x) => Number.isInteger(x) && x >= 0) as number[] } : {}),
    ...(typeof t.budget === "number" && t.budget > 0 ? { budget: t.budget } : {}),
    ...(str(t.homeCurrency, 3) ? { homeCurrency: String(t.homeCurrency).toUpperCase() } : {}),
    ...(str(t.destCurrency, 3) ? { destCurrency: String(t.destCurrency).toUpperCase() } : {}),
    ...(obj(t.modes) ? { modes: Object.fromEntries(Object.entries(obj(t.modes)!).filter(([, n]) => Number.isInteger(n) && (n as number) >= 0 && (n as number) <= 5)) } : {}),
  } : undefined;
  return {
    proposal: {
      summary: str(raw.summary, 3000) ?? "",
      questions: (Array.isArray(raw.questions) ? raw.questions : []).map((q) => str(q, 300)).filter(Boolean).slice(0, 3) as string[],
      ops,
      ...(trip && Object.keys(trip).length ? { trip } : {}),
    },
    dropped,
  };
}

function parseOp(o?: Record<string, unknown>): Op | undefined {
  if (!o) return undefined;
  switch (o.op) {
    case "addPlace": {
      const p = obj(o.place);
      const ref = str(p?.ref, 40), name = str(p?.name, 120), city = str(p?.city, 80), country = str(p?.country, 80);
      if (!p || !ref || !name || !city || !country) return undefined;
      return { op: "addPlace", place: { ref, name, city, country, category: CATS.includes(p.category as PlaceCategory) ? (p.category as PlaceCategory) : "other", ...(str(p.tz, 60) ? { tz: str(p.tz, 60) } : {}) } };
    }
    case "add": {
      const s = slot(o.slot, false) as ProposedSlot | undefined;
      return isDate(o.date) && s ? { op: "add", date: o.date, slot: s, ...(str(o.why, 300) ? { why: str(o.why, 300) } : {}) } : undefined;
    }
    case "update": {
      const id = str(o.id, 80), patch = slot(o.patch, true);
      if (!id || !patch || (!Object.keys(patch).length && !isDate(o.date))) return undefined;
      return { op: "update", id, patch, ...(isDate(o.date) ? { date: o.date } : {}), ...(str(o.why, 300) ? { why: str(o.why, 300) } : {}) };
    }
    case "delete": {
      const id = str(o.id, 80);
      return id ? { op: "delete", id, reason: str(o.reason, 300) ?? "" } : undefined;
    }
    case "addBooking": {
      const b = obj(o.booking);
      const ref = str(b?.ref, 40), title = str(b?.title, 120);
      if (!b || !ref || !title || !KINDS.includes(b.kind as BookingKind)) return undefined;
      return { op: "addBooking", booking: { ref, kind: b.kind as BookingKind, title, ...(str(b.place, 80) ? { place: str(b.place, 80) } : {}),
        ...(isDate(b.from) ? { from: b.from } : {}), ...(isDate(b.to) ? { to: b.to } : {}), ...(isDate(b.date) ? { date: b.date } : {}), ...(price(b.price) ? { price: price(b.price) } : {}) } };
    }
    case "daySummary": {
      const text = str(o.text, 300);
      return isDate(o.date) && text ? { op: "daySummary", date: o.date, text } : undefined;
    }
    default:
      return undefined;
  }
}

// ---- Links ----

/** Search link for a place that could not be verified; labelled "Search", never "Book". */
export function searchUrl(p: Pick<ProposedPlace, "name" | "city" | "country" | "category">): string {
  const q = encodeURIComponent(`${p.name}, ${p.city}, ${p.country}`);
  return p.category === "hotel" ? `https://www.booking.com/searchresults.html?ss=${q}` : `https://www.google.com/maps/search/?api=1&query=${q}`;
}
