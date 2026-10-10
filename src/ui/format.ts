import { useTranslation } from "react-i18next";
import type { Issue } from "../engine/rules";
import { formatDay, weekdayName } from "../lib/dates";
import { LOCALE } from "../i18n";
import type { ISODate, TripState } from "../model/types";
import { tzCity } from "../lib/time";

/** Name used for "home" in time comparisons: the departure city, else the home time zone city. */
export const homeName = (s: TripState) => s.trip.origin.text.trim() || tzCity(s.trip.homeTz);

export const fmtDay = (d: ISODate) => formatDay(d, LOCALE);
export const fmtDayLong = (d: ISODate) => formatDay(d, LOCALE, { weekday: "long", month: "long" });

export function useIssueText() {
  const { t } = useTranslation();
  return (i: Issue) => {
    const p: Record<string, unknown> = { ...i.params };
    if (Array.isArray(p.days)) p.days = (p.days as number[]).map((d) => weekdayName(d, LOCALE)).join(", ");
    if (typeof p.date === "string") p.date = fmtDayLong(p.date);
    // Same presentation as the prototype: the warning continues the sentence.
    if (typeof p.warn === "string" && p.warn) p.warn = p.warn[0].toLowerCase() + p.warn.slice(1);
    return t(`issue.${i.code}`, p);
  };
}
