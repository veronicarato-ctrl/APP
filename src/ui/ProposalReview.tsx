import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { applyDraft, applyOps, newIssues } from "../assistant/apply";
import type { Op, Proposal, TripDraft, Verification } from "../assistant/protocol";
import { applyAssistantChanges } from "../db/repo";
import { bookingMap, isLocked } from "../engine/rules";
import type { TripState } from "../model/types";
import { fmtDay, fmtMoney, fmtPrice } from "./format";
import { Button, Card, IssueBox, SectionLabel, TypePill } from "./primitives";

const DRAFT_FIELDS: (keyof TripDraft)[] = ["name", "start", "end", "adults", "children", "budget", "homeCurrency", "destCurrency", "modes"];
// Dates are changed in the trip settings, which refuse to drop days that still hold activities.
const APPLICABLE: (keyof TripDraft)[] = ["name", "adults", "children", "budget", "homeCurrency", "destCurrency", "modes"];

function slotOf(s: TripState | undefined, id: string) {
  if (!s) return undefined;
  for (const [date, d] of Object.entries(s.days)) { const x = d.slots.find((y) => y.id === id); if (x) return { date, x }; }
  return undefined;
}

/** Why an operation cannot be applied, before the travellers even try. */
function blocked(s: TripState | undefined, op: Op): "locked" | "notFound" | undefined {
  if (!s || (op.op !== "update" && op.op !== "delete")) return undefined;
  const f = slotOf(s, op.id);
  if (!f) return "notFound";
  return isLocked(f.x.bookingId, bookingMap(s)) ? "locked" : undefined;
}

/** Deletions and moves to another day start unticked (SPEC section 9.4); blocked operations cannot be ticked. */
const startsTicked = (s: TripState | undefined, op: Op) =>
  !blocked(s, op) && op.op !== "delete" && !(op.op === "update" && op.date && op.date !== slotOf(s, op.id)?.date);

export function ProposalReview({ s, proposal, onDone }: { s?: TripState; proposal: Proposal & { dropped?: number }; onDone?: (applied: boolean) => void }) {
  const { t } = useTranslation();
  const review = !!s && !!onDone;
  const [ticked, setTicked] = useState<Set<number>>(() => new Set(proposal.ops.map((op, i) => (startsTicked(s, op) ? i : -1)).filter((i) => i >= 0)));
  const draftKeys = DRAFT_FIELDS.filter((k) => proposal.trip?.[k] !== undefined);
  const [draftTicked, setDraftTicked] = useState<Set<keyof TripDraft>>(() => new Set(draftKeys.filter((k) => APPLICABLE.includes(k))));
  const [busy, setBusy] = useState(false);
  const placeName = (ref?: string) => {
    if (!ref) return undefined;
    const p = proposal.ops.find((o): o is Extract<Op, { op: "addPlace" }> => o.op === "addPlace" && o.place.ref === ref);
    return p ? p.place.name : s?.places[ref]?.name.text;
  };
  const preview = useMemo(() => (s ? applyOps(s, proposal, [...ticked], s.trip.name.lang) : undefined), [s, proposal, ticked]);
  const issues = useMemo(() => (s && preview ? newIssues(s, preview.state) : []), [s, preview]);
  const toggle = (i: number) => setTicked((x) => { const n = new Set(x); if (n.has(i)) n.delete(i); else n.add(i); return n; });

  const apply = async () => {
    if (!s || !preview) return;
    setBusy(true);
    const fields = [...draftTicked].filter((k) => APPLICABLE.includes(k));
    const state = fields.length && proposal.trip ? { ...preview.state, trip: applyDraft(preview.state.trip, proposal.trip, fields) } : preview.state;
    const log = [...preview.log, ...(fields.length ? [`Assistant: trip settings (${fields.join(", ")})`] : [])];
    await applyAssistantChanges(s, state, log);
    setBusy(false);
    onDone!(true);
  };

  const check = (v?: Verification) => v && (v.status === "verified"
    ? <span className="block text-[12px]" style={{ color: "var(--ok)" }}>✓ {t("assistant.verified", { source: v.source, date: fmtDay(v.checkedAt) })} · <a href={v.url} target="_blank" rel="noopener noreferrer" className="underline font-semibold">{t("assistant.open")}</a></span>
    : <span className="block text-[12px]" style={{ color: "var(--warn-ink)" }}>{t("assistant.unverified")} · <a href={v.searchUrl} target="_blank" rel="noopener noreferrer" className="underline font-semibold">{t("assistant.search")}</a></span>);

  const line = (op: Op) => {
    switch (op.op) {
      case "addPlace": return <>{t("assistant.opPlace")} <strong>{op.place.name}</strong>, {op.place.city}, {op.place.country}{check(proposal.checks?.[op.place.ref])}</>;
      case "addBooking": {
        const v = op.booking.place ? proposal.checks?.[op.booking.place] : undefined;
        return <>{t("assistant.opBooking")} <strong>{op.booking.title}</strong>{op.booking.from ? ` · ${fmtDay(op.booking.from)} → ${fmtDay(op.booking.to ?? op.booking.from)}` : op.booking.date ? ` · ${fmtDay(op.booking.date)}` : ""}{op.booking.price && fmtPrice(op.booking.price, t) ? ` · ${fmtPrice(op.booking.price, t)}` : ""}{check(v)}</>;
      }
      case "add": return <><span className="text-soft">{fmtDay(op.date)}{op.slot.start ? ` · ${op.slot.start}` : ""}{op.slot.end ? `–${op.slot.end}` : ""}</span><span className="flex flex-wrap items-center gap-1.5 mt-0.5"><TypePill type={op.slot.type} /><strong>{op.slot.title}</strong></span>
        {placeName(op.slot.place) && <span className="block text-[12px] text-soft">{placeName(op.slot.place)}</span>}
        {op.slot.desc && <span className="block text-[12.5px]">{op.slot.desc}</span>}
        {op.slot.price && fmtPrice(op.slot.price, t) && <span className="block text-[12px] text-soft">{fmtPrice(op.slot.price, t)}</span>}
        {op.why && <span className="block text-[12px] text-soft italic">{op.why}</span>}</>;
      case "update": {
        const f = slotOf(s, op.id);
        const moves = op.date && f && op.date !== f.date;
        return <>{t("assistant.opUpdate")} <strong>{f?.x.title.text ?? op.id}</strong>{Object.keys(op.patch).length ? ` · ${Object.keys(op.patch).join(", ")}` : ""}
          {moves && <span className="block text-[12px] font-semibold" style={{ color: "var(--warn-ink)" }}>{t("assistant.moves", { from: fmtDay(f!.date), to: fmtDay(op.date!) })}</span>}
          {op.why && <span className="block text-[12px] text-soft italic">{op.why}</span>}</>;
      }
      case "delete": return <>{t("assistant.opDelete")} <strong>{slotOf(s, op.id)?.x.title.text ?? op.id}</strong>{op.reason && <span className="block text-[12px] text-soft italic">{op.reason}</span>}</>;
      case "daySummary": return <>{t("assistant.opSummary", { date: fmtDay(op.date) })} <em>{op.text}</em></>;
    }
  };

  return (
    <div className="flex flex-col gap-3">
      {proposal.summary && <Card className="p-3.5 text-[13.5px] whitespace-pre-line"><p className="text-[11px] font-bold tracking-[0.16em] uppercase text-label mb-1">{t("assistant.proposedByAi")}</p>{proposal.summary}</Card>}
      {proposal.questions.length > 0 && (
        <div>
          <SectionLabel>{t("assistant.questions")}</SectionLabel>
          <ul className="list-disc pl-5 text-[13.5px]">{proposal.questions.map((q, i) => <li key={i}>{q}</li>)}</ul>
        </div>
      )}
      {draftKeys.length > 0 && (
        <div>
          <SectionLabel>{t("assistant.deduced")}</SectionLabel>
          <Card>
            {draftKeys.map((k) => {
              const v = proposal.trip![k];
              const shown = k === "budget" ? fmtMoney(Number(v), proposal.trip!.homeCurrency ?? s?.trip.homeCurrency ?? "EUR") : k === "modes" ? Object.entries(v as object).map(([m, n]) => `${t(`modes.${m}`)} ${n}`).join(", ") : Array.isArray(v) ? v.join(", ") : k === "start" || k === "end" ? fmtDay(String(v)) : String(v);
              const can = review && APPLICABLE.includes(k);
              return (
                <label key={k} className="flex gap-3 items-start px-3.5 py-2 border-t border-line first:border-t-0 text-[13.5px] min-h-11">
                  {review && <input type="checkbox" className="w-5 h-5 mt-0.5" disabled={!can} checked={can && draftTicked.has(k)}
                    onChange={() => setDraftTicked((x) => { const n = new Set(x); if (n.has(k)) n.delete(k); else n.add(k); return n; })} />}
                  <span><span className="text-soft">{t(`assistant.field_${k}`)}</span> {shown}{review && !can && <span className="block text-[12px] text-soft">{t("assistant.datesInSettings")}</span>}</span>
                </label>
              );
            })}
          </Card>
        </div>
      )}
      {proposal.ops.length > 0 && (
        <div>
          <SectionLabel>{t("assistant.changes", { count: proposal.ops.length })}</SectionLabel>
          <Card>
            {proposal.ops.map((op, i) => {
              const why = review ? blocked(s, op) : undefined;
              return (
                <label key={i} className="flex gap-3 items-start px-3.5 py-2.5 border-t border-line first:border-t-0 text-[13.5px] min-h-11">
                  {review && <input type="checkbox" className="w-5 h-5 mt-0.5 shrink-0" disabled={!!why} checked={!why && ticked.has(i)} onChange={() => toggle(i)} />}
                  <span className={why ? "opacity-60" : ""}>{line(op)}{why && <span className="block text-[12px] font-semibold" style={{ color: "var(--error-ink)" }}>{t(`assistant.blocked_${why}`)}</span>}</span>
                </label>
              );
            })}
          </Card>
        </div>
      )}
      {!!proposal.dropped && <p className="text-[12px] text-soft">{t("assistant.dropped", { count: proposal.dropped })}</p>}
      {review && issues.length > 0 && (
        <div>
          <SectionLabel>{t("assistant.newIssues")}</SectionLabel>
          <div className="flex flex-col gap-1.5">{issues.map((x, k) => <IssueBox key={k} issue={x} />)}</div>
        </div>
      )}
      {proposal.meta && <p className="text-[11.5px] text-soft">{t("assistant.meta", { model: proposal.meta.model, s: Math.round(proposal.meta.ms / 1000), tin: proposal.meta.inputTokens, tout: proposal.meta.outputTokens })}</p>}
      {review && (
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => onDone!(false)}>{t("assistant.discard")}</Button>
          <Button disabled={busy || (ticked.size === 0 && draftTicked.size === 0)} onClick={apply}>{t("assistant.apply", { count: ticked.size + draftTicked.size })}</Button>
        </div>
      )}
    </div>
  );
}
