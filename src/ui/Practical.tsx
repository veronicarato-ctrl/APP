import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { Issue } from "../engine/rules";
import { dateRange, nightsBetween } from "../lib/dates";
import type { ISODate, TripState } from "../model/types";
import { fmtDay, fmtDayLong } from "./format";
import { Button, Card, IssueBox, SectionLabel, Sources, T } from "./primitives";

export type PracticalPage = "lodging" | "transport" | "bookings" | "prepare" | "verification";
const LATER: Record<string, number> = { budget: 6, safety: 6, emergency: 6, translate: 6 };

interface Actions {
  openBooking: (id: string) => void;
  goToDay: (d: ISODate) => void;
  toggleCheck: (id: string) => void;
  addCheck: (text: string) => void;
}

export function Practical({ s, issues, page, setPage, actions }: { s: TripState; issues: Issue[]; page: PracticalPage | null; setPage: (p: PracticalPage | null) => void; actions: Actions }) {
  const { t } = useTranslation();
  if (page) {
    return (
      <div>
        <button onClick={() => setPage(null)} className="min-h-11 text-sm font-semibold text-label mb-1">‹ {t("practical.back")}</button>
        <h2 className="text-xl font-bold mb-3">{t(`practical.${page}`)}</h2>
        {page === "lodging" && <Lodging s={s} openBooking={actions.openBooking} />}
        {page === "transport" && <Transport s={s} openBooking={actions.openBooking} />}
        {page === "bookings" && <Bookings s={s} openBooking={actions.openBooking} />}
        {page === "prepare" && <Prepare s={s} />}
        {page === "verification" && <Verification s={s} issues={issues} actions={actions} />}
      </div>
    );
  }
  const lodgings = s.bookings.filter((b) => b.kind === "lodging");
  const nights = lodgings.reduce((a, h) => a + (h.from && h.to ? nightsBetween(h.from, h.to) : 0), 0);
  const legs = Object.values(s.days).flatMap((d) => d.slots).filter((x) => x.type === "transport").length;
  const count = (st: string) => s.bookings.filter((b) => b.status === st).length;
  const errors = issues.filter((i) => i.level === "error").length;
  const tiles: [string, string, boolean?][] = [
    ["lodging", t("practical.lodgingSummary", { count: lodgings.length, nights })],
    ["transport", t("practical.transportSummary", { count: legs })],
    ["bookings", t("practical.bookingsSummary", { urgent: count("urgent"), todo: count("todo"), confirmed: count("confirmed") }), count("urgent") > 0],
    ["budget", ""],
    ["prepare", t("practical.prepareSummary", { count: s.prep.length })],
    ["safety", ""],
    ["emergency", ""],
    ["translate", ""],
    ["verification", t("practical.verificationSummary", { errors, warnings: issues.length - errors }), errors > 0],
  ];
  return (
    <div>
      <Search s={s} actions={actions} />
      <div className="grid grid-cols-2 gap-2.5">
        {tiles.map(([k, summary, alert]) => {
          const later = LATER[k];
          return (
            <button key={k} disabled={!!later} onClick={() => setPage(k as PracticalPage)}
              className="text-left rounded-[14px] p-3.5 min-h-24 flex flex-col justify-between disabled:opacity-55"
              style={{ background: "var(--id-dark)", color: "var(--on-dark-title)" }}>
              <span className="text-[15px] font-bold">{t(`practical.${k}`)}</span>
              <span className="text-[12px] mt-2" style={{ color: alert ? "var(--id-accent)" : "var(--on-dark)" }}>
                {later ? t("common.comingIn", { phase: later }) : summary}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Search({ s, actions }: { s: TripState; actions: Actions }) {
  const { t } = useTranslation();
  const [q, setQ] = useState("");
  const n = q.trim().toLowerCase();
  const hit = (...v: (string | undefined)[]) => v.some((x) => x?.toLowerCase().includes(n));
  const bookings = n ? s.bookings.filter((b) => hit(b.title.text, b.ref, b.addr, b.tel, b.note?.text)) : [];
  const slots = n ? dateRange(s.trip.start, s.trip.end).flatMap((d) => (s.days[d]?.slots ?? []).filter((x) => hit(x.title.text, x.detail?.text)).map((x) => ({ d, x }))) : [];
  const places = n ? Object.values(s.places).filter((p) => hit(p.name.text)) : [];
  return (
    <div className="mb-4">
      <input className="field" type="search" placeholder={t("common.search")} value={q} onChange={(e) => setQ(e.target.value)} aria-label={t("common.search")} />
      {n && (
        <Card className="mt-2 divide-y divide-[var(--line)]">
          {bookings.length + slots.length + places.length === 0 && <p className="p-3 text-sm text-soft">{t("common.noResults")}</p>}
          {bookings.map((b) => (
            <button key={b.id} onClick={() => actions.openBooking(b.id)} className="block w-full text-left px-3 py-2 min-h-11">
              <span className="text-[11px] uppercase tracking-wide text-label font-bold">{t(`kind.${b.kind}`)}</span><br />
              <T v={b.title} />{b.ref && <span className="text-soft"> · {b.ref}</span>}
            </button>
          ))}
          {slots.map(({ d, x }) => (
            <button key={x.id} onClick={() => actions.goToDay(d)} className="block w-full text-left px-3 py-2 min-h-11">
              <span className="text-[11px] uppercase tracking-wide text-label font-bold">{fmtDay(d)}</span><br /><T v={x.title} />
            </button>
          ))}
          {places.map((p) => (
            <a key={p.id} href={`https://www.google.com/maps/search/?api=1&query=${p.lat},${p.lng}`} target="_blank" rel="noopener noreferrer" className="block px-3 py-2 min-h-11">
              <T v={p.name} /><span className="text-soft text-xs block">{p.lat}, {p.lng}</span>
            </a>
          ))}
        </Card>
      )}
    </div>
  );
}

const statusColor = (st: string) => (st === "confirmed" ? "var(--ok)" : st === "urgent" ? "var(--urgent)" : "var(--todo)");

function StatusPill({ status }: { status: string }) {
  const { t } = useTranslation();
  return (
    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap"
      style={{ background: statusColor(status), color: status === "urgent" ? "var(--urgent-ink)" : "var(--on-color)" }}>{t(`status.${status}`)}</span>
  );
}

function Lodging({ s, openBooking }: { s: TripState; openBooking: (id: string) => void }) {
  const { t } = useTranslation();
  const hs = s.bookings.filter((b) => b.kind === "lodging" && b.from && b.to).sort((a, b) => (a.from! < b.from! ? -1 : 1));
  const nights = (b: (typeof hs)[number]) => nightsBetween(b.from!, b.to!);
  const v = (x: string) => x || t("common.unknown");
  return (
    <>
      <div className="rounded-[14px] p-3 mb-3 overflow-x-auto" style={{ background: "var(--id-dark)", color: "var(--on-dark)" }}>
        <table className="w-full text-[13px]">
          <thead><tr className="text-left text-[11px] uppercase tracking-wide"><th className="p-1.5">{t("lodging.dates")}</th><th className="p-1.5">{t("lodging.stay")}</th><th className="p-1.5">{t("lodging.nights")}</th></tr></thead>
          <tbody>
            {hs.map((h) => (
              <tr key={h.id} className="border-t border-white/10">
                <td className="p-1.5 whitespace-nowrap" style={{ color: "var(--id-accent)" }}>{fmtDay(h.from!)} → {fmtDay(h.to!)}</td>
                <td className="p-1.5 text-white"><T v={h.title} /></td><td className="p-1.5 text-center">{nights(h)}</td>
              </tr>
            ))}
            <tr className="border-t border-white/10 font-semibold text-white"><td className="p-1.5" colSpan={2}>{t("lodging.total")}</td><td className="p-1.5 text-center">{hs.reduce((a, h) => a + nights(h), 0)}</td></tr>
          </tbody>
        </table>
      </div>
      <div className="flex flex-col gap-2.5">
        {hs.map((h) => (
          <button key={h.id} onClick={() => openBooking(h.id)} className="text-left">
            <Card className="p-3.5" topColor={statusColor(h.status)}>
              <div className="flex justify-between gap-2 items-start mb-1"><strong><T v={h.title} /></strong><StatusPill status={h.status} /></div>
              <p className="text-[12.5px] text-soft">{t("lodging.address", { v: v(h.addr) })}</p>
              <p className="text-[12.5px] text-soft">{t("lodging.phone", { v: v(h.tel) })}</p>
              <p className="text-[12.5px] text-soft">{t("lodging.ref", { v: v(h.ref) })}</p>
              <p className="text-[12.5px] text-soft">{t("lodging.times", { ci: h.checkIn || "?", co: h.checkOut || "?", from: fmtDay(h.from!), to: fmtDay(h.to!) })}</p>
            </Card>
          </button>
        ))}
      </div>
    </>
  );
}

function Transport({ s, openBooking }: { s: TripState; openBooking: (id: string) => void }) {
  const { t } = useTranslation();
  const rows = dateRange(s.trip.start, s.trip.end).flatMap((d) => (s.days[d]?.slots ?? []).filter((x) => x.type === "transport").map((x) => ({ d, x, b: x.bookingId ? s.bookings.find((y) => y.id === x.bookingId) : undefined })));
  return (
    <>
      <p className="text-sm text-soft mb-3">{t("transport.intro")}</p>
      <div className="flex flex-col gap-2.5">
        {rows.map(({ d, x, b }) => (
          <Card key={x.id} className="p-3.5">
            <div className="flex justify-between gap-2"><strong><T v={x.title} /></strong><span className="text-xs text-soft whitespace-nowrap">{fmtDay(d)}</span></div>
            <p className="text-[12.5px] text-soft">{x.detail ? <T v={x.detail} /> : t("transport.noDuration")}{x.start ? `, ${x.start}${x.end ? " → " + x.end : ""}` : ""}</p>
            {b ? (
              <>
                <button onClick={() => openBooking(b.id)} className="text-[12.5px] font-semibold min-h-8" style={{ color: statusColor(b.status) === "var(--urgent)" ? "var(--warn-ink)" : statusColor(b.status) }}>
                  {t(`status.${b.status}`)}{b.ref ? t("transport.ref", { ref: b.ref }) : ""} ›
                </button>
                {b.note && <p className="text-[12.5px] text-soft"><T v={b.note} /></p>}
                {b.links && <p className="flex gap-3">{b.links.map((l) => <a key={l.url} href={l.url} target="_blank" rel="noopener noreferrer" className="font-semibold underline text-[13px]">{l.label}</a>)}</p>}
                <Sources ids={b.sources} sources={s.sources} />
              </>
            ) : <p className="text-[12.5px] text-soft">{t("transport.noBooking")}</p>}
          </Card>
        ))}
      </div>
    </>
  );
}

function Bookings({ s, openBooking }: { s: TripState; openBooking: (id: string) => void }) {
  const { t } = useTranslation();
  const done = s.bookings.filter((b) => b.status === "confirmed").length, total = s.bookings.length;
  return (
    <>
      <Card className="p-3.5 mb-4">
        <div className="flex justify-between mb-2 text-sm"><strong>{t("bookings.progress", { done, total })}</strong><span>{Math.round((done / total) * 100)}%</span></div>
        <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--line)" }}><div className="h-full" style={{ width: `${(done / total) * 100}%`, background: "var(--ok)" }} /></div>
      </Card>
      {(["urgent", "todo", "confirmed"] as const).map((st) => {
        const list = s.bookings.filter((b) => b.status === st);
        if (!list.length) return null;
        return (
          <div key={st} className="mb-5">
            <SectionLabel>{t(`status.${st}`)}</SectionLabel>
            <div className="flex flex-col gap-2.5">
              {list.map((b) => (
                <Card key={b.id} className="p-3.5" topColor={statusColor(b.status)}>
                  <button onClick={() => openBooking(b.id)} className="block w-full text-left">
                    <div className="flex justify-between gap-2"><strong>{b.status === "confirmed" ? "🔴 " : ""}<T v={b.title} /></strong><span className="text-xs text-soft">{t(`kind.${b.kind}`)}</span></div>
                    <p className="text-[12.5px] text-soft">{b.from ? `${fmtDay(b.from)} → ${fmtDay(b.to!)}` : b.date ? fmtDay(b.date) : t("bookings.noDate")}{b.ref ? ` · ${b.ref}` : ""}</p>
                    {b.noRoute && <p className="text-[12.5px] font-semibold" style={{ color: "var(--error-ink)" }}>{t("bookings.noRoute")}</p>}
                    {b.note && <p className="text-[12.5px] text-soft"><T v={b.note} /></p>}
                  </button>
                  {b.links && <p className="flex gap-3 mt-1">{b.links.map((l) => <a key={l.url} href={l.url} target="_blank" rel="noopener noreferrer" className="font-semibold underline text-[13px]">{l.label}</a>)}</p>}
                  <Sources ids={b.sources} sources={s.sources} />
                </Card>
              ))}
            </div>
          </div>
        );
      })}
    </>
  );
}

function Prepare({ s }: { s: TripState }) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-3">
      {s.trip.prepNote && <p className="text-sm text-soft"><T v={s.trip.prepNote} /></p>}
      {s.prep.map((sec) => (
        <Card key={sec.id} className="p-3.5">
          <h3 className="font-bold mb-1.5"><T v={sec.title} /></h3>
          {sec.items.map((it, k) => (
            <div key={k} className={`py-2 text-[13.5px] ${k ? "border-t border-line" : ""}`}><T v={it.text} /><Sources ids={it.sources} sources={s.sources} /></div>
          ))}
        </Card>
      ))}
      <p className="text-xs text-soft">{t("prepare.disclaimer")}</p>
      <Card className="p-3.5">
        <h3 className="font-bold mb-1.5">{t("prepare.allSources")}</h3>
        {Object.values(s.sources).map((x) => (
          <a key={x.id} href={x.url} target="_blank" rel="noopener noreferrer" className="block py-1 text-[13px] underline">{x.title} <span className="text-soft">({t("common.checked", { date: x.checkedAt })})</span></a>
        ))}
      </Card>
    </div>
  );
}

function Verification({ s, issues, actions }: { s: TripState; issues: Issue[]; actions: Actions }) {
  const { t } = useTranslation();
  const [task, setTask] = useState("");
  const pending = s.bookings.filter((b) => b.status !== "confirmed").sort((a, b) => (a.status === "urgent" ? 0 : 1) - (b.status === "urgent" ? 0 : 1));
  return (
    <>
      <SectionLabel>{t("verification.problems")}</SectionLabel>
      {issues.length === 0 ? <p className="text-sm text-soft mb-4">{t("verification.none")}</p> : (
        <div className="flex flex-col gap-1.5 mb-5">
          {issues.map((x, i) => (
            <button key={i} onClick={() => (x.date ? actions.goToDay(x.date) : x.bookingId && actions.openBooking(x.bookingId))} className="text-left">
              {x.date && <span className="text-[11px] font-bold text-soft">{fmtDayLong(x.date)}</span>}
              <IssueBox issue={x} />
            </button>
          ))}
        </div>
      )}
      <SectionLabel>{t("verification.pending")}</SectionLabel>
      <div className="flex flex-col gap-2 mb-5">
        {pending.map((b) => (
          <button key={b.id} onClick={() => actions.openBooking(b.id)} className="text-left">
            <Card className="px-3.5 py-2.5 min-h-11"><span className="font-semibold" style={{ color: b.status === "urgent" ? "var(--warn-ink)" : "var(--todo)" }}>{t(`status.${b.status}`)}</span>, <T v={b.title} /></Card>
          </button>
        ))}
      </div>
      <SectionLabel>{t("verification.tasks")}</SectionLabel>
      <div className="flex flex-col gap-2">
        {s.checks.map((c) => (
          <label key={c.id} className="flex gap-3 items-center bg-card border border-line rounded-[14px] px-3.5 py-2.5 min-h-11 cursor-pointer">
            <input type="checkbox" className="w-5 h-5 shrink-0" checked={c.done} onChange={() => actions.toggleCheck(c.id)} />
            <span className={c.done ? "line-through text-soft" : ""}><T v={c.text} /></span>
          </label>
        ))}
        <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); if (task) { actions.addCheck(task); setTask(""); } }}>
          <input className="field !mt-0 flex-1" value={task} onChange={(e) => setTask(e.target.value)} placeholder={t("verification.newTask")} />
          <Button type="submit" disabled={!task}>{t("common.add")}</Button>
        </form>
      </div>
      {s.log.length > 0 && (
        <div className="mt-6">
          <SectionLabel>{t("verification.history")}</SectionLabel>
          {s.log.slice(0, 30).map((l) => <p key={l.id} className="text-[12.5px] text-soft py-0.5">{new Date(l.at).toLocaleString("en-GB")} · {l.message}</p>)}
        </div>
      )}
    </>
  );
}
