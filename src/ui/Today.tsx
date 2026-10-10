import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { dayPath, dayTransports, lodgingForNight, placeBefore, upcoming } from "../engine/derive";
import type { Issue } from "../engine/rules";
import { dateRange, nightsBetween } from "../lib/dates";
import { callHomeVerdict, diffMin, fmtDiff, tzCity, wallClock, zonedInstant } from "../lib/time";
import type { Booking, ISODate, TripState } from "../model/types";
import { fmtDay, fmtDayLong } from "./format";
import { Card, IssueBox, SectionLabel, T } from "./primitives";
import { TransportZone } from "./zone";

interface Actions { openBooking: (id: string) => void; goToDay: (d: ISODate) => void; openVerification: () => void }

const short = (s: string) => s.split(",")[0];
const until = (ms: number) => {
  const m = Math.max(0, Math.round(ms / 60000)), d = Math.floor(m / 1440), h = Math.floor((m % 1440) / 60), mm = m % 60;
  return d ? `${d} d ${h} h` : h ? `${h} h ${String(mm).padStart(2, "0")}` : `${mm} min`;
};

export function Today({ s, issues, actions }: { s: TripState; issues: Issue[]; actions: Actions }) {
  const { t } = useTranslation();
  const [preview, setPreview] = useState<ISODate | "">("");
  const [tick, setTick] = useState(Date.now());
  useEffect(() => { const i = setInterval(() => setTick(Date.now()), 30_000); return () => clearInterval(i); }, []);

  const dates = dateRange(s.trip.start, s.trip.end);
  const firstTz = dayPath(s, s.trip.start)[0]?.tz ?? s.trip.homeTz;
  const previewTz = preview ? dayPath(s, preview)[0]?.tz ?? firstTz : firstTz;
  const now = preview ? zonedInstant(preview, "08:00", previewTz) : new Date(tick);
  const localDate = wallClock(previewTz, now).date;
  const homeDate = wallClock(s.trip.homeTz, now).date;

  const selector = (
    <label className="block text-[12.5px] text-soft mt-6">{t("today.preview")}
      <select className="field" value={preview} onChange={(e) => setPreview(e.target.value)}>
        <option value="">{t("today.previewNone")}</option>
        {dates.map((d, i) => <option key={d} value={d}>{t("day.label", { n: i + 1 })} · {fmtDay(d)}</option>)}
      </select>
    </label>
  );

  if (localDate < s.trip.start) {
    const days = nightsBetween(homeDate, s.trip.start);
    const urgent = s.bookings.filter((b) => b.status === "urgent");
    const errors = issues.filter((i) => i.level === "error");
    return (
      <div className="flex flex-col gap-4">
        <div className="rounded-[14px] p-4" style={{ background: "var(--id-dark)", color: "var(--on-dark)" }}>
          <p className="text-[34px] font-bold leading-none" style={{ color: "var(--id-accent)" }}>{days}</p>
          <p className="text-white font-semibold mt-1">{t("today.countdown", { count: days })}</p>
          <p className="text-[12.5px] mt-1">{fmtDayLong(s.trip.start)}</p>
        </div>
        <div>
          <SectionLabel>{t("today.urgent")}</SectionLabel>
          {urgent.length + errors.length === 0 && <p className="text-sm text-soft">{t("today.nothingUrgent")}</p>}
          <div className="flex flex-col gap-1.5">
            {errors.map((x, i) => <button key={i} className="text-left" onClick={actions.openVerification}><IssueBox issue={x} /></button>)}
            {urgent.map((b) => (
              <button key={b.id} onClick={() => actions.openBooking(b.id)} className="text-left">
                <Card className="px-3.5 py-2.5 min-h-11"><span className="font-semibold" style={{ color: "var(--warn-ink)" }}>{t("status.urgent")}</span>, <T v={b.title} /></Card>
              </button>
            ))}
          </div>
        </div>
        <DayBlock s={s} date={s.trip.start} title={t("today.firstNight")} actions={actions} />
        {selector}
      </div>
    );
  }

  if (localDate > s.trip.end) return <div><p className="text-soft text-center py-10">{t("today.tripOver")}</p>{selector}</div>;

  const today = localDate;
  const next = upcoming(s, now);
  const nextToday = next.find((x) => x.date === today);
  const path = dayPath(s, today);
  // Where we are: before the next timed slot of today; if today has no timed slot at all, progress
  // through the day is unknown, so assume the start of the day; if all timed slots are past, its end.
  const timedToday = (s.days[today]?.slots ?? []).some((x) => x.start);
  const here = (nextToday ? placeBefore(s, today, nextToday.slot.id) : timedToday ? path[path.length - 1] : path[0]) ?? path[0];
  const untimedTransport = (s.days[today]?.slots ?? []).some((x) => x.type === "transport" && !x.start);
  const tz = here?.tz ?? previewTz;
  const local = wallClock(tz, now).time, home = wallClock(s.trip.homeTz, now).time;
  const verdict = callHomeVerdict(home);
  const nextDep = next.find((x) => x.slot.type === "transport");
  const todayIssues = issues.filter((i) => i.date === today);

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-[14px] p-4" style={{ background: "var(--id-dark)", color: "var(--on-dark)" }}>
        <p className="text-[11px] font-bold tracking-[0.2em] uppercase" style={{ color: "var(--id-accent)" }}>
          {t("today.dayOf", { n: dates.indexOf(today) + 1, total: dates.length })} · {fmtDay(today)}
        </p>
        <p className="text-white text-[17px] font-semibold mt-1 tabular-nums">
          {t("time.nowLine", { local, place: here ? short(here.name.text) : tzCity(tz), home, homeName: s.trip.origin.text, diff: fmtDiff(diffMin(tz, s.trip.homeTz, now)) })}
        </p>
        <p className="text-[12.5px] mt-2"><strong className="text-white">{t("time.callHome")}</strong>, {t(`time.call_${verdict}`, { time: home, homeName: s.trip.origin.text })}</p>
        <p className="text-[11px] opacity-80">{t("time.callNote")}</p>
      </div>

      {todayIssues.length > 0 && <div className="flex flex-col gap-1.5">{todayIssues.map((x, i) => <IssueBox key={i} issue={x} />)}</div>}

      <div className="grid grid-cols-2 gap-2.5">
        <NextCard label={t("today.next")} item={nextToday ?? next[0]} now={now} onOpen={actions.goToDay} />
        <NextCard label={t("today.nextDeparture")} item={nextDep} now={now} onOpen={actions.goToDay} />
      </div>
      {untimedTransport && <p className="text-[12px] -mt-2" style={{ color: "var(--warn-ink)" }}>⚠ {t("today.untimedTransport")}</p>}

      <DayBlock s={s} date={today} title={t("today.tonight")} actions={actions} />
      <p className="text-[12px] text-soft">{t("today.later")}</p>
      {selector}
    </div>
  );
}

function NextCard({ label, item, now, onOpen }: { label: string; item?: ReturnType<typeof upcoming>[number]; now: Date; onOpen: (d: ISODate) => void }) {
  const { t } = useTranslation();
  return (
    <button disabled={!item} onClick={() => item && onOpen(item.date)} className="text-left">
      <Card className="p-3 h-full">
        <p className="text-[11px] font-bold tracking-[0.12em] uppercase text-label">{label}</p>
        {item ? (
          <>
            <p className="font-semibold text-[14px] mt-1"><T v={item.slot.title} /></p>
            <p className="text-[12px] text-soft">{fmtDay(item.date)} · {item.slot.start} · {t("today.in", { d: until(item.at.getTime() - now.getTime()) })}</p>
          </>
        ) : <p className="text-[12.5px] text-soft mt-1">{t("today.noTime")}</p>}
      </Card>
    </button>
  );
}

/** Tonight's accommodation and the day's transport, with references. */
function DayBlock({ s, date, title, actions }: { s: TripState; date: ISODate; title: string; actions: Actions }) {
  const { t } = useTranslation();
  const lodging = lodgingForNight(s, date);
  const transports = dayTransports(s, date);
  return (
    <>
      <div>
        <SectionLabel>{title}</SectionLabel>
        {lodging ? <LodgingCard b={lodging} actions={actions} /> : <p className="text-sm text-soft">{t("today.noLodging")}</p>}
      </div>
      <div>
        <SectionLabel>{t("today.transports")}</SectionLabel>
        {transports.length === 0 && <p className="text-sm text-soft">{t("today.noTransport")}</p>}
        <div className="flex flex-col gap-2">
          {transports.map(({ slot, booking }) => (
            <Card key={slot.id} className="p-3.5">
              <div className="flex justify-between gap-2"><strong><T v={slot.title} /></strong><span className="text-xs text-soft tabular-nums">{slot.start}{slot.end ? ` → ${slot.end}` : ""}</span></div>
              <TransportZone s={s} date={date} slot={slot} />
              {booking && (
                <button onClick={() => actions.openBooking(booking.id)} className="text-[12.5px] font-semibold min-h-8"
                  style={{ color: booking.status === "confirmed" ? "var(--ok)" : booking.status === "urgent" ? "var(--warn-ink)" : "var(--todo)" }}>
                  {t(`status.${booking.status}`)}{booking.ref ? ` · ${t("today.ref")} ${booking.ref}` : ""} ›
                </button>
              )}
            </Card>
          ))}
        </div>
      </div>
    </>
  );
}

function LodgingCard({ b, actions }: { b: Booking; actions: Actions }) {
  const { t } = useTranslation();
  const unknown = t("common.unknown");
  return (
    <Card className="p-3.5" topColor={b.status === "confirmed" ? "var(--ok)" : "var(--todo)"}>
      <button onClick={() => actions.openBooking(b.id)} className="text-left w-full">
        <strong className="text-[15px]"><T v={b.title} /></strong>
        <dl className="mt-1 text-[13px] grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5">
          <dt className="text-soft">{t("today.address")}</dt><dd>{b.addr || unknown}</dd>
          <dt className="text-soft">{t("today.phone")}</dt><dd>{b.tel || unknown}</dd>
          <dt className="text-soft">{t("today.ref")}</dt><dd>{b.ref || unknown}</dd>
        </dl>
        <p className="text-[13px] mt-1">{t("today.checkIn", { t: b.checkIn || "?" })}</p>
      </button>
      <div className="flex gap-2 mt-2">
        {b.tel && <a href={`tel:${b.tel.replace(/\s/g, "")}`} className="min-h-11 px-4 rounded-[10px] font-semibold inline-flex items-center" style={{ background: "var(--id-dark)", color: "var(--on-color)" }}>{t("today.call")}</a>}
        {b.addr && <a href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(b.addr)}`} target="_blank" rel="noopener noreferrer" className="min-h-11 px-4 rounded-[10px] font-semibold inline-flex items-center border border-line">{t("today.directions")}</a>}
      </div>
    </Card>
  );
}
