import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { bookingMap, isLocked, type Issue } from "../engine/rules";
import { dateRange } from "../lib/dates";
import type { ISODate, Slot, TripState } from "../model/types";
import { fmtDay } from "./format";
import { IssueBox, Sources, T, TypePill, typeVars } from "./primitives";
import { dayRegions, regionColor } from "./regions";
import { DayZone, TransportZone, TzNotice } from "./zone";

export interface ItineraryActions {
  editSlot: (date: ISODate, slotId: string | null) => void;
  openBooking: (id: string) => void;
}

export function Itinerary({ s, issues, focus, actions }: { s: TripState; issues: Issue[]; focus?: ISODate; actions: ItineraryActions }) {
  useEffect(() => {
    if (focus) document.getElementById("day-" + focus)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [focus]);
  return (
    <div className="flex flex-col gap-3">
      {dateRange(s.trip.start, s.trip.end).map((d, i) => (
        <DayCard key={d} s={s} date={d} n={i + 1} issues={issues} actions={actions} />
      ))}
    </div>
  );
}

function DayCard({ s, date, n, issues, actions }: { s: TripState; date: ISODate; n: number; issues: Issue[]; actions: ItineraryActions }) {
  const { t } = useTranslation();
  const day = s.days[date] ?? { date, slots: [] };
  const regions = dayRegions(s, date);
  const regionNames = regions.map((r) => s.trip.regions.find((x) => x.id === r)?.name ?? r);
  const places = [...new Set(day.slots.map((x) => x.placeId).filter(Boolean) as string[])]
    .map((p) => s.places[p]?.name.text.split(",")[0]);
  const dayIssues = issues.filter((x) => x.date === date && !x.slotId);
  const heavy = day.slots.filter((x) => x.heavy).length;
  return (
    <section id={"day-" + date} className="bg-card rounded-[14px] border border-line overflow-hidden scroll-mt-28"
      style={{ borderTop: `3px solid ${regions.length ? regionColor(regions[regions.length - 1]) : "var(--line)"}` }}>
      <header className="px-4 pt-3 pb-2">
        <div className="flex justify-between items-baseline gap-2">
          <p className="text-[11px] font-bold tracking-[0.16em] uppercase text-label">{t("day.label", { n })} · {fmtDay(date)}</p>
          <span className="text-[11px] text-soft">{t("day.heavy", { count: heavy })}</span>
        </div>
        <p className="text-[15px] font-semibold mt-0.5">{places.slice(0, 3).join(" · ")}</p>
        <p className="text-xs text-soft">{regionNames.join(" → ")}</p>
        <DayZone s={s} date={date} />
      </header>
      <TzNotice s={s} date={date} />
      {day.note && (
        <p className="mx-4 mb-2 text-[12.5px] px-3 py-1.5 rounded-md" style={{ background: "var(--warn-bg)", borderLeft: "3px solid var(--warn)" }}>
          <T v={day.note} />
        </p>
      )}
      <div className="flex flex-col gap-1 px-4 mb-1">{dayIssues.map((x, k) => <IssueBox key={k} issue={x} />)}</div>
      {day.slots.map((x) => <SlotRow key={x.id} s={s} date={date} x={x} issues={issues} actions={actions} />)}
      <button onClick={() => actions.editSlot(date, null)}
        className="min-h-11 mx-4 mt-2 mb-3 w-[calc(100%-2rem)] rounded-[10px] border border-dashed border-line text-soft text-sm">
        + {t("day.addActivity")}
      </button>
    </section>
  );
}

function SlotRow({ s, date, x, issues, actions }: { s: TripState; date: ISODate; x: Slot; issues: Issue[]; actions: ItineraryActions }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const bm = bookingMap(s);
  const bk = x.bookingId ? bm[x.bookingId] : undefined;
  const locked = isLocked(x.bookingId, bm);
  const own = issues.filter((y) => y.slotId === x.id);
  const c = typeVars(x.type);
  const srcIds = [...new Set([...(x.sources ?? []), ...(bk?.sources ?? [])])];
  return (
    <div className="border-t border-line">
      <button aria-expanded={open} onClick={() => setOpen(!open)}
        className="w-full text-left grid grid-cols-[48px_14px_1fr_14px] gap-2 px-4 py-2 min-h-11">
        <span className="text-xs text-soft tabular-nums pt-0.5">{x.start || t("day.noTime")}{x.end && <><br />{x.end}</>}</span>
        <span className="mt-1.5 w-2 h-2 rounded-full" style={{ background: c.dot }} />
        <span>
          <span className="flex flex-wrap items-center gap-1.5 font-semibold text-[13.5px]">
            <TypePill type={x.type} />
            <T v={x.title} />
            {locked && <span title={t("day.lockedHint")} aria-label={t("day.lockedHint")}>🔴</span>}
          </span>
          {x.detail && <span className="block text-[12.5px] text-soft"><T v={x.detail} /></span>}
          {x.who && <span className="block text-[12.5px] text-soft">{t("day.who", { who: x.who })}</span>}
          <TransportZone s={s} date={date} slot={x} />
        </span>
        <span className="text-soft text-xs pt-1" aria-hidden>{open ? "▴" : "▾"}</span>
      </button>
      {bk && (
        <button onClick={() => actions.openBooking(bk.id)} className="block text-left ml-[86px] mr-4 -mt-1 mb-1 text-[12.5px] min-h-8"
          style={{ color: bk.status === "confirmed" ? "var(--ok)" : bk.status === "urgent" ? "var(--warn-ink)" : "var(--todo)" }}>
          {t(`status.${bk.status}`)}, <T v={bk.title} />{bk.ref ? ` · ${bk.ref}` : ""} ›
        </button>
      )}
      <div className="flex flex-col gap-1 px-4">{own.map((y, k) => <IssueBox key={k} issue={y} className="ml-[70px] mb-1" />)}</div>
      {open && (
        <div className="ml-[86px] mr-4 mb-3 p-3 rounded-lg text-[13px] flex flex-col gap-1.5" style={{ background: c.bg, borderLeft: `3px solid ${c.dot}` }}>
          {x.desc && <p><T v={x.desc} /></p>}
          {x.price?.note && <p><strong>{t("day.price")}</strong> <T v={x.price.note} /></p>}
          {x.tips?.map((tip, k) => <p key={k} className="pl-3" style={{ borderLeft: `2px solid ${c.dot}` }}><T v={tip} /></p>)}
          {bk?.note && <p className="text-soft"><T v={bk.note} /></p>}
          {bk?.links && <p className="flex flex-wrap gap-3">{bk.links.map((l) => <a key={l.url} href={l.url} target="_blank" rel="noopener noreferrer" className="font-semibold underline">{l.label}</a>)}</p>}
          <Sources ids={srcIds} sources={s.sources} />
          <div><button onClick={() => actions.editSlot(date, x.id)} className="mt-1 min-h-11 px-4 rounded-[10px] border border-line font-semibold bg-card">{t("common.edit")}</button></div>
        </div>
      )}
    </div>
  );
}
