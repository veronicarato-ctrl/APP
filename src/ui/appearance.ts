import { useEffect, useState } from "react";
import type { TripTheme } from "../model/types";

export type Appearance = "system" | "light" | "dark";
const KEY = "appearance"; // per-device convenience only, never trip data

export function applyTripTheme(t: TripTheme) {
  const r = document.documentElement.style;
  r.setProperty("--id-dark", t.dark);
  r.setProperty("--id-darker", t.darker);
  r.setProperty("--id-accent", t.accent);
  r.setProperty("--id-accent-on-light", t.accentOnLight);
  for (const [id, c] of Object.entries(t.regions)) {
    r.setProperty(`--region-${id}-on-dark`, c.onDark);
    r.setProperty(`--region-${id}-on-light`, c.onLight);
  }
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", t.dark);
}

const read = (): Appearance => {
  try {
    return (localStorage.getItem(KEY) as Appearance) || "system";
  } catch {
    return "system";
  }
};

export function useAppearance() {
  const [mode, setMode] = useState<Appearance>(read);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      const dark = mode === "dark" || (mode === "system" && mq.matches);
      document.documentElement.dataset.theme = dark ? "dark" : "light";
    };
    apply();
    mq.addEventListener("change", apply);
    try {
      localStorage.setItem(KEY, mode);
    } catch {
      /* storage unavailable, keep the in-memory choice */
    }
    return () => mq.removeEventListener("change", apply);
  }, [mode]);
  return [mode, setMode] as const;
}
