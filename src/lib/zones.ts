// Time zones come from the IANA database shipped with the browser, never from a hand-written list.

export const ZONES: string[] = (() => {
  try { return Intl.supportedValuesOf("timeZone"); } catch { return ["UTC"]; }
})();

export const deviceZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";

const norm = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().replace(/[^a-z]+/g, " ").trim();

/**
 * IANA zone named after the departure city ("Paris" → Europe/Paris, "São Paulo" → America/Sao_Paulo).
 * Undefined when no zone carries that city's name: the caller then falls back to the phone's zone.
 */
export function zoneForCity(city: string, zones: string[] = ZONES): string | undefined {
  const c = norm(city.split(",")[0] ?? "");
  if (!c) return undefined;
  return zones.find((z) => norm((z.split("/").pop() ?? "").replace(/_/g, " ")) === c);
}

/** Home zone deduced from the departure city, else the phone's own zone. */
export const homeZoneFor = (city: string, zones: string[] = ZONES, device = deviceZone()) => zoneForCity(city, zones) ?? device;
