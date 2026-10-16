// Exchange rates: European Central Bank reference rates served by Frankfurter (free, no key), or a rate
// typed by the travellers. A rate always carries its date and source; nothing is ever simulated.
import { db as defaultDb, type TravelDB } from "../db/db";

export interface Rate {
  base: string;
  quote: string;
  /** Units of quote for one unit of base. */
  rate: number;
  /** Date the rate applies to (ECB working day, or the day it was typed). */
  date: string;
  source: "ecb" | "manual";
  fetchedAt: string;
}

export const rateUrl = (base: string, quote: string) =>
  `https://api.frankfurter.dev/v1/latest?base=${encodeURIComponent(base)}&symbols=${encodeURIComponent(quote)}`;
export const RATE_SOURCE_URL = "https://frankfurter.dev";

/** Reads a Frankfurter answer; undefined when it does not hold a usable rate for that pair. */
export function parseRate(json: unknown, base: string, quote: string, now = new Date()): Rate | undefined {
  const j = json as { base?: string; date?: string; rates?: Record<string, unknown> } | null;
  const r = j?.rates?.[quote];
  if (!j || j.base !== base || typeof r !== "number" || !(r > 0) || typeof j.date !== "string") return undefined;
  return { base, quote, rate: r, date: j.date, source: "ecb", fetchedAt: now.toISOString() };
}

const key = (base: string, quote: string) => `rate:${base}:${quote}`;

export async function savedRate(base: string, quote: string, d: TravelDB = defaultDb): Promise<Rate | undefined> {
  return (await d.settings.get(key(base, quote)))?.value as Rate | undefined;
}

export const saveRate = (r: Rate, d: TravelDB = defaultDb) => d.settings.put({ key: key(r.base, r.quote), value: r });

/** Downloads today's reference rate and keeps it on the phone for offline use. Throws when unavailable. */
export async function refreshRate(base: string, quote: string, d: TravelDB = defaultDb, f: typeof fetch = fetch): Promise<Rate> {
  const res = await f(rateUrl(base, quote));
  if (!res.ok) throw new Error(`rate ${res.status}`);
  const r = parseRate(await res.json(), base, quote);
  if (!r) throw new Error("rateUnavailable");
  await saveRate(r, d);
  return r;
}
