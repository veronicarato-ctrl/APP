import { useTranslation } from "react-i18next";
import { CURRENCIES, currencyLabel } from "../lib/currencies";
import type { Price, PriceNature, TripState } from "../model/types";
import { T } from "./primitives";

const num = (v: string) => (v.trim() === "" ? undefined : Math.max(0, Number(v.replace(",", ".")) || 0));

/**
 * Structured price of a slot or booking: amount (or a range), currency, per person or for all, and its nature.
 * A price imported as text stays visible and untouched; it is only counted in the budget once an amount is given.
 */
export function PriceFields({ s, price, onChange }: { s: TripState; price?: Price; onChange: (p?: Price) => void }) {
  const { t } = useTranslation();
  const p: Price = price ?? {};
  const currency = p.currency ?? s.trip.destCurrency ?? s.trip.homeCurrency;
  const set = (patch: Partial<Price>) => {
    const next: Price = { ...p, currency, per: p.per ?? "group", ...patch };
    if (next.amount === undefined) { delete next.max; delete next.currency; delete next.per; delete next.nature; }
    else next.nature = next.max !== undefined && next.max > next.amount ? "range" : next.nature === "range" || !next.nature ? "estimated" : next.nature;
    for (const k of Object.keys(next) as (keyof Price)[]) if (next[k] === undefined) delete next[k];
    onChange(Object.keys(next).length ? next : undefined);
  };
  const codes = [...new Set([currency, s.trip.destCurrency, s.trip.homeCurrency, ...CURRENCIES].filter(Boolean) as string[])];
  return (
    <fieldset className="border-0 p-0 m-0 mb-1">
      <p className="text-[12.5px] text-soft mb-1">{t("price.title")}</p>
      {p.note && <p className="text-[12.5px] mb-2">{t("price.asWritten")} <T v={p.note} /></p>}
      <div className="grid grid-cols-2 gap-3">
        <label className="block mb-3 text-[12.5px] text-soft">{t("price.amount")}
          <input className="field" inputMode="decimal" value={p.amount ?? ""} onChange={(e) => set({ amount: num(e.target.value) })} />
        </label>
        <label className="block mb-3 text-[12.5px] text-soft">{t("price.max")}
          <input className="field" inputMode="decimal" value={p.max ?? ""} disabled={p.amount === undefined} onChange={(e) => set({ max: num(e.target.value) })} />
        </label>
        <label className="block mb-3 text-[12.5px] text-soft">{t("price.currency")}
          <select className="field" value={currency} disabled={p.amount === undefined} onChange={(e) => set({ currency: e.target.value })}>
            {codes.map((c) => <option key={c} value={c}>{currencyLabel(c)}</option>)}
          </select>
        </label>
        <label className="block mb-3 text-[12.5px] text-soft">{t("price.per")}
          <select className="field" value={p.per ?? "group"} disabled={p.amount === undefined} onChange={(e) => set({ per: e.target.value as Price["per"] })}>
            <option value="group">{t("price.per_group")}</option>
            <option value="person">{t("price.per_person")}</option>
          </select>
        </label>
      </div>
      {p.amount !== undefined && p.nature !== "range" && (
        <label className="block mb-3 text-[12.5px] text-soft">{t("price.nature")}
          <select className="field" value={p.nature ?? "estimated"} onChange={(e) => set({ nature: e.target.value as PriceNature })}>
            <option value="estimated">{t("price.nature_estimated")}</option>
            <option value="confirmed">{t("price.nature_confirmed")}</option>
          </select>
        </label>
      )}
    </fieldset>
  );
}
