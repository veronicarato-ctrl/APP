// Time zones are always computed from IANA zones at the date concerned, never typed by hand,
// so European clock changes and any rule change in the destination are handled automatically.
import type { HHMM, ISODate } from "../model/types";

const partsIn = (tz: string, instant: Date) => {
  const p = new Intl.DateTimeFormat("en-US", {
    timeZone: tz, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  }).formatToParts(instant);
  const g = (t: string) => Number(p.find((x) => x.type === t)!.value);
  return { y: g("year"), mo: g("month"), d: g("day"), h: g("hour"), mi: g("minute"), s: g("second") };
};

/** UTC offset of a zone at an instant, in minutes (e.g. -180 for Fortaleza). */
export function tzOffsetMin(tz: string, instant: Date): number {
  const x = partsIn(tz, instant);
  const asUtc = Date.UTC(x.y, x.mo - 1, x.d, x.h, x.mi, x.s);
  return Math.round((asUtc - Math.floor(instant.getTime() / 1000) * 1000) / 60000);
}

/** Instant of a wall-clock time in a zone. */
export function zonedInstant(date: ISODate, time: HHMM, tz: string): Date {
  const [y, mo, d] = date.split("-").map(Number);
  const [h, mi] = (time || "12:00").split(":").map(Number);
  const guess = Date.UTC(y, mo - 1, d, h, mi);
  let t = guess - tzOffsetMin(tz, new Date(guess)) * 60000;
  t = guess - tzOffsetMin(tz, new Date(t)) * 60000;
  return new Date(t);
}

/** Difference place minus home, in minutes, at a given instant (negative: the place is behind). */
export const diffMin = (placeTz: string, homeTz: string, instant: Date) =>
  tzOffsetMin(placeTz, instant) - tzOffsetMin(homeTz, instant);

/** Difference on a given calendar day, evaluated at local noon of the place. */
export const diffOnDate = (placeTz: string, homeTz: string, date: ISODate) =>
  diffMin(placeTz, homeTz, zonedInstant(date, "12:00", placeTz));

/** "−5 h", "+1 h", "−3 h 30", "0 h". Uses a true minus sign. */
export function fmtDiff(min: number): string {
  if (min === 0) return "0 h";
  const sign = min < 0 ? "−" : "+";
  const a = Math.abs(min), h = Math.floor(a / 60), m = a % 60;
  return `${sign}${h} h${m ? " " + String(m).padStart(2, "0") : ""}`;
}

/** "UTC−3" style label. */
export function fmtUtc(min: number): string {
  if (min === 0) return "UTC";
  const a = Math.abs(min), h = Math.floor(a / 60), m = a % 60;
  return `UTC${min < 0 ? "−" : "+"}${h}${m ? ":" + String(m).padStart(2, "0") : ""}`;
}

/** Wall-clock time "HH:MM" and date of an instant in a zone. */
export function wallClock(tz: string, instant: Date): { date: ISODate; time: HHMM } {
  const x = partsIn(tz, instant);
  const pad = (n: number) => String(n).padStart(2, "0");
  return { date: `${x.y}-${pad(x.mo)}-${pad(x.d)}`, time: `${pad(x.h)}:${pad(x.mi)}` };
}

/** Last segment of an IANA zone as a readable city ("America/Sao_Paulo" -> "Sao Paulo"). */
export const tzCity = (tz: string) => tz.split("/").pop()!.replace(/_/g, " ");

export type CallVerdict = "good" | "borderline" | "late";
/** Whether it is a reasonable hour to phone someone at home. Thresholds are a convenience, not a rule. */
export function callHomeVerdict(homeTime: HHMM): CallVerdict {
  const [h, m] = homeTime.split(":").map(Number);
  const t = h * 60 + m;
  if (t >= 8 * 60 && t <= 21 * 60 + 30) return "good";
  if ((t >= 7 * 60 && t < 8 * 60) || (t > 21 * 60 + 30 && t <= 22 * 60 + 30)) return "borderline";
  return "late";
}
