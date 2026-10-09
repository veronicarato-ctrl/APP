import { useState } from "react";
import { useTranslation } from "react-i18next";
import { bookingMap, isLocked } from "../engine/rules";
import { dateRange } from "../lib/dates";
import { newId } from "../lib/ids";
import { LANG_NAMES } from "../i18n";
import type { Booking, BookingStatus, ISODate, Lang, Slot, SlotType, Text, TripState } from "../model/types";
import { fmtDay } from "./format";
import { Button, Field, Sheet } from "./primitives";

const TYPES: SlotType[] = ["transport", "lodging", "meal", "culture", "nature", "show", "rest", "ritual"];
const STATUSES: BookingStatus[] = ["todo", "urgent", "confirmed"];

/** Updates the text of a Text field, keeping its language unless the user changes it. */
const setText = (v: Text | undefined, text: string, lang: Lang): Text | undefined => (text ? { text, lang: v?.lang ?? lang } : undefined);

export function SlotEditor({ s, date, id, onSave, onDelete, onClose }: {
  s: TripState; date: ISODate; id: string | null;
  onSave: (slot: Slot, toDate: ISODate) => void; onDelete: () => void; onClose: () => void;
}) {
  const { t } = useTranslation();
  const orig: Slot = (id && s.days[date].slots.find((x) => x.id === id)) || {
    id: newId(), key: "", type: "culture", title: { text: "", lang: "en" }, start: "", end: "", heavy: false, who: "", origin: "user",
  };
  const [x, setX] = useState<Slot>(orig);
  const [lang, setLang] = useState<Lang>(orig.title.lang);
  const [toDate, setToDate] = useState(date);
  const locked = !!id && isLocked(orig.bookingId, bookingMap(s));
  const upd = (p: Partial<Slot>) => setX({ ...x, ...p });

  const save = () => {
    if (toDate !== date && !window.confirm(t("slotEditor.confirmMove", { title: x.title.text, from: fmtDay(date), to: fmtDay(toDate) }))) return;
    const withLang = (v?: Text) => (v ? { ...v, lang } : v);
    onSave({ ...x, title: withLang(x.title)!, detail: withLang(x.detail) }, toDate);
  };

  return (
    <Sheet title={id ? t("slotEditor.titleEdit") : t("slotEditor.titleNew")} subtitle={fmtDay(date)} onClose={onClose}>
      {locked && <p className="mb-3 text-[12.5px] px-3 py-2 rounded-md" style={{ background: "var(--error-bg)", color: "var(--error-ink)", borderLeft: "3px solid var(--error)" }}>{t("slotEditor.locked")}</p>}
      <fieldset disabled={locked} className="border-0 p-0 m-0">
        <Field label={t("slotEditor.title")}><input className="field" lang={lang} value={x.title.text} onChange={(e) => upd({ title: { text: e.target.value, lang } })} /></Field>
        <Field label={t("slotEditor.detail")}><input className="field" lang={lang} value={x.detail?.text ?? ""} onChange={(e) => upd({ detail: setText(x.detail, e.target.value, lang) })} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t("slotEditor.start")}><input className="field" type="time" value={x.start} onChange={(e) => upd({ start: e.target.value })} /></Field>
          <Field label={t("slotEditor.end")}><input className="field" type="time" value={x.end} onChange={(e) => upd({ end: e.target.value })} /></Field>
          <Field label={t("slotEditor.type")}>
            <select className="field" value={x.type} onChange={(e) => upd({ type: e.target.value as SlotType })}>
              {TYPES.map((k) => <option key={k} value={k}>{t(`type.${k}`)}</option>)}
            </select>
          </Field>
          <Field label={t("slotEditor.day")}>
            <select className="field" value={toDate} onChange={(e) => setToDate(e.target.value)}>
              {dateRange(s.trip.start, s.trip.end).map((d) => <option key={d} value={d}>{fmtDay(d)}</option>)}
            </select>
          </Field>
          <Field label={t("slotEditor.place")}>
            <select className="field" value={x.placeId ?? ""} onChange={(e) => upd({ placeId: e.target.value || undefined })}>
              <option value="">{t("common.none")}</option>
              {Object.values(s.places).map((p) => <option key={p.id} value={p.id}>{p.name.text}</option>)}
            </select>
          </Field>
          <Field label={t("slotEditor.booking")}>
            <select className="field" value={x.bookingId ?? ""} onChange={(e) => upd({ bookingId: e.target.value || undefined })}>
              <option value="">{t("common.none")}</option>
              {s.bookings.map((b) => <option key={b.id} value={b.id}>{b.title.text}</option>)}
            </select>
          </Field>
        </div>
        <Field label={t("slotEditor.who")}><input className="field" value={x.who} placeholder={t("slotEditor.whoPlaceholder")} onChange={(e) => upd({ who: e.target.value })} /></Field>
        <Field label={t("slotEditor.textLang")}>
          <select className="field" value={lang} onChange={(e) => setLang(e.target.value as Lang)}>
            {Object.entries(LANG_NAMES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </Field>
        <label className="flex items-center gap-2 min-h-11 text-sm">
          <input type="checkbox" className="w-5 h-5" checked={x.heavy} onChange={(e) => upd({ heavy: e.target.checked })} />
          {t("slotEditor.heavy")}
        </label>
      </fieldset>
      <div className="flex justify-between gap-2 mt-4">
        {id && !locked
          ? <Button variant="danger" onClick={() => window.confirm(t("slotEditor.confirmDelete", { title: orig.title.text })) && onDelete()}>{t("common.delete")}</Button>
          : <span />}
        <div className="flex gap-2">
          <Button variant="ghost" onClick={onClose}>{t("common.cancel")}</Button>
          <Button disabled={locked || !x.title.text} onClick={save}>{t("common.save")}</Button>
        </div>
      </div>
    </Sheet>
  );
}

export function BookingEditor({ s, id, onSave, onClose }: { s: TripState; id: string; onSave: (b: Booking) => void; onClose: () => void }) {
  const { t } = useTranslation();
  const orig = s.bookings.find((b) => b.id === id)!;
  const [b, setB] = useState<Booking>(orig);
  const upd = (p: Partial<Booking>) => setB({ ...b, ...p });
  const when = orig.from ? `${fmtDay(orig.from)} → ${fmtDay(orig.to!)}` : orig.date ? fmtDay(orig.date) : "";

  const save = () => {
    if (orig.status === "confirmed" && b.status !== "confirmed" && !window.confirm(t("bookingEditor.confirmUnlock"))) return;
    if (b.status === "confirmed" && orig.status !== "confirmed" && !b.ref && !window.confirm(t("bookingEditor.confirmNoRef"))) return;
    onSave(b);
  };

  return (
    <Sheet title={<span lang={orig.title.lang}>{orig.title.text}</span>} subtitle={`${t(`kind.${orig.kind}`)}${when ? " · " + when : ""}`} onClose={onClose}>
      <Field label={t("bookingEditor.status")}>
        <select className="field" value={b.status} onChange={(e) => upd({ status: e.target.value as BookingStatus })}>
          {STATUSES.map((k) => <option key={k} value={k}>{t(`status.${k}`)}</option>)}
        </select>
      </Field>
      <Field label={t("bookingEditor.name")}><input className="field" lang={b.title.lang} value={b.title.text} onChange={(e) => upd({ title: { ...b.title, text: e.target.value } })} /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label={t("bookingEditor.ref")}><input className="field" value={b.ref} onChange={(e) => upd({ ref: e.target.value })} /></Field>
        <Field label={t("bookingEditor.tel")}><input className="field" type="tel" value={b.tel} onChange={(e) => upd({ tel: e.target.value })} /></Field>
      </div>
      <Field label={t("bookingEditor.addr")}><input className="field" value={b.addr} onChange={(e) => upd({ addr: e.target.value })} /></Field>
      {b.kind === "lodging" && (
        <div className="grid grid-cols-2 gap-3">
          <Field label={t("bookingEditor.checkIn")}><input className="field" type="time" value={b.checkIn} onChange={(e) => upd({ checkIn: e.target.value })} /></Field>
          <Field label={t("bookingEditor.checkOut")}><input className="field" type="time" value={b.checkOut} onChange={(e) => upd({ checkOut: e.target.value })} /></Field>
        </div>
      )}
      <Field label={t("bookingEditor.note")}>
        <textarea className="field" rows={3} lang={b.note?.lang} value={b.note?.text ?? ""} onChange={(e) => upd({ note: setText(b.note, e.target.value, "en") })} />
      </Field>
      <div className="flex justify-end gap-2 mt-2">
        <Button variant="ghost" onClick={onClose}>{t("common.cancel")}</Button>
        <Button onClick={save}>{t("common.save")}</Button>
      </div>
    </Sheet>
  );
}
