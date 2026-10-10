// Single data model. Every screen is derived from a TripState; nothing is duplicated.
// Weekdays are never stored: they are computed from ISO dates.

export type ISODate = string; // YYYY-MM-DD
export type HHMM = string; // 24h local time of the place, "" when unknown
export type Lang = "en" | "fr" | "es" | "pt" | "zh";

/** Free text that keeps the language it was written in (imported data is never auto-translated). */
export interface Text {
  text: string;
  lang: Lang;
}

export type InfoNature = "verified" | "estimated" | "recommendation" | "proposed";
export type PriceNature = "confirmed" | "estimated" | "range";

export interface Price {
  amount?: number;
  max?: number; // upper bound when nature is "range"
  currency?: string;
  nature?: PriceNature;
  /** Price as written in the source when it cannot be structured without guessing. */
  note?: Text;
}

export interface Source {
  id: string;
  key: string; // short key used by the prototype (e.g. "gol")
  title: string;
  url: string;
  /** Year-month or full date of the last check, as stated by the source data. */
  checkedAt: string;
}

export interface Region {
  id: string;
  name: string;
  /** Region colour token name in Trip.theme.regions. */
  color: string;
}

export interface Place {
  id: string;
  key: string;
  name: Text;
  /** Coordinates are optional: a place can be added before its exact position is known. */
  lat?: number;
  lng?: number;
  tz: string; // IANA zone
  region: string; // Region.id
  approx: boolean;
  kind?: "lodging" | "station" | "airport" | "restaurant" | "activity" | "other";
  plug?: string[];
  voltage?: number;
  sources?: string[];
}

export type BookingStatus = "todo" | "urgent" | "confirmed";
export type BookingKind = "flight" | "lodging" | "transfer" | "contact" | "permit" | "fee" | "other";

export interface Link {
  label: string;
  url: string;
}

/** Ticket, QR code or photo attached to a booking. The bytes live in storage, a copy stays on the phone. */
export interface FileRef {
  id: string;
  name: string;
  type: string;
  size: number;
  path: string; // "<trip id>/<booking id>/<file id>-<name>"
  addedAt: string;
}

export interface Booking {
  id: string;
  key: string;
  kind: BookingKind;
  title: Text;
  status: BookingStatus;
  ref: string;
  tel: string;
  addr: string;
  /** Lodging only: check-in from / check-out by (local time). */
  checkIn: HHMM;
  checkOut: HHMM;
  /** Lodging only: first night and departure date. */
  from?: ISODate;
  to?: ISODate;
  /** Single-date bookings (flights, transfers, fees). */
  date?: ISODate;
  time?: HHMM;
  placeId?: string;
  note?: Text;
  links?: Link[];
  sources?: string[]; // Source.id
  /** Days of week the flight operates, 0 = Sunday. */
  opDays?: number[];
  noRoute?: boolean;
  warn?: Text;
  price?: Price;
  files?: FileRef[];
}

export type SlotType =
  | "transport"
  | "lodging"
  | "meal"
  | "culture"
  | "nature"
  | "show"
  | "rest"
  | "ritual";

export interface Slot {
  id: string;
  key: string;
  type: SlotType;
  title: Text;
  detail?: Text;
  start: HHMM;
  end: HHMM;
  placeId?: string;
  bookingId?: string;
  heavy: boolean;
  who: string;
  desc?: Text;
  tips?: Text[];
  price?: Price;
  sources?: string[];
  origin: "user" | "ai" | "import";
  info?: InfoNature;
}

export interface Day {
  date: ISODate;
  note?: Text;
  slots: Slot[];
}

export interface Check {
  id: string;
  key: string;
  text: Text;
  done: boolean;
}

export interface PrepItem {
  text: Text;
  sources: string[];
}

export interface PrepSection {
  id: string;
  title: Text;
  items: PrepItem[];
}

export interface LogEntry {
  id: string;
  at: string; // ISO timestamp
  who: string;
  message: string;
}

export interface TripRules {
  maxHeavy: number;
  siesta: boolean;
  checkoutBy: HHMM;
  /** Minimum margin between an arrival and the next activity, null = rule inactive. */
  minMarginMin: number | null;
}

export interface TripTheme {
  /** Identity colours, derived from the destination's flag (SPEC 10.3). */
  dark: string;
  darker: string;
  accent: string;
  accentOnLight: string;
  regions: Record<string, { onDark: string; onLight: string }>;
}

export interface Trip {
  id: string;
  name: Text;
  start: ISODate;
  end: ISODate;
  travellers: { adults: number; children: number[]; label?: Text };
  origin: Text;
  homeTz: string;
  homePlug: { types: string[]; voltage: number };
  homeCurrency: string;
  budget: number | null;
  rules: TripRules;
  regions: Region[];
  theme: TripTheme;
  /** Default zone for new places of this trip (IANA). */
  destTz?: string;
  prepNote?: Text;
  v: number;
}

export interface TripState {
  trip: Trip;
  places: Record<string, Place>;
  bookings: Booking[];
  days: Record<ISODate, Day>;
  sources: Record<string, Source>;
  checks: Check[];
  prep: PrepSection[];
  log: LogEntry[];
}
