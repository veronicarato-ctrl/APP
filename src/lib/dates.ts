import type { HHMM, ISODate } from "../model/types";

// Dates are handled as calendar days at UTC noon, so no local timezone can shift them.
const atNoon = (iso: ISODate) => new Date(iso + "T12:00:00Z");

export const addDays = (iso: ISODate, k: number): ISODate => {
  const d = atNoon(iso);
  d.setUTCDate(d.getUTCDate() + k);
  return d.toISOString().slice(0, 10);
};

export const dateRange = (from: ISODate, to: ISODate): ISODate[] => {
  const out: ISODate[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) out.push(d);
  return out;
};

/** 0 = Sunday … 6 = Saturday, computed from the date, never stored. */
export const weekday = (iso: ISODate): number => atNoon(iso).getUTCDay();

export const formatDay = (iso: ISODate, locale: string, opts?: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat(locale, {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
    ...opts,
  }).format(atNoon(iso));

export const weekdayName = (day: number, locale: string, style: "short" | "long" = "long") =>
  // 2026-12-13 is a Sunday; offset from it to get any weekday name.
  new Intl.DateTimeFormat(locale, { weekday: style, timeZone: "UTC" }).format(atNoon(addDays("2026-12-13", day)));

export const toMinutes = (t: HHMM): number | null => {
  if (!t) return null;
  const [h, m] = t.split(":").map(Number);
  return h * 60 + (m || 0);
};

export const nightsBetween = (from: ISODate, to: ISODate) =>
  Math.round((atNoon(to).getTime() - atNoon(from).getTime()) / 86_400_000);
