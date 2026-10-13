// Checks that a proposed place exists before the travellers see it. With a Google Places key on the server,
// each place is looked up by name, city and country; otherwise it is shown as unverified with a search link.
import { searchUrl, type ProposedPlace, type Verification } from "../src/assistant/protocol";
import type { Env } from "./providers";

const norm = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

/** True when the directory's name and the proposed one share their significant words. */
export function sameName(a: string, b: string): boolean {
  const x = norm(a), y = norm(b);
  return !!x && !!y && (x.includes(y) || y.includes(x));
}

export async function verifyPlace(p: ProposedPlace, env: Env, now: Date, f: typeof fetch = fetch): Promise<Verification> {
  const unverified: Verification = { status: "unverified", searchUrl: searchUrl(p) };
  if (!env.GOOGLE_PLACES_API_KEY) return unverified;
  try {
    const res = await f("https://places.googleapis.com/v1/places:searchText", {
      method: "POST",
      headers: {
        "Content-Type": "application/json", "X-Goog-Api-Key": env.GOOGLE_PLACES_API_KEY,
        "X-Goog-FieldMask": "places.displayName,places.formattedAddress,places.location,places.websiteUri,places.googleMapsUri",
      },
      body: JSON.stringify({ textQuery: `${p.name}, ${p.city}, ${p.country}`, maxResultCount: 1 }),
    });
    if (!res.ok) return unverified;
    const j = (await res.json()) as { places?: { displayName?: { text?: string }; formattedAddress?: string; location?: { latitude?: number; longitude?: number }; websiteUri?: string; googleMapsUri?: string }[] };
    const hit = j.places?.[0];
    const url = hit?.websiteUri ?? hit?.googleMapsUri;
    if (!hit || !url || !sameName(hit.displayName?.text ?? "", p.name)) return unverified;
    return {
      status: "verified", url, source: "Google Places", checkedAt: now.toISOString().slice(0, 10),
      ...(hit.formattedAddress ? { address: hit.formattedAddress } : {}),
      ...(typeof hit.location?.latitude === "number" && typeof hit.location?.longitude === "number" ? { lat: hit.location.latitude, lng: hit.location.longitude } : {}),
    };
  } catch {
    return unverified;
  }
}
