import { useLiveQuery } from "dexie-react-hooks";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { deleteExpense, saveExpense } from "../db/repo";
import { CATEGORIES, estimate, overBudget, spent, type Rates } from "../engine/budget";
import { CURRENCIES, currencyLabel } from "../lib/currencies";
import { newId } from "../lib/ids";
import { RATE_SOURCE_URL, refreshRate, saveRate, savedRate, type Rate } from "../lib/rates";
import { wallClock } from "../lib/time";
import type { ExpenseCategory, TripState } from "../model/types";
import { fmtDay, fmtMoney } from "./format";
import { Button, Card, SectionLabel } from "./primitives";

/** Saved rate between the home currency and the visited country's, refreshed when the page opens online. */
export function useTripRate(s: TripState) {
  const home = s.trip.homeCurrency, dest = s.trip.destCurrency;
  const rate = useLiveQuery(() => (dest && dest !== home ? savedRate(home, dest) : undefined), [home, dest]);
  const [failed, setFailed] = useState(false);
  const refresh = async () => {
    if (!dest || dest === home) return;
    try { await refreshRate(home, dest); setFailed(false); } catch { setFailed(true); }
  };
  useEffect(() => { if (typeof navigator === "undefined" || navigator.onLine) void refresh(); /* once per opening */ }, [home, dest]); // eslint-disable-line react-hooks/exhaustive-deps
  const rates: Rates = rate ? { [rate.quote]: rate.rate } : {};
  return { home, dest, rate, rates, failed, refresh };
}

export function budgetSummary(s: TripState, rates: Rates, t: (k: string, o?: Record<string, unknown>) => string) {
  const e = estimate(s, rates);
  const home = s.trip.homeCurrency;
  if (s.trip.budget == null && !e.counted) return t("budget.tileEmpty");
  const parts = [s.trip.budget != null ? t("budget.tileBudget", { v: fmtMoney(s.trip.budget, home) }) : "", e.counted ? t("budget.tileEstimate", { v: fmtMoney(Math.round(e.total.high), home) }) : ""];
  return parts.filter(Boolean).join(" · ");
}

export function BudgetPage({ s, openSettings }: { s: TripState; openSettings: () => void }) {
  const { t } = useTranslation();
  const { home, dest, rate, rates, failed, refresh } = useTripRate(s);
  const e = useMemo(() => estimate(s, rates), [s, rates]);
  const sp = useMemo(() => spent(s, rates), [s, rates]);
  const budget = s.trip.budget;
  const over = overBudget(budget, e.total.high);
  const money = (v: number) => fmtMoney(Math.round(v), home);
  const inDest = (v: number) => (rate ? ` · ${fmtMoney(Math.round(v * rate.rate), rate.quote)}` : "");
  const range = (lo: number, hi: number) => (Math.round(lo) === Math.round(hi) ? money(hi) : `${money(lo)} – ${money(hi)}`);
  const textPrices = e.skipped.filter((x) => x.reason === "noAmount").length;
  const noRate = e.skipped.filter((x) => x.reason !== "noAmount").length;

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-[14px] p-4 grid grid-cols-2 gap-3" style={{ background: "var(--id-dark)", color: "var(--on-dark)" }}>
        {[
          ["wanted", budget == null ? t("budget.none") : money(budget) + inDest(budget)],
          ["estimated", e.counted ? range(e.total.low, e.total.high) : t("budget.noPrices")],
          ["spent", money(sp.total) + inDest(sp.total)],
          ["left", budget == null ? "–" : money(budget - sp.total)],
        ].map(([k, v]) => (
          <div key={k}>
            <p className="text-[11px] font-bold tracking-[0.18em] uppercase" style={{ color: "var(--id-accent)" }}>{t(`budget.${k}`)}</p>
            <p className="text-white text-[17px] font-semibold tabular-nums">{v}</p>
          </div>
        ))}
      </div>
      {budget == null && <Button variant="ghost" onClick={openSettings}>{t("budget.setBudget")}</Button>}

      {over !== undefined && (
        <p role="alert" className="text-[13px] px-3 py-2 rounded-md" style={{ background: "var(--error-bg)", color: "var(--error-ink)", borderLeft: "3px solid var(--error)" }}>
          {t("budget.over", { estimate: money(e.total.high), budget: money(budget!), pct: Math.round(over * 100) })}
        </p>
      )}
      {(textPrices > 0 || noRate > 0) && (
        <p className="text-[12.5px] px-3 py-2 rounded-md" style={{ background: "var(--warn-bg)", color: "var(--warn-ink)", borderLeft: "3px solid var(--warn)" }}>
          {textPrices > 0 && t("budget.textPrices", { count: textPrices })}{textPrices > 0 && noRate > 0 ? " " : ""}{noRate > 0 && t("budget.noRatePrices", { count: noRate })}
        </p>
      )}

      <div>
        <SectionLabel>{t("budget.byCategory")}</SectionLabel>
        <Card>
          <div className="grid grid-cols-[1fr_auto_auto] gap-x-4 px-3.5 py-2 text-[11px] font-bold uppercase tracking-[0.12em] text-label">
            <span>{t("budget.category")}</span><span className="text-right">{t("budget.estimated")}</span><span className="text-right">{t("budget.spent")}</span>
          </div>
          {CATEGORIES.map((c) => (
            <div key={c} className="grid grid-cols-[1fr_auto_auto] gap-x-4 px-3.5 py-2 border-t border-line text-[13.5px] tabular-nums">
              <span>{t(`expense.${c}`)}</span>
              <span className="text-right">{e.byCat[c].high ? range(e.byCat[c].low, e.byCat[c].high) : "–"}</span>
              <span className="text-right">{sp.byCat[c] ? money(sp.byCat[c]) : "–"}</span>
            </div>
          ))}
        </Card>
      </div>

      <RateCard home={home} dest={dest} rate={rate} failed={failed} refresh={refresh} />
      <Expenses s={s} defaultCurrency={dest ?? home} noRate={sp.noRate} />
    </div>
  );
}

function RateCard({ home, dest, rate, failed, refresh }: { home: string; dest?: string; rate?: Rate; failed: boolean; refresh: () => Promise<void> }) {
  const { t } = useTranslation();
  const [typing, setTyping] = useState(false);
  const [value, setValue] = useState("");
  if (!dest || dest === home) return <p className="text-[12.5px] text-soft">{t("budget.oneCurrency")}</p>;
  const today = wallClock(Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC", new Date()).date;
  return (
    <div>
      <SectionLabel>{t("budget.rate")}</SectionLabel>
      <Card className="p-3.5 text-[13.5px]">
        {rate ? (
          <>
            <p className="font-semibold tabular-nums">1 {home} = {rate.rate.toLocaleString(undefined, { maximumFractionDigits: 4 })} {dest}</p>
            <p className="text-[12px] text-soft">
              {rate.source === "ecb"
                ? <>{t("budget.rateEcb", { date: fmtDay(rate.date) })} <a href={RATE_SOURCE_URL} target="_blank" rel="noopener noreferrer" className="underline">Frankfurter</a></>
                : t("budget.rateManual", { date: fmtDay(rate.date) })}
            </p>
          </>
        ) : <p className="text-soft">{t("budget.noRate", { home, dest })}</p>}
        {failed && !rate && <p className="text-[12px] mt-1" style={{ color: "var(--warn-ink)" }}>{t("budget.rateFailed")}</p>}
        {typing ? (
          <div className="flex gap-2 items-end mt-2">
            <label className="flex-1 text-[12.5px] text-soft">{t("budget.rateType", { home, dest })}
              <input className="field" inputMode="decimal" value={value} onChange={(e) => setValue(e.target.value)} />
            </label>
            <Button onClick={async () => {
              const r = Number(value.replace(",", "."));
              if (r > 0) await saveRate({ base: home, quote: dest, rate: r, date: today, source: "manual", fetchedAt: new Date().toISOString() });
              setTyping(false);
            }}>{t("common.save")}</Button>
          </div>
        ) : (
          <div className="flex gap-2 mt-2">
            <Button variant="ghost" onClick={refresh}>{t("budget.rateRefresh")}</Button>
            <Button variant="ghost" onClick={() => { setValue(rate ? String(rate.rate) : ""); setTyping(true); }}>{t("budget.rateEnter")}</Button>
          </div>
        )}
      </Card>
    </div>
  );
}

function Expenses({ s, defaultCurrency, noRate }: { s: TripState; defaultCurrency: string; noRate: number }) {
  const { t } = useTranslation();
  const today = wallClock(Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC", new Date()).date;
  const blank = () => ({ amount: "", currency: defaultCurrency, category: "food" as ExpenseCategory, date: today < s.trip.start ? s.trip.start : today > s.trip.end ? s.trip.end : today, note: "" });
  const [f, setF] = useState(blank);
  const [open, setOpen] = useState(false);
  const amount = Number(f.amount.replace(",", "."));
  const codes = [...new Set([defaultCurrency, s.trip.homeCurrency, ...CURRENCIES])];
  return (
    <div>
      <SectionLabel>{t("budget.expenses")}</SectionLabel>
      {s.expenses.length === 0 && <p className="text-sm text-soft mb-2">{t("budget.noExpenses")}</p>}
      {noRate > 0 && <p className="text-[12px] mb-2" style={{ color: "var(--warn-ink)" }}>{t("budget.expensesNoRate", { count: noRate })}</p>}
      <div className="flex flex-col gap-1.5 mb-2">
        {[...s.expenses].reverse().map((x) => (
          <Card key={x.id} className="px-3.5 py-2 flex items-center gap-3 text-[13.5px]">
            <span className="flex-1">
              <strong className="tabular-nums">{fmtMoney(x.amount, x.currency)}</strong> · {t(`expense.${x.category}`)}
              <span className="block text-[12px] text-soft">{fmtDay(x.date)}{x.note ? ` · ${x.note.text}` : ""}</span>
            </span>
            <button className="min-h-11 px-2 text-soft" onClick={() => window.confirm(t("budget.confirmDelete", { v: fmtMoney(x.amount, x.currency) })) && deleteExpense(s.trip.id, x.id)}>{t("common.delete")}</button>
          </Card>
        ))}
      </div>
      {open ? (
        <Card className="p-3.5">
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-[12.5px] text-soft">{t("price.amount")}<input className="field" inputMode="decimal" value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} /></label>
            <label className="block text-[12.5px] text-soft">{t("price.currency")}
              <select className="field" value={f.currency} onChange={(e) => setF({ ...f, currency: e.target.value })}>{codes.map((c) => <option key={c} value={c}>{currencyLabel(c)}</option>)}</select>
            </label>
            <label className="block text-[12.5px] text-soft">{t("budget.category")}
              <select className="field" value={f.category} onChange={(e) => setF({ ...f, category: e.target.value as ExpenseCategory })}>{CATEGORIES.map((c) => <option key={c} value={c}>{t(`expense.${c}`)}</option>)}</select>
            </label>
            <label className="block text-[12.5px] text-soft">{t("budget.date")}<input className="field" type="date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} /></label>
          </div>
          <label className="block text-[12.5px] text-soft mt-3">{t("budget.note")}<input className="field" value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} /></label>
          <div className="flex justify-end gap-2 mt-3">
            <Button variant="ghost" onClick={() => { setOpen(false); setF(blank()); }}>{t("common.cancel")}</Button>
            <Button disabled={!(amount > 0) || !f.date} onClick={async () => {
              await saveExpense(s.trip.id, { id: newId(), date: f.date, amount, currency: f.currency, category: f.category, who: "", ...(f.note.trim() ? { note: { text: f.note.trim(), lang: s.trip.name.lang } } : {}) });
              setF(blank()); setOpen(false);
            }}>{t("common.save")}</Button>
          </div>
        </Card>
      ) : <Button className="w-full" onClick={() => setOpen(true)}>+ {t("budget.addExpense")}</Button>}
    </div>
  );
}
