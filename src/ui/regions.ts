import type { ISODate, TripState } from "../model/types";

/** Regions touched by a day, in order of first appearance, derived from its slots' places. */
export function dayRegions(s: TripState, d: ISODate): string[] {
  const out: string[] = [];
  for (const x of s.days[d]?.slots ?? []) {
    const r = x.placeId ? s.places[x.placeId]?.region : undefined;
    if (r && !out.includes(r)) out.push(r);
  }
  return out;
}

/** Region colour from Trip.theme, falling back to the trip accent when the trip has no regions. */
export const regionColor = (r: string, on: "dark" | "light" = "light") =>
  `var(--region-${r || "none"}-on-${on}, var(${on === "light" ? "--id-accent-on-light" : "--id-accent"}))`;

/** Background for a day: one region colour, or a diagonal split on a transition day. */
export function dayBackground(regions: string[], on: "dark" | "light" = "dark") {
  if (regions.length === 0) return "var(--id-accent)";
  if (regions.length === 1) return regionColor(regions[0], on);
  return `linear-gradient(135deg, ${regionColor(regions[0], on)} 50%, ${regionColor(regions[regions.length - 1], on)} 50%)`;
}
