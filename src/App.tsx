import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { addCheck, deleteSlot, saveBooking, saveSlot, toggleCheck } from "./db/repo";
import type { ISODate } from "./model/types";
import { applyTripTheme, useAppearance, type Appearance } from "./ui/appearance";
import { DayStrip } from "./ui/DayStrip";
import { BookingEditor, SlotEditor } from "./ui/Editors";
import { fmtDay } from "./ui/format";
import { Itinerary } from "./ui/Itinerary";
import { MapView } from "./ui/MapView";
import { Practical, type PracticalPage } from "./ui/Practical";
import { Today } from "./ui/Today";
import { useTrip } from "./ui/useTrip";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "./db/db";
import { setCloudTrip, useCloudStatus } from "./sync/cloud";
import { TripForm, TripsSheet, Welcome } from "./ui/Trips";

type Tab = "today" | "itinerary" | "map" | "practical" | "assistant";
const TABS: [Tab, string][] = [["today", "☀"], ["itinerary", "☰"], ["map", "⌖"], ["practical", "▦"], ["assistant", "✦"]];
const PLACEHOLDER: Partial<Record<Tab, string>> = { assistant: "assistant.placeholder" };

export default function App() {
  const { t } = useTranslation();
  const { state: s, issues, trips, activeId, loading } = useTrip();
  const [tab, setTab] = useState<Tab>("today");
  const [mapDate, setMapDate] = useState<ISODate>();
  const [page, setPage] = useState<PracticalPage | null>(null);
  const [focus, setFocus] = useState<ISODate>();
  const [slotEd, setSlotEd] = useState<{ date: ISODate; id: string | null } | null>(null);
  const [bookingEd, setBookingEd] = useState<{ id: string | null }>();
  const [tripForm, setTripForm] = useState<"new" | "edit">();
  const [tripsOpen, setTripsOpen] = useState(false);
  const [appearance, setAppearance] = useAppearance();
  const cloud = useCloudStatus();
  const conflicts = useLiveQuery(() => db.conflicts.filter((c) => !c.dismissed).count(), []) ?? 0;

  useEffect(() => { if (s) applyTripTheme(s.trip.theme); }, [s?.trip.theme]);
  useEffect(() => { setCloudTrip(activeId); }, [activeId]);
  // Reset per-trip view state when switching trips.
  useEffect(() => { setFocus(undefined); setMapDate(undefined); setPage(null); }, [activeId]);
  const openBooking = (id: string | null) => setBookingEd({ id });

  if (loading) return <p className="p-6 text-soft">Loading…</p>;
  if (!s) return (
    <>
      <Welcome onCreate={() => setTripForm("new")} />
      {tripForm && <TripForm onClose={() => setTripForm(undefined)} />}
    </>
  );

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
            {fmtDay(s.trip.start)} → {fmtDay(s.trip.end)} · {s.trip.travellers.label
              ? <span lang={s.trip.travellers.label.lang}>{s.trip.travellers.label.text}</span>
              : t("trips.adults", { count: s.trip.travellers.adults })}
          </p>
          <button onClick={() => setTripsOpen(true)} className="text-left mt-1" aria-label={t("trips.switch")}>
            <h1 className="text-[26px] font-bold leading-tight text-white inline" lang={s.trip.name.lang}>{s.trip.name.text}</h1>
            <span aria-hidden className="text-white/70 text-lg ml-1.5">▾</span>
          </button>
          <p className="text-[12.5px] mt-1" style={{ color: "var(--on-dark)" }}>
            <button onClick={() => { setTab("practical"); setPage("verification"); }} className="underline-offset-2 hover:underline">
              <span style={{ color: errors ? "var(--error-on-dark)" : "var(--on-dark)", fontWeight: 700 }}>{t("common.errors", { count: errors })}</span>
              {", "}{t("common.warnings", { count: issues.length - errors })}
            </button>
            {", "}{t("common.locked", { count: locked })}
          </p>
          <button onClick={() => { setTab("practical"); setPage("sync"); }}
            className="mt-1.5 text-[11.5px] font-semibold px-2.5 py-1 rounded-full border"
            style={{ borderColor: "var(--watermark)", color: ["unreachable", "forbidden", "error"].includes(cloud.phase) ? "var(--error-on-dark)" : "var(--on-dark)", background: "var(--watermark)" }}>
            {cloud.phase === "syncing" ? "⟳" : cloud.phase === "idle" && !cloud.pending ? "✓" : "●"} {t(`sync.chip_${cloud.phase}`)}
            {cloud.pending > 0 && cloud.phase !== "local" ? ` · ${cloud.pending}` : ""}
          </button>
          {(tab === "itinerary" || tab === "map") && (
            <div className="mt-2">
              <DayStrip s={s} issues={issues} selected={tab === "map" ? mapDate : focus} onSelect={tab === "map" ? setMapDate : goToDay} />
              <p className="text-[11px] mt-1" style={{ color: "var(--on-dark)" }}>{t(tab === "map" ? "day.stripHintMap" : "day.stripHint")}</p>
            </div>
          )}
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 pt-4">
        {conflicts > 0 && (
          <button onClick={() => { setTab("practical"); setPage("verification"); }} role="alert"
            className="w-full text-left mb-3 text-[13px] px-3 py-2 rounded-md font-semibold"
            style={{ background: "var(--error-bg)", color: "var(--error-ink)", borderLeft: "3px solid var(--error)" }}>
            {t("sync.banner", { count: conflicts })}
          </button>
        )}
        {tab === "itinerary" && <Itinerary s={s} issues={issues} focus={focus} actions={{ editSlot: (date, id) => setSlotEd({ date, id }), openBooking }} />}
        {tab === "today" && <Today s={s} issues={issues} actions={{ openBooking, goToDay, openVerification: () => { setTab("practical"); setPage("verification"); } }} />}
        {tab === "map" && <MapView s={s} date={mapDate} setDate={setMapDate} goToDay={goToDay} />}
        {tab === "practical" && (
          <>
            <Practical s={s} issues={issues} page={page} setPage={setPage}
              actions={{ openBooking, openSettings: () => setTripForm("edit"), goToDay, toggleCheck: (id) => toggleCheck(tripId, id), addCheck: (text) => addCheck(tripId, text) }} />
            {!page && (
              <div className="mt-8 flex flex-wrap gap-3 items-end justify-between">
                <label className="text-[12.5px] text-soft">{t("common.theme")}
                  <select className="field" value={appearance} onChange={(e) => setAppearance(e.target.value as Appearance)}>
                    <option value="system">{t("common.themeSystem")}</option>
                    <option value="light">{t("common.themeLight")}</option>
                    <option value="dark">{t("common.themeDark")}</option>
                  </select>
                </label>
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
        <BookingEditor key={bookingEd.id ?? "new"} s={s} id={bookingEd.id} onClose={() => setBookingEd(undefined)}
          onSave={async (b) => { await saveBooking(tripId, b); setBookingEd(undefined); }} />
      )}
      {tripsOpen && trips && <TripsSheet trips={trips} activeId={activeId} onClose={() => setTripsOpen(false)} onCreate={() => { setTripsOpen(false); setTripForm("new"); }} />}
      {tripForm && <TripForm trip={tripForm === "edit" ? s.trip : undefined} onClose={() => setTripForm(undefined)} />}
    </div>
  );
}
