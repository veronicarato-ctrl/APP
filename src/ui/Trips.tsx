import { useState } from "react";
import { useTranslation } from "react-i18next";
import { THEME_KEYS } from "../data/themes";
import { createTrip, deleteTrip, loadExampleTrip, setActiveTripId, updateTrip, type NewTrip } from "../db/repo";
import { dateRange } from "../lib/dates";
import { LANG_NAMES } from "../i18n";
import type { Lang, Trip } from "../model/types";
import { fmtDay } from "./format";
import { Button, Card, Field, Sheet } from "./primitives";
import { THEMES } from "../data/themes";

const ZONES: string[] = (() => {
  try { return Intl.supportedValuesOf("timeZone"); } catch { return ["UTC"]; }
})();
const deviceZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
const CURRENCIES = ["EUR", "CHF", "USD", "GBP", "BRL", "CAD", "AUD", "JPY", "CNY", "MXN", "ARS", "CLP", "COP", "PEN", "ZAR", "MAD", "THB", "INR"];
const errText = (e: unknown) => (e instanceof Error ? e.message : String(e));

/** First screen when the phone has no trip yet. */
export function Welcome({ onCreate }: { onCreate: () => void }) {
  const { t } = useTranslation();
  return (
    <div className="max-w-xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold mb-2">{t("trips.welcome")}</h1>
      <p className="text-soft mb-6">{t("trips.welcomeIntro")}</p>
      <Button className="w-full mb-3" onClick={onCreate}>{t("trips.create")}</Button>
      <Button variant="ghost" className="w-full" onClick={() => loadExampleTrip()}>{t("trips.example")}</Button>
      <p className="text-[12.5px] text-soft mt-2">{t("trips.exampleNote")}</p>
    </div>
  );
}

/** List of trips with switch, creation and the example. */
export function TripsSheet({ trips, activeId, onClose, onCreate }: { trips: Trip[]; activeId?: string; onClose: () => void; onCreate: () => void }) {
  const { t } = useTranslation();
  return (
    <Sheet title={t("trips.title")} onClose={onClose}>
      <div className="flex flex-col gap-2 mb-4">
        {trips.map((x) => (
          <button key={x.id} onClick={async () => { await setActiveTripId(x.id); onClose(); }} className="text-left">
            <Card className="p-3.5" topColor={x.theme.accent}>
              <div className="flex justify-between gap-2">
                <strong lang={x.name.lang}>{x.name.text}</strong>
                {x.id === activeId && <span className="text-[11px] font-semibold text-label">{t("trips.current")}</span>}
              </div>
              <p className="text-[12.5px] text-soft">{fmtDay(x.start)} → {fmtDay(x.end)} · {t("trips.days", { count: dateRange(x.start, x.end).length })}</p>
            </Card>
          </button>
        ))}
      </div>
      <Button className="w-full mb-2" onClick={onCreate}>{t("trips.create")}</Button>
      <Button variant="ghost" className="w-full" onClick={async () => { await loadExampleTrip(); onClose(); }}>{t("trips.example")}</Button>
    </Sheet>
  );
}

/** Creation (trip undefined) or settings of an existing trip. */
export function TripForm({ trip, onClose }: { trip?: Trip; onClose: () => void }) {
  const { t } = useTranslation();
  const [f, setF] = useState(() => ({
    name: trip?.name.text ?? "",
    lang: (trip?.name.lang ?? "en") as Lang,
    start: trip?.start ?? "",
    end: trip?.end ?? "",
    adults: trip?.travellers.adults ?? 2,
    children: (trip?.travellers.children ?? []).join(", "),
    origin: trip?.origin.text ?? "",
    homeTz: trip?.homeTz ?? deviceZone(),
    homeCurrency: trip?.homeCurrency ?? "EUR",
    destTz: trip?.destTz ?? deviceZone(),
    themeKey: (trip && THEME_KEYS.find((k) => THEMES[k].dark === trip.theme.dark)) ?? "neutral",
    maxHeavy: trip?.rules.maxHeavy ?? 2,
    siesta: trip?.rules.siesta ?? false,
    checkoutBy: trip?.rules.checkoutBy ?? "10:00",
    minMargin: trip?.rules.minMarginMin == null ? "" : String(trip.rules.minMarginMin),
  }));
  const [err, setErr] = useState<string>();
  const upd = (p: Partial<typeof f>) => setF({ ...f, ...p });
  const children = f.children.split(",").map((x) => parseInt(x.trim(), 10)).filter((x) => !Number.isNaN(x));
  const valid = f.name.trim() && f.start && f.end;

  const save = async () => {
    setErr(undefined);
    if (f.end < f.start) return setErr(t("tripForm.endBeforeStart"));
    try {
      if (!trip) {
        const input: NewTrip = { name: f.name.trim(), lang: f.lang, start: f.start, end: f.end, adults: f.adults, children, origin: f.origin.trim(), homeTz: f.homeTz, homeCurrency: f.homeCurrency, destTz: f.destTz, themeKey: f.themeKey };
        await createTrip(input);
      } else {
        const theme = { ...THEMES[f.themeKey], regions: trip.theme.regions };
        await updateTrip({
          ...trip,
          name: { text: f.name.trim(), lang: f.lang },
          start: f.start, end: f.end,
          travellers: { ...trip.travellers, adults: f.adults, children },
          origin: { text: f.origin.trim(), lang: f.lang },
          homeTz: f.homeTz, homeCurrency: f.homeCurrency, destTz: f.destTz,
          theme,
          rules: { maxHeavy: f.maxHeavy, siesta: f.siesta, checkoutBy: f.checkoutBy, minMarginMin: f.minMargin === "" ? null : Math.max(0, parseInt(f.minMargin, 10) || 0) },
        });
      }
      onClose();
    } catch (e) {
      const m = errText(e);
      setErr(m === "daysNotEmpty" ? t("tripForm.daysNotEmpty") : m === "endBeforeStart" ? t("tripForm.endBeforeStart") : m);
    }
  };

  return (
    <Sheet title={trip ? t("tripForm.editTitle") : t("tripForm.newTitle")} onClose={onClose}>
      <Field label={t("tripForm.name")}><input className="field" value={f.name} onChange={(e) => upd({ name: e.target.value })} /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label={t("tripForm.start")}><input className="field" type="date" value={f.start} onChange={(e) => upd({ start: e.target.value })} /></Field>
        <Field label={t("tripForm.end")}><input className="field" type="date" value={f.end} onChange={(e) => upd({ end: e.target.value })} /></Field>
        <Field label={t("tripForm.adults")}><input className="field" type="number" min={1} value={f.adults} onChange={(e) => upd({ adults: Math.max(1, parseInt(e.target.value, 10) || 1) })} /></Field>
        <Field label={t("tripForm.lang")}>
          <select className="field" value={f.lang} onChange={(e) => upd({ lang: e.target.value as Lang })}>
            {Object.entries(LANG_NAMES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </Field>
      </div>
      <Field label={t("tripForm.children")}><input className="field" inputMode="numeric" value={f.children} onChange={(e) => upd({ children: e.target.value })} /></Field>
      <Field label={t("tripForm.origin")}><input className="field" value={f.origin} onChange={(e) => upd({ origin: e.target.value })} /></Field>
      <Field label={t("tripForm.destTz")}>
        <select className="field" value={f.destTz} onChange={(e) => upd({ destTz: e.target.value })}>{ZONES.map((z) => <option key={z}>{z}</option>)}</select>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label={t("tripForm.homeTz")}>
          <select className="field" value={f.homeTz} onChange={(e) => upd({ homeTz: e.target.value })}>{ZONES.map((z) => <option key={z}>{z}</option>)}</select>
        </Field>
        <Field label={t("tripForm.currency")}>
          <select className="field" value={f.homeCurrency} onChange={(e) => upd({ homeCurrency: e.target.value })}>
            {[...new Set([f.homeCurrency, ...CURRENCIES])].map((c) => <option key={c}>{c}</option>)}
          </select>
        </Field>
      </div>
      <Field label={t("tripForm.theme")}>
        <select className="field" value={f.themeKey} onChange={(e) => upd({ themeKey: e.target.value })}>
          {THEME_KEYS.map((k) => <option key={k} value={k}>{t(`tripForm.theme_${k}`)}</option>)}
        </select>
      </Field>
      {trip && (
        <fieldset className="border-0 p-0 m-0 mt-2">
          <p className="text-[11px] font-bold tracking-[0.18em] uppercase text-label mb-2">{t("tripForm.rules")}</p>
          <div className="grid grid-cols-2 gap-3">
            <Field label={t("tripForm.maxHeavy")}><input className="field" type="number" min={0} value={f.maxHeavy} onChange={(e) => upd({ maxHeavy: Math.max(0, parseInt(e.target.value, 10) || 0) })} /></Field>
            <Field label={t("tripForm.checkoutBy")}><input className="field" type="time" value={f.checkoutBy} onChange={(e) => upd({ checkoutBy: e.target.value })} /></Field>
          </div>
          <Field label={t("tripForm.minMargin")}><input className="field" type="number" min={0} value={f.minMargin} onChange={(e) => upd({ minMargin: e.target.value })} /></Field>
          <label className="flex items-center gap-2 min-h-11 text-sm">
            <input type="checkbox" className="w-5 h-5" checked={f.siesta} onChange={(e) => upd({ siesta: e.target.checked })} />{t("tripForm.siesta")}
          </label>
        </fieldset>
      )}
      {err && <p role="alert" className="text-[13px] my-2 px-3 py-2 rounded-md" style={{ background: "var(--error-bg)", color: "var(--error-ink)" }}>{err}</p>}
      <div className="flex justify-between gap-2 mt-4">
        {trip
          ? <Button variant="danger" onClick={async () => { if (window.confirm(t("trips.confirmDelete", { name: trip.name.text }))) { await deleteTrip(trip.id); onClose(); } }}>{t("tripForm.delete")}</Button>
          : <span />}
        <div className="flex gap-2">
          <Button variant="ghost" onClick={onClose}>{t("common.cancel")}</Button>
          <Button disabled={!valid} onClick={save}>{trip ? t("common.save") : t("tripForm.create")}</Button>
        </div>
      </div>
    </Sheet>
  );
}
