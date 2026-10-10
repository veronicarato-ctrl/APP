import { describe, expect, it } from "vitest";
import { parseCoords } from "./coords";

describe("parseCoords", () => {
  it("reads plain coordinates", () => expect(parseCoords("-3.1303, -60.0234")).toEqual({ lat: -3.1303, lng: -60.0234 }));
  it("reads a Google Maps link", () => {
    expect(parseCoords("https://www.google.com/maps/place/Teatro+Amazonas/@-3.1303,-60.0234,17z")).toEqual({ lat: -3.1303, lng: -60.0234 });
    expect(parseCoords("https://www.google.com/maps/place/X/data=!3d-2.7974!4d-40.5124")).toEqual({ lat: -2.7974, lng: -40.5124 });
  });
  it("reads an Apple Maps link", () => expect(parseCoords("https://maps.apple.com/?ll=46.2044,6.1432&q=Geneva")).toEqual({ lat: 46.2044, lng: 6.1432 }));
  it("rejects text and out-of-range values", () => {
    expect(parseCoords("Fortaleza")).toBeUndefined();
    expect(parseCoords("120, 10")).toBeUndefined();
  });
});
