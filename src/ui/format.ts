import { useTranslation } from "react-i18next";
import type { Issue } from "../engine/rules";
import { formatDay, weekdayName } from "../lib/dates";
import { LOCALE } from "../i18n";
import type { ISODate, Price, TripState } from "../model/types";
import { tzCity } from "../lib/time";

/** Name used for "home" in time comparisons: the departure city, else the home time zone city. */
export const homeName = (s: TripState) => s.trip.origin.text.trim() || tzCity(s.trip.homeTz);

export const fmtDay = (d: ISODate) => formatDay(d, LOCALE);

/** Amount with its currency symbol; whole units unless the amount has cents. */
export const fmtMoney = (amount: number, currency: string) => {
  try {
    return new Intl.NumberFormat(LOCALE, { style: "currency", currency, maximumFractionDigits: Number.isInteger(amount) ? 0 : 2 }).format(amount);
  } catch { return `${amount} ${currency}`; }
};

/** "about €30 per person", "€100 – €160 for all", "€220 for all"; one display per price. */
export function fmtPrice(p: Price, t: (k: string) => string): string | undefined {
  if (p.amount === undefined || !p.currency) return undefined;
  const v = p.max !== undefined && p.max > p.amount ? `${fmtMoney(p.amount, p.currency)} – ${fmtMoney(p.max, p.currency)}` : fmtMoney(p.amount, p.currency);
  return `${p.nature === "estimated" ? t("price.shown_estimated") + " " : ""}${v} ${t(p.per === "person" ? "price.shown_person" : "price.shown_group")}`;
}

/** "45 min", "2 h", "1 h 30". */
export const fmtMinutes = (m: number) => {
  const h = Math.floor(m / 60), r = m % 60;
  return h ? `${h} h${r ? " " + String(r).padStart(2, "0") : ""}` : `${r} min`;
};
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
