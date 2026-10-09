import { useTranslation } from "react-i18next";
import { dayPath, transportEnds, tzChange } from "../engine/derive";
import { addDays } from "../lib/dates";
import { diffOnDate, fmtDiff, fmtUtc, tzOffsetMin, zonedInstant } from "../lib/time";
import type { ISODate, Place, Slot, TripState } from "../model/types";

const short = (p: Place) => p.name.text.split(",")[0];
const utcOn = (tz: string, date: ISODate) => fmtUtc(tzOffsetMin(tz, zonedInstant(date, "12:00", tz)));

/** Day header line, e.g. "UTC−3, −4 h vs Genebra" (both zones on a change day). */
export function DayZone({ s, date }: { s: TripState; date: ISODate }) {
  const { t } = useTranslation();
  const path = dayPath(s, date);
  const zones = [...new Set(path.map((p) => p.tz))];
  if (!zones.length) return null;
  return (
    <p className="text-[11.5px] text-soft tabular-nums">
      {zones.map((tz) => t("time.dayZone", { utc: utcOn(tz, date), diff: fmtDiff(diffOnDate(tz, s.trip.homeTz, date)), homeName: s.trip.origin.text })).join(" → ")}
    </p>
  );
}

/** Soft alert the day before (and on the day of) a time zone change. */
export function TzNotice({ s, date }: { s: TripState; date: ISODate }) {
  const { t } = useTranslation();
  const tomorrow = addDays(date, 1);
  const c = tzChange(s, tomorrow) ?? tzChange(s, date);
  if (!c) return null;
  const on = tzChange(s, tomorrow) ? tomorrow : date;
  const diff = tzOffsetMin(c.to.tz, zonedInstant(on, "12:00", c.to.tz)) - tzOffsetMin(c.from.tz, zonedInstant(on, "12:00", c.from.tz));
  const params = { from: short(c.from), to: short(c.to), fromUtc: utcOn(c.from.tz, on), toUtc: utcOn(c.to.tz, on), diff: fmtDiff(diff) };
  return (
    <p className="mx-4 mb-2 text-[12.5px] px-3 py-1.5 rounded-md" style={{ background: "var(--transport-bg)", color: "var(--transport-tx)", borderLeft: "3px solid var(--transport-dot)" }}>
      🕑 {t(on === date ? "time.tzToday" : "time.tzTomorrow", params)}
    </p>
  );
}

/** "Departure in Fortaleza time, arrival in Manaus time, −1 h" for a transport crossing zones. */
export function TransportZone({ s, date, slot }: { s: TripState; date: ISODate; slot: Slot }) {
  const { t } = useTranslation();
  if (slot.type !== "transport") return null;
  const { from, to } = transportEnds(s, date, slot);
  if (!from || !to || from.tz === to.tz) return null;
  const at = zonedInstant(date, "12:00", to.tz);
  return (
    <span className="block text-[12px] font-semibold" style={{ color: "var(--transport-tx)" }}>
      🕑 {t("time.transportTz", { from: short(from), to: short(to), diff: fmtDiff(tzOffsetMin(to.tz, at) - tzOffsetMin(from.tz, at)) })}
    </span>
  );
}
