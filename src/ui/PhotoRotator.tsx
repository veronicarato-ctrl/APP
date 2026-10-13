import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import type { WelcomePhoto } from "../data/welcomePhotos";

const reducedMotion = () => typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/**
 * Photos that cross-fade every few seconds, with a pause button (WCAG 2.2.2) and a single still photo
 * when the phone asks for reduced motion. Each photo shows its place, author and licence.
 */
export function PhotoRotator({ photos, intervalMs = 8000 }: { photos: WelcomePhoto[]; intervalMs?: number }) {
  const { t } = useTranslation();
  const [i, setI] = useState(() => Math.floor(Math.random() * photos.length));
  const [paused, setPaused] = useState(false);
  const still = reducedMotion();
  useEffect(() => {
    if (paused || still || photos.length < 2) return;
    const id = setInterval(() => setI((x) => (x + 1) % photos.length), intervalMs);
    return () => clearInterval(id);
  }, [paused, still, photos.length, intervalMs]);
  const p = photos[i];
  return (
    <>
      {photos.map((x, n) => (
        <img key={x.src} src={x.src} alt="" aria-hidden loading={n === i ? "eager" : "lazy"}
          className="absolute inset-0 w-full h-full object-cover transition-opacity duration-[1500ms]"
          style={{ opacity: n === i ? 1 : 0 }} />
      ))}
      <div className="absolute z-10 bottom-2 left-4 right-4 flex items-center justify-between gap-2 text-[11px]" style={{ color: "var(--on-dark)" }}>
        <a href={p.sourceUrl} target="_blank" rel="noopener noreferrer" className="underline-offset-2 hover:underline truncate">
          {t("photos.credit", { place: p.place, country: p.country, author: p.author, licence: p.licence })}
        </a>
        {photos.length > 1 && !still && (
          <button type="button" onClick={() => setPaused(!paused)} aria-pressed={paused}
            className="min-h-8 px-2.5 rounded-full border shrink-0" style={{ borderColor: "var(--watermark)" }}>
            {paused ? t("photos.play") : t("photos.pause")}
          </button>
        )}
      </div>
    </>
  );
}
