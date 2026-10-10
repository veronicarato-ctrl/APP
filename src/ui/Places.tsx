import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ZONES } from "../lib/zones";
import { deletePlace, savePlace } from "../db/repo";
import { parseCoords } from "../lib/coords";
import { newId } from "../lib/ids";
import type { Place, TripState } from "../model/types";
import { Button, Card, Field, Sheet, T } from "./primitives";
import { regionColor } from "./regions";

export function PlacesPage({ s }: { s: TripState }) {
  const { t } = useTranslation();
  const [edit, setEdit] = useState<Place | null | undefined>();
  const list = Object.values(s.places).sort((a, b) => a.name.text.localeCompare(b.name.text));
  return (
    <>
      <Button className="mb-3" onClick={() => setEdit(null)}>+ {t("places.add")}</Button>
      {list.length === 0 && <p className="text-sm text-soft">{t("places.none")}</p>}
      <div className="flex flex-col gap-2">
        {list.map((p) => (
          <button key={p.id} className="text-left" onClick={() => setEdit(p)}>
            <Card className="px-3.5 py-2.5 flex gap-3 items-center">
              <span className="w-3 h-3 rounded-full shrink-0" style={{ background: regionColor(p.region) }} />
              <span className="flex-1">
                <strong><T v={p.name} /></strong>
                <span className="block text-[12px] text-soft tabular-nums">
                  {typeof p.lat === "number" ? `${p.lat}, ${p.lng}` : t("map.noCoords")} · {p.tz}{p.approx ? ` · ${t("map.approx")}` : ""}
                </span>
              </span>
            </Card>
          </button>
        ))}
      </div>
      {edit !== undefined && <PlaceEditor s={s} place={edit} onClose={() => setEdit(undefined)} />}
    </>
  );
}

export function PlaceEditor({ s, place, onClose, onSaved }: { s: TripState; place: Place | null; onClose: () => void; onSaved?: (p: Place) => void }) {
  const { t } = useTranslation();
  const lang = s.trip.name.lang;
  const [name, setName] = useState(place?.name.text ?? "");
  const [coords, setCoords] = useState(typeof place?.lat === "number" ? `${place.lat}, ${place.lng}` : "");
  const [tz, setTz] = useState(place?.tz ?? Object.values(s.places).at(-1)?.tz ?? s.trip.destTz ?? s.trip.homeTz);
  const [region, setRegion] = useState(place?.region ?? "");
  const [approx, setApprox] = useState(place?.approx ?? false);
  const [err, setErr] = useState<string>();
  const parsed = coords.trim() ? parseCoords(coords) : undefined;
  const bad = !!coords.trim() && !parsed;

  const save = async () => {
    const p: Place = {
      ...(place ?? { id: newId(), key: "" }),
      name: { text: name.trim(), lang: place?.name.lang ?? lang },
      lat: parsed?.lat, lng: parsed?.lng, tz, region: region.trim(), approx,
    } as Place;
    if (!parsed) { delete p.lat; delete p.lng; }
    await savePlace(s.trip.id, p);
    onSaved?.(p);
    onClose();
  };
  const remove = async () => {
    if (!place || !window.confirm(t("places.confirmDelete", { name: place.name.text }))) return;
    try { await deletePlace(s.trip.id, place.id); onClose(); }
    catch (e) { setErr(e instanceof Error && e.message === "placeInUse" ? t("places.inUse") : String(e)); }
  };

  return (
    <Sheet title={place ? t("places.editTitle") : t("places.newTitle")} onClose={onClose}>
      <Field label={t("places.name")}><input className="field" value={name} onChange={(e) => setName(e.target.value)} /></Field>
      <Field label={t("places.coords")}>
        <input className="field" value={coords} onChange={(e) => setCoords(e.target.value)} placeholder="-3.1303, -60.0234" />
      </Field>
      <p className="text-[12px] -mt-2 mb-3" style={{ color: bad ? "var(--error-ink)" : "var(--soft)" }}>{bad ? t("places.coordsInvalid") : t("places.coordsHelp")}</p>
      <Field label={t("places.tz")}>
        <select className="field" value={tz} onChange={(e) => setTz(e.target.value)}>{ZONES.map((z) => <option key={z}>{z}</option>)}</select>
      </Field>
      <Field label={t("places.region")}>
        <input className="field" list="regions" value={region} onChange={(e) => setRegion(e.target.value)} />
        <datalist id="regions">{s.trip.regions.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}</datalist>
      </Field>
      <label className="flex items-center gap-2 min-h-11 text-sm">
        <input type="checkbox" className="w-5 h-5" checked={approx} onChange={(e) => setApprox(e.target.checked)} />{t("places.approx")}
      </label>
      {err && <p role="alert" className="text-[13px] my-2 px-3 py-2 rounded-md" style={{ background: "var(--error-bg)", color: "var(--error-ink)" }}>{err}</p>}
      <div className="flex justify-between gap-2 mt-4">
        {place ? <Button variant="danger" onClick={remove}>{t("common.delete")}</Button> : <span />}
        <div className="flex gap-2">
          <Button variant="ghost" onClick={onClose}>{t("common.cancel")}</Button>
          <Button disabled={!name.trim() || bad} onClick={save}>{t("common.save")}</Button>
        </div>
      </div>
    </Sheet>
  );
}
