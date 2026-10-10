import { describe, expect, it } from "vitest";
import { homeZoneFor, zoneForCity } from "./zones";

const Z = ["Europe/Paris", "Europe/Zurich", "America/Sao_Paulo", "America/Argentina/Buenos_Aires", "Asia/Tokyo"];

describe("home zone from the departure city", () => {
  it("matches the city of an IANA zone, ignoring case, accents and the country", () => {
    expect(zoneForCity("Paris", Z)).toBe("Europe/Paris");
    expect(zoneForCity("zürich, Suisse", Z)).toBe("Europe/Zurich");
    expect(zoneForCity("São Paulo", Z)).toBe("America/Sao_Paulo");
    expect(zoneForCity("Buenos Aires", Z)).toBe("America/Argentina/Buenos_Aires");
  });
  it("finds nothing for a city that names no zone, and then uses the phone's zone", () => {
    expect(zoneForCity("Lyon", Z)).toBeUndefined();
    expect(zoneForCity("", Z)).toBeUndefined();
    expect(homeZoneFor("Lyon", Z, "Europe/Paris")).toBe("Europe/Paris");
    expect(homeZoneFor("Tokyo", Z, "Europe/Paris")).toBe("Asia/Tokyo");
  });
});
