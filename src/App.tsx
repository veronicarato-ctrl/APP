import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { addCheck, deleteSlot, resetTrip, saveBooking, saveSlot, toggleCheck } from "./db/repo";
import type { ISODate } from "./model/types";
import { applyTripTheme, useAppearance, type Appearance } from "./ui/appearance";
import { DayStrip } from "./ui/DayStrip";
import { BookingEditor, SlotEditor } from "./ui/Editors";
import { fmtDay } from "./ui/format";
import { Itinerary } from "./ui/Itinerary";
import { Practical, type PracticalPage } from "./ui/Practical";
import { useTrip } from "./ui/useTrip";

type Tab = "today" | "itinerary" | "map" | "practical" | "assistant";
const TABS: [Tab, string][] = [["today", "☀"], ["itinerary", "☰"], ["map", "⌖"], ["practical", "▦"], ["assistant", "✦"]];
const PLACEHOLDER: Partial<Record<Tab, string>> = { today: "today.placeholder", map: "map.placeholder", assistant: "assistant.placeholder" };

export default function App() {
  const { t } = useTranslation();
  const { state: s, issues } = useTrip();
  const [tab, setTab] = useState<Tab>("itinerary");
  const [page, setPage] = useState<PracticalPage | null>(null);
  const [focus, setFocus] = useState<ISODate>();
  const [slotEd, setSlotEd] = useState<{ date: ISODate; id: string | null } | null>(null);
  const [bookingEd, setBookingEd] = useState<string | null>(null);
  const [appearance, setAppearance] = useAppearance();

  useEffect(() => { if (s) applyTripTheme(s.trip.theme); }, [s?.trip.theme]);
  if (!s) return <p className="p-6 text-soft">Loading…</p>;

  const tripId = s.trip.id;
  const errors = issues.filter((i) => i.level === "error").length;
  const locked = s.bookings.filter((b) => b.status === "confirmed").length;
  const goToDay = (d: ISODate) => { setTab("itinerary"); setFocus(d); };
  const watermark = s.trip.name.text.split(/[ ,]/)[0].toUpperCase();

  return (
    <div className="min-h-dvh pb-24">
      <header className="relative overflow-hidden px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-3"
        style={{ background: "linear-gradient(135deg, var(--id-darker), var(--id-dark))" }}>
        <span aria-hidden className="absolute -right-2 top-1 text-[64px] font-black tracking-tight select-none pointer-events-none" style={{ color: "var(--watermark)" }}>{watermark}</span>
        <div className="relative max-w-3xl mx-auto">
          <p className="text-[10px] font-bold tracking-[0.3em] uppercase" style={{ color: "var(--id-accent)" }}>
            {fmtDay(s.trip.start)} → {fmtDay(s.trip.end)} · <span lang={s.trip.travellers.label?.lang}>{s.trip.travellers.label?.text}</span>
          </p>
          <h1 className="text-[26px] font-bold leading-tight text-white mt-1" lang={s.trip.name.lang}>{s.trip.name.text}</h1>
          <p className="text-[12.5px] mt-1" style={{ color: "var(--on-dark)" }}>
            <button onClick={() => { setTab("practical"); setPage("verification"); }} className="underline-offset-2 hover:underline">
              <span style={{ color: errors ? "var(--error-on-dark)" : "var(--on-dark)", fontWeight: 700 }}>{t("common.errors", { count: errors })}</span>
              {", "}{t("common.warnings", { count: issues.length - errors })}
            </button>
            {", "}{t("common.locked", { count: locked })}
          </p>
          {tab === "itinerary" && (
            <div className="mt-2">
              <DayStrip s={s} issues={issues} selected={focus} onSelect={goToDay} />
              <p className="text-[11px] mt-1" style={{ color: "var(--on-dark)" }}>{t("day.stripHint")}</p>
            </div>
          )}
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 pt-4">
        {tab === "itinerary" && <Itinerary s={s} issues={issues} focus={focus} actions={{ editSlot: (date, id) => setSlotEd({ date, id }), openBooking: setBookingEd }} />}
        {tab === "practical" && (
          <>
            <Practical s={s} issues={issues} page={page} setPage={setPage}
              actions={{ openBooking: setBookingEd, goToDay, toggleCheck: (id) => toggleCheck(tripId, id), addCheck: (text) => addCheck(tripId, text) }} />
            {!page && (
              <div className="mt-8 flex flex-wrap gap-3 items-end justify-between">
                <label className="text-[12.5px] text-soft">{t("common.theme")}
                  <select className="field" value={appearance} onChange={(e) => setAppearance(e.target.value as Appearance)}>
                    <option value="system">{t("common.themeSystem")}</option>
                    <option value="light">{t("common.themeLight")}</option>
                    <option value="dark">{t("common.themeDark")}</option>
                  </select>
                </label>
                <button className="min-h-11 px-4 rounded-[10px] border border-line text-sm" onClick={() => window.confirm(t("common.resetConfirm")) && resetTrip(tripId)}>{t("common.reset")}</button>
              </div>
            )}
          </>
        )}
        {PLACEHOLDER[tab] && <p className="text-soft text-sm py-10 text-center">{t(PLACEHOLDER[tab]!)}</p>}
      </main>

      <nav className="fixed bottom-0 inset-x-0 z-20 border-t border-line bg-card pb-[env(safe-area-inset-bottom)]">
        <div className="max-w-3xl mx-auto grid grid-cols-5">
          {TABS.map(([k, icon]) => (
            <button key={k} onClick={() => { setTab(k); if (k === "practical") setPage(null); }} aria-current={tab === k ? "page" : undefined}
              className="min-h-14 flex flex-col items-center justify-center text-[11px] font-semibold"
              style={{ color: tab === k ? "var(--label)" : "var(--soft)" }}>
              <span aria-hidden className="text-lg leading-none mb-0.5">{icon}</span>{t(`nav.${k}`)}
            </button>
          ))}
        </div>
      </nav>

      {slotEd && (
        <SlotEditor s={s} date={slotEd.date} id={slotEd.id} onClose={() => setSlotEd(null)}
          onSave={async (slot, to) => { await saveSlot(tripId, slotEd.date, slot, to); setSlotEd(null); }}
          onDelete={async () => { await deleteSlot(tripId, slotEd.date, slotEd.id!); setSlotEd(null); }} />
      )}
      {bookingEd && (
        <BookingEditor s={s} id={bookingEd} onClose={() => setBookingEd(null)}
          onSave={async (b) => { await saveBooking(tripId, b); setBookingEd(null); }} />
      )}
    </div>
  );
}
