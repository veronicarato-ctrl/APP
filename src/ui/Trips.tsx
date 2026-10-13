import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { MODE_MAX, MODES } from "../data/modes";
import { WELCOME_PHOTOS } from "../data/welcomePhotos";
import { createTrip, deleteTrip, loadExampleTrip, loadState, setActiveTripId, updateTrip, type NewTrip } from "../db/repo";
import { shrinkImage } from "../lib/image";
import { keepFiles } from "../sync/files";
import { dateRange } from "../lib/dates";
import { LANG_NAMES } from "../i18n";
import { CURRENCIES, currencyLabel } from "../lib/currencies";
import { deviceZone, homeZoneFor, zoneForCity, ZONES } from "../lib/zones";
import type { FileRef, Lang, TravelMode, Trip } from "../model/types";
import { fmtDay } from "./format";
import { PhotoRotator } from "./PhotoRotator";
import { Button, Card, Field, Sheet } from "./primitives";
import { useBlobUrl } from "./useBlobUrl";

const errText = (e: unknown) => (e instanceof Error ? e.message : String(e));

/** First screen when the phone has no trip yet: photos that give the urge to travel, then the two ways in. */
export function Welcome({ onCreate }: { onCreate: () => void }) {
  const { t } = useTranslation();
  return (
    <div className="min-h-dvh">
      <div className="relative h-[52vh] min-h-72 overflow-hidden" style={{ background: "linear-gradient(135deg, var(--id-darker), var(--id-dark))" }}>
        {WELCOME_PHOTOS.length > 0 && <PhotoRotator photos={WELCOME_PHOTOS} />}
        {/* Darkens the bottom of any photo so the white title keeps its contrast. */}
        <div aria-hidden className="absolute inset-0 pointer-events-none" style={{ background: "linear-gradient(to bottom, transparent 35%, color-mix(in srgb, var(--id-darker) 80%, transparent) 75%)" }} />
        <div className="absolute z-10 left-4 right-4 bottom-12 max-w-xl mx-auto">
          <p className="text-[11px] font-bold tracking-[0.3em] uppercase" style={{ color: "var(--id-accent)" }}>{t("trips.welcome")}</p>
          <h1 className="text-[32px] font-bold leading-tight text-white">{t("trips.welcomeTitle")}</h1>
        </div>
      </div>
      <div className="max-w-xl mx-auto px-4 py-6">
        <p className="text-soft mb-6">{t("trips.welcomeIntro")}</p>
        <Button className="w-full mb-3" onClick={onCreate}>{t("trips.create")}</Button>
        <Button variant="ghost" className="w-full" onClick={() => loadExampleTrip()}>{t("trips.example")}</Button>
        <p className="text-[12.5px] text-soft mt-2">{t("trips.exampleNote")}</p>
      </div>
    </div>
  );
}

function TripThumb({ trip }: { trip: Trip }) {
  const url = useBlobUrl(trip.cover?.path);
  return url
    ? <img src={url} alt="" className="w-14 h-14 rounded-[10px] object-cover shrink-0" />
    : <span aria-hidden className="w-14 h-14 rounded-[10px] shrink-0" style={{ background: `linear-gradient(135deg, ${trip.theme.darker}, ${trip.theme.dark})` }} />;
}

/** List of trips with switch, creation and the example. */
export function TripsSheet({ trips, activeId, onClose, onCreate }: { trips: Trip[]; activeId?: string; onClose: () => void; onCreate: () => void }) {
  const { t } = useTranslation();
  return (
    <Sheet title={t("trips.title")} onClose={onClose}>
      <div className="flex flex-col gap-2 mb-4">
        {trips.map((x) => (
          <button key={x.id} onClick={async () => { await setActiveTripId(x.id); onClose(); }} className="text-left">
            <Card className="p-3 flex gap-3 items-center" topColor={x.theme.accent}>
              <TripThumb trip={x} />
              <div className="flex-1">
                <div className="flex justify-between gap-2">
                  <strong lang={x.name.lang}>{x.name.text}</strong>
                  {x.id === activeId && <span className="text-[11px] font-semibold text-label">{t("trips.current")}</span>}
                </div>
                <p className="text-[12.5px] text-soft">{fmtDay(x.start)} → {fmtDay(x.end)} · {t("trips.days", { count: dateRange(x.start, x.end).length })}</p>
              </div>
            </Card>
          </button>
        ))}
      </div>
      <Button className="w-full mb-2" onClick={onCreate}>{t("trips.create")}</Button>
      <Button variant="ghost" className="w-full" onClick={async () => { await loadExampleTrip(); onClose(); }}>{t("trips.example")}</Button>
    </Sheet>
  );
}

type Modes = Partial<Record<TravelMode, number>>;
const STEPS = ["intent", "essentials", "modes"] as const;

/** Creation as three steps (trip undefined), or every setting of an existing trip on one page. */
export function TripForm({ trip, onClose }: { trip?: Trip; onClose: () => void }) {
  const { t } = useTranslation();
  const [step, setStep] = useState(0);
  const [f, setF] = useState(() => {
    const origin = trip?.origin.text ?? "";
    return {
      intent: trip?.intent?.text ?? "",
      name: trip?.name.text ?? "",
      lang: (trip?.name.lang ?? "en") as Lang,
      start: trip?.start ?? "",
      end: trip?.end ?? "",
      adults: trip?.travellers.adults ?? 2,
      children: (trip?.travellers.children ?? []).join(", "),
      origin,
      homeTz: trip?.homeTz ?? deviceZone(),
      // An existing trip whose zone differs from what its city gives was set by hand: keep it.
      tzManual: !!trip && trip.homeTz !== homeZoneFor(origin),
      homeCurrency: trip?.homeCurrency ?? "EUR",
      destCurrency: trip?.destCurrency ?? "",
      budget: trip?.budget == null ? "" : String(trip.budget),
      modes: { ...(trip?.modes ?? {}) } as Modes,
      maxHeavy: trip?.rules.maxHeavy ?? 2,
      siesta: trip?.rules.siesta ?? false,
      checkoutBy: trip?.rules.checkoutBy ?? "10:00",
      minMargin: trip?.rules.minMarginMin == null ? "" : String(trip.rules.minMarginMin),
    };
  });
  const [err, setErr] = useState<string>();
  // Cover photo: an existing trip stores it at once; a new trip keeps the file until it is created.
  const [cover, setCover] = useState<FileRef | undefined>(trip?.cover);
  const [pendingCover, setPendingCover] = useState<File>();
  const pendingUrl = usePendingUrl(pendingCover);
  const coverUrl = useBlobUrl(cover?.path) ?? pendingUrl;
  const upd = (p: Partial<typeof f>) => setF({ ...f, ...p });
  const pickCover = async (file?: File) => {
    if (!file) return;
    const small = await shrinkImage(file);
    if (trip) setCover((await keepFiles(trip.id, "cover", [small]))[0]);
    else setPendingCover(small);
  };
  const children = f.children.split(",").map((x) => parseInt(x.trim(), 10)).filter((x) => !Number.isNaN(x));
  const homeTz = f.tzManual ? f.homeTz : homeZoneFor(f.origin);
  const budget = f.budget.trim() === "" ? null : Math.max(0, Number(f.budget.replace(",", ".")) || 0);
  const essentialsOk = !!(f.name.trim() && f.start && f.end);

  const save = async () => {
    setErr(undefined);
    if (f.end < f.start) return setErr(t("tripForm.endBeforeStart"));
    try {
      if (!trip) {
        const input: NewTrip = {
          name: f.name.trim(), lang: f.lang, start: f.start, end: f.end, adults: f.adults, children,
          origin: f.origin.trim(), homeTz, homeCurrency: f.homeCurrency, destCurrency: f.destCurrency,
          budget, intent: f.intent, modes: f.modes,
        };
        const id = await createTrip(input);
        if (pendingCover) {
          const [ref] = await keepFiles(id, "cover", [pendingCover]);
          const created = (await loadState(id))!.trip;
          await updateTrip({ ...created, cover: ref });
        }
      } else {
        const next: Trip = {
          ...trip,
          name: { text: f.name.trim(), lang: f.lang },
          start: f.start, end: f.end,
          travellers: { ...trip.travellers, adults: f.adults, children },
          origin: { text: f.origin.trim(), lang: f.lang },
          homeTz, homeCurrency: f.homeCurrency, budget, modes: f.modes,
          rules: { maxHeavy: f.maxHeavy, siesta: f.siesta, checkoutBy: f.checkoutBy, minMarginMin: f.minMargin === "" ? null : Math.max(0, parseInt(f.minMargin, 10) || 0) },
        };
        // The traveller's words keep the language they were written in.
        if (f.intent.trim()) next.intent = { text: f.intent, lang: trip.intent?.lang ?? f.lang }; else delete next.intent;
        if (f.destCurrency) next.destCurrency = f.destCurrency; else delete next.destCurrency;
        if (cover) next.cover = cover; else delete next.cover;
        await updateTrip(next);
      }
      onClose();
    } catch (e) {
      const m = errText(e);
      setErr(m === "daysNotEmpty" ? t("tripForm.daysNotEmpty") : m === "endBeforeStart" ? t("tripForm.endBeforeStart") : m);
    }
  };

  const intent = (
    <>
      <Field label={t("tripForm.intentLabel")}>
        <textarea className="field min-h-36" value={f.intent} onChange={(e) => upd({ intent: e.target.value })} placeholder={t("tripForm.intentPlaceholder")} />
      </Field>
      <p className="text-[12.5px] text-soft -mt-1 mb-3">{t("tripForm.intentNote")}</p>
      {!trip && (
        <div>
          <p className="text-[11px] font-bold tracking-[0.18em] uppercase text-label mb-1">{t("tripForm.inspiration")}</p>
          {(["ex1", "ex2", "ex3"] as const).map((k) => (
            <button key={k} type="button" onClick={() => upd({ intent: t(`tripForm.${k}`) })}
              className="block w-full text-left text-[13.5px] italic py-2.5 border-b border-line min-h-11">« {t(`tripForm.${k}`)} »</button>
          ))}
        </div>
      )}
    </>
  );

  const essentials = (
    <>
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
      {f.tzManual ? (
        <Field label={t("tripForm.homeTz")}>
          <select className="field" value={f.homeTz} onChange={(e) => upd({ homeTz: e.target.value })}>{ZONES.map((z) => <option key={z}>{z}</option>)}</select>
        </Field>
      ) : (
        <p className="text-[12.5px] text-soft -mt-1 mb-3">
          {t(zoneForCity(f.origin) ? "tripForm.tzFromCity" : "tripForm.tzFromPhone", { zone: homeTz })}{" "}
          <button type="button" className="underline min-h-8" onClick={() => upd({ tzManual: true, homeTz })}>{t("tripForm.tzChange")}</button>
        </p>
      )}
      <div className="grid grid-cols-2 gap-3">
        <Field label={t("tripForm.budget")}><input className="field" inputMode="decimal" value={f.budget} onChange={(e) => upd({ budget: e.target.value })} /></Field>
        <Field label={t("tripForm.homeCurrency")}><CurrencySelect value={f.homeCurrency} onChange={(v) => upd({ homeCurrency: v })} /></Field>
      </div>
      <p className="text-[12.5px] text-soft -mt-1 mb-3">{t("tripForm.budgetNote")}</p>
      <Field label={t("tripForm.destCurrency")}><CurrencySelect value={f.destCurrency} onChange={(v) => upd({ destCurrency: v })} allowEmpty /></Field>
      <p className="text-[12.5px] text-soft mb-1">{t("tripForm.cover")}</p>
      <div className="flex items-center gap-3 mb-1">
        {coverUrl
          ? <img src={coverUrl} alt={t("tripForm.coverAlt")} className="w-24 h-16 rounded-[10px] object-cover" />
          : <span aria-hidden className="w-24 h-16 rounded-[10px]" style={{ background: "linear-gradient(135deg, var(--id-darker), var(--id-dark))" }} />}
        <label className="min-h-11 px-4 rounded-[10px] font-semibold inline-flex items-center border border-line cursor-pointer">
          {coverUrl ? t("tripForm.coverChange") : t("tripForm.coverAdd")}
          <input type="file" accept="image/*" className="sr-only" onChange={(e) => pickCover(e.target.files?.[0])} />
        </label>
        {coverUrl && <button type="button" className="underline min-h-11" onClick={() => { setCover(undefined); setPendingCover(undefined); }}>{t("tripForm.coverRemove")}</button>}
      </div>
      <p className="text-[12px] text-soft mb-3">{t("tripForm.coverNote")}</p>
    </>
  );

  const modes = (
    <>
      <p className="text-[12.5px] text-soft mb-3">{t("tripForm.modesNote")}</p>
      {MODES.map((m) => (
        <div key={m} className="mb-3">
          <p id={`mode-${m}`} className="text-[13.5px] font-semibold mb-1">{t(`modes.${m}`)}</p>
          <div role="radiogroup" aria-labelledby={`mode-${m}`} className="grid grid-cols-6 gap-1">
            {Array.from({ length: MODE_MAX + 1 }, (_, n) => {
              const on = f.modes[m] === n;
              return (
                <button key={n} type="button" role="radio" aria-checked={on}
                  onClick={() => { const next = { ...f.modes }; if (on) delete next[m]; else next[m] = n; upd({ modes: next }); }}
                  className="min-h-11 rounded-[10px] border font-semibold tabular-nums"
                  style={on ? { background: "var(--id-dark)", color: "var(--on-color)", borderColor: "var(--id-dark)" } : { borderColor: "var(--line)" }}>{n}</button>
              );
            })}
          </div>
        </div>
      ))}
    </>
  );

  const alert = err && <p role="alert" className="text-[13px] my-2 px-3 py-2 rounded-md" style={{ background: "var(--error-bg)", color: "var(--error-ink)" }}>{err}</p>;

  if (!trip) {
    const last = step === STEPS.length - 1;
    return (
      <Sheet title={t("tripForm.newTitle")} onClose={onClose}>
        <div className="flex gap-1.5 mb-3" aria-hidden>
          {STEPS.map((_, i) => <span key={i} className="h-1 flex-1 rounded-full" style={{ background: i <= step ? "var(--id-accent-on-light)" : "var(--line)" }} />)}
        </div>
        <p className="text-[11px] font-bold tracking-[0.18em] uppercase text-label">{t("tripForm.stepOf", { n: step + 1, total: STEPS.length })} · {t(`tripForm.step_${STEPS[step]}`)}</p>
        <h3 className="text-xl font-bold mb-3">{t(`tripForm.stepTitle_${STEPS[step]}`)}</h3>
        {step === 0 && intent}
        {step === 1 && essentials}
        {step === 2 && modes}
        {alert}
        <div className="flex justify-between gap-2 mt-4">
          <Button variant="ghost" onClick={() => (step ? setStep(step - 1) : onClose())}>{step ? t("tripForm.back") : t("common.cancel")}</Button>
          {last
            ? <Button disabled={!essentialsOk} onClick={save}>{t("tripForm.create")}</Button>
            : <Button disabled={step === 1 && !essentialsOk} onClick={() => setStep(step + 1)}>{t("tripForm.next")}</Button>}
        </div>
      </Sheet>
    );
  }

  return (
    <Sheet title={t("tripForm.editTitle")} onClose={onClose}>
      <p className="text-[11px] font-bold tracking-[0.18em] uppercase text-label mb-2">{t("tripForm.step_intent")}</p>
      {intent}
      <p className="text-[11px] font-bold tracking-[0.18em] uppercase text-label mb-2 mt-2">{t("tripForm.step_essentials")}</p>
      {essentials}
      <p className="text-[11px] font-bold tracking-[0.18em] uppercase text-label mb-2 mt-2">{t("tripForm.step_modes")}</p>
      {modes}
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
      {alert}
      <div className="flex justify-between gap-2 mt-4">
        <Button variant="danger" onClick={async () => { if (window.confirm(t("trips.confirmDelete", { name: trip.name.text }))) { await deleteTrip(trip.id); onClose(); } }}>{t("tripForm.delete")}</Button>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={onClose}>{t("common.cancel")}</Button>
          <Button disabled={!essentialsOk} onClick={save}>{t("common.save")}</Button>
        </div>
      </div>
    </Sheet>
  );
}

function usePendingUrl(file?: File) {
  const [url, setUrl] = useState<string>();
  useEffect(() => {
    if (!file) { setUrl(undefined); return; }
    const u = URL.createObjectURL(file);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);
  return url;
}

function CurrencySelect({ value, onChange, allowEmpty }: { value: string; onChange: (v: string) => void; allowEmpty?: boolean }) {
  const { t } = useTranslation();
  return (
    <select className="field" value={value} onChange={(e) => onChange(e.target.value)}>
      {allowEmpty && <option value="">{t("tripForm.currencyUnknown")}</option>}
      {[...new Set([...(value ? [value] : []), ...CURRENCIES])].map((c) => <option key={c} value={c}>{currencyLabel(c)}</option>)}
    </select>
  );
}
