import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { TILE_ATTRIBUTION, TILE_MAX_ZOOM, TILE_URL } from "../config";
import { dayPath, dayTimeSplit, route } from "../engine/derive";
import { diffOnDate, fmtDiff, fmtUtc, tzOffsetMin } from "../lib/time";
import type { ISODate, Place, Slot, SlotType, TripState } from "../model/types";
import { fmtDay } from "./format";
import { Card, SectionLabel, T } from "./primitives";

export type Layer = "lodging" | "transport" | "activities" | "restaurants" | "ai";
const LAYERS: Layer[] = ["lodging", "transport", "activities", "restaurants", "ai"];

export const layerOf = (x: Slot): Layer =>
  x.origin === "ai" ? "ai" : x.type === "lodging" ? "lodging" : x.type === "transport" ? "transport" : x.type === "meal" ? "restaurants" : "activities";

const hours = (min: number) => `${Math.floor(min / 60)} h${min % 60 ? " " + String(min % 60).padStart(2, "0") : ""}`;
const directions = (p: Place) => ({
  google: `https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lng}`,
  apple: `https://maps.apple.com/?daddr=${p.lat},${p.lng}`,
});

export function MapView({ s, date, setDate, goToDay }: { s: TripState; date?: ISODate; setDate: (d?: ISODate) => void; goToDay: (d: ISODate) => void }) {
  const { t } = useTranslation();
  const [layers, setLayers] = useState<Set<Layer>>(new Set(["lodging", "transport", "activities", "restaurants"]));
  const [selected, setSelected] = useState<string>();
  const [tilesFailed, setTilesFailed] = useState(false);
  const [online, setOnline] = useState(typeof navigator === "undefined" ? true : navigator.onLine);
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const overlay = useRef<L.LayerGroup | null>(null);

  const full = useMemo(() => route(s), [s]);
  const numberOf = (id: string) => full.stops.find((x) => x.place.id === id)?.n;

  // Slots per place, limited to the selected day, and the places visible with the active layers.
  const slotsAt = useMemo(() => {
    const m = new Map<string, { date: ISODate; slot: Slot }[]>();
    for (const [d, day] of Object.entries(s.days)) {
      if (date && d !== date) continue;
      for (const slot of day.slots) if (slot.placeId) m.set(slot.placeId, [...(m.get(slot.placeId) ?? []), { date: d, slot }]);
    }
    return m;
  }, [s, date]);
  const visible = useMemo(() => {
    const ids = date ? dayPath(s, date).map((p) => p.id) : full.stops.map((x) => x.place.id);
    return ids.filter((id) => (slotsAt.get(id) ?? []).some((x) => layers.has(layerOf(x.slot))) || (date && !slotsAt.has(id)));
  }, [s, date, full, slotsAt, layers]);
  const segments = date ? route(s, date).segments : full.segments;

  useEffect(() => {
    const on = () => setOnline(true), off = () => setOnline(false);
    window.addEventListener("online", on); window.addEventListener("offline", off);
    return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); };
  }, []);

  // Create the map once.
  useEffect(() => {
    if (!el.current || map.current) return;
    const m = L.map(el.current, { zoomControl: true, attributionControl: true });
    const tiles = L.tileLayer(TILE_URL, { maxZoom: TILE_MAX_ZOOM, attribution: TILE_ATTRIBUTION });
    tiles.on("tileerror", () => setTilesFailed(true));
    tiles.on("tileload", () => setTilesFailed(false));
    tiles.addTo(m);
    overlay.current = L.layerGroup().addTo(m);
    map.current = m;
    return () => { m.remove(); map.current = null; };
  }, []);

  // Redraw route and markers when data, day or layers change.
  useEffect(() => {
    const m = map.current, g = overlay.current;
    if (!m || !g) return;
    g.clearLayers();
    // Leaflet writes the colour as an SVG attribute, so resolve the region token to its value first.
    const css = getComputedStyle(document.documentElement);
    for (const seg of segments) {
      const color = css.getPropertyValue(`--region-${seg.to.region}-on-light`).trim() || css.getPropertyValue("--soft").trim();
      L.polyline([[seg.from.lat, seg.from.lng], [seg.to.lat, seg.to.lng]], { color, weight: 4, opacity: 0.9, dashArray: seg.to.approx || seg.from.approx ? "6 6" : undefined }).addTo(g);
    }
    const pts: L.LatLngExpression[] = [];
    for (const id of visible) {
      const p = s.places[id];
      pts.push([p.lat, p.lng]);
      const icon = L.divIcon({
        className: "",
        html: `<span class="stop${selected === id ? " stop-sel" : ""}" style="background:var(--region-${p.region}-on-light)">${numberOf(id) ?? ""}</span>`,
        iconSize: [30, 30], iconAnchor: [15, 15],
      });
      L.marker([p.lat, p.lng], { icon, title: p.name.text, keyboard: true }).on("click", () => setSelected(id)).addTo(g);
    }
    if (pts.length) m.fitBounds(L.latLngBounds(pts), { padding: [36, 36], maxZoom: date ? 11 : 7 });
  }, [s, date, visible, selected]);

  const sel = selected ? s.places[selected] : undefined;
  const split = date ? dayTimeSplit(s, date) : undefined;
  const toggle = (l: Layer) => setLayers((x) => { const n = new Set(x); if (n.has(l)) n.delete(l); else n.add(l); return n; });
  const offline = !online || tilesFailed;

  return (
    <div>
      <div className="flex flex-wrap gap-2 items-center mb-3">
        <button onClick={() => setDate(undefined)} className="min-h-11 px-3 rounded-full text-[13px] font-semibold border border-line"
          style={!date ? { background: "var(--id-dark)", color: "var(--on-color)" } : undefined}>{t("map.allDays")}</button>
        {date && <span className="text-sm font-semibold">{fmtDay(date)}</span>}
      </div>

      <div role="group" aria-label={t("map.layers")} className="flex flex-wrap gap-1.5 mb-3">
        {LAYERS.map((l) => {
          const on = layers.has(l), disabled = l === "ai";
          return (
            <button key={l} disabled={disabled} aria-pressed={on} onClick={() => toggle(l)} title={disabled ? t("map.aiLater") : undefined}
              className="min-h-9 px-3 rounded-full text-[12.5px] font-semibold border disabled:opacity-45"
              style={on ? { background: "var(--id-dark)", color: "var(--on-color)", borderColor: "var(--id-dark)" } : { borderColor: "var(--line)" }}>
              {t(`map.${l}`)}
            </button>
          );
        })}
      </div>

      {offline && <p role="status" className="mb-2 text-[12.5px] px-3 py-1.5 rounded-md" style={{ background: "var(--warn-bg)", borderLeft: "3px solid var(--warn)", color: "var(--warn-ink)" }}>{t("map.offline")}</p>}

      <div ref={el} className="w-full h-[52vh] min-h-72 rounded-[14px] border border-line overflow-hidden z-0" style={{ background: "var(--other-bg)" }} />

      {split && (
        <p className="mt-2 text-[12.5px] text-soft">
          {split.travel + split.onSite ? t("map.split", { travel: hours(split.travel), onSite: hours(split.onSite) }) : t("map.noTimes")}
          {split.untimed > 0 && " " + t("map.untimed", { count: split.untimed })}
        </p>
      )}

      {sel && <PlaceCard s={s} place={sel} n={numberOf(sel.id)} date={date} items={slotsAt.get(sel.id) ?? []} goToDay={goToDay} />}

      <div className="mt-5">
        <SectionLabel>{t("map.places")}</SectionLabel>
        <div className="flex flex-col gap-2">
          {visible.map((id) => {
            const p = s.places[id];
            return (
              <button key={id} onClick={() => setSelected(id)} className="text-left">
                <Card className="px-3.5 py-2.5 flex gap-3 items-center">
                  <span className="stop" style={{ background: `var(--region-${p.region}-on-light)` }}>{numberOf(id)}</span>
                  <span className="flex-1">
                    <strong><T v={p.name} /></strong>
                    <span className="block text-[12px] text-soft tabular-nums">{p.lat}, {p.lng}{p.approx ? ` · ${t("map.approx")}` : ""}</span>
                  </span>
                </Card>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function PlaceCard({ s, place, n, date, items, goToDay }: { s: TripState; place: Place; n?: number; date?: ISODate; items: { date: ISODate; slot: Slot }[]; goToDay: (d: ISODate) => void }) {
  const { t } = useTranslation();
  const d = date ?? items[0]?.date ?? s.trip.start;
  const off = tzOffsetMin(place.tz, new Date(d + "T12:00:00Z"));
  const dir = directions(place);
  const typeColor = (ty: SlotType) => `var(--${ty}-tx)`;
  return (
    <Card className="mt-3 p-3.5" topColor={`var(--region-${place.region}-on-light)`}>
      <div className="flex gap-3 items-start">
        <span className="stop" style={{ background: `var(--region-${place.region}-on-light)` }}>{n}</span>
        <div className="flex-1">
          <h3 className="font-bold"><T v={place.name} /></h3>
          <p className="text-[12px] text-soft">{t("time.dayZone", { utc: fmtUtc(off), diff: fmtDiff(diffOnDate(place.tz, s.trip.homeTz, d)), homeName: s.trip.origin.text })}</p>
          {place.approx && <p className="text-[12px] font-semibold" style={{ color: "var(--warn-ink)" }}>⚠ {t("map.approx")}</p>}
        </div>
      </div>
      <div className="mt-2 flex flex-col">
        {items.map(({ date: dd, slot }) => {
          const b = slot.bookingId ? s.bookings.find((x) => x.id === slot.bookingId) : undefined;
          return (
            <button key={slot.id} onClick={() => goToDay(dd)} className="text-left py-2 border-t border-line min-h-11">
              <span className="text-[11px] font-bold text-soft">{fmtDay(dd)}{slot.start ? ` · ${slot.start}` : ""}</span>
              <span className="block text-[13.5px] font-semibold" style={{ color: typeColor(slot.type) }}><T v={slot.title} /></span>
              {b && <span className="block text-[12px]" style={{ color: b.status === "confirmed" ? "var(--ok)" : b.status === "urgent" ? "var(--warn-ink)" : "var(--todo)" }}>{t(`status.${b.status}`)}{b.ref ? ` · ${b.ref}` : ""}</span>}
              {slot.price?.note && <span className="block text-[12px] text-soft"><T v={slot.price.note} /></span>}
            </button>
          );
        })}
      </div>
      <div className="flex flex-wrap gap-2 mt-2">
        <a href={dir.google} target="_blank" rel="noopener noreferrer" className="min-h-11 px-4 rounded-[10px] font-semibold inline-flex items-center" style={{ background: "var(--id-dark)", color: "var(--on-color)" }}>{t("map.directions")}, {t("map.google")}</a>
        <a href={dir.apple} target="_blank" rel="noopener noreferrer" className="min-h-11 px-4 rounded-[10px] font-semibold inline-flex items-center border border-line">{t("map.apple")}</a>
      </div>
    </Card>
  );
}
