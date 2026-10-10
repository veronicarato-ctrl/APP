/** Reads coordinates from "lat, lng" or from a Google Maps / Apple Maps link. Returns undefined if none. */
export function parseCoords(input: string): { lat: number; lng: number } | undefined {
  const s = decodeURIComponent(input.trim());
  const patterns = [
    /!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/, // Google place data
    /@(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/, // Google map centre
    /[?&](?:q|query|ll|daddr|destination)=(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/, // query parameters
    /^(-?\d+(?:\.\d+)?)\s*[,;\s]\s*(-?\d+(?:\.\d+)?)$/, // plain "lat, lng"
  ];
  for (const re of patterns) {
    const m = s.match(re);
    if (!m) continue;
    const lat = Number(m[1]), lng = Number(m[2]);
    if (Math.abs(lat) <= 90 && Math.abs(lng) <= 180) return { lat, lng };
  }
  return undefined;
}
