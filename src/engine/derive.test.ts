import { describe, expect, it } from "vitest";
import { importBrazil } from "../data/importBrazil";
import { dayPath, dayTimeSplit, dayTransports, lodgingForNight, route, tzChange, upcoming } from "./derive";
import { zonedInstant } from "../lib/time";

const s = importBrazil();
const bkey = (id?: string) => s.bookings.find((b) => b.id === id)?.key;

describe("derived views on the Brazil trip", () => {
  it("finds tonight's lodging", () => {
    expect(bkey(lodgingForNight(s, "2026-12-14")?.id)).toBe("h1");
    expect(bkey(lodgingForNight(s, "2026-12-20")?.id)).toBe("h4");
    expect(lodgingForNight(s, "2026-12-26")).toBeUndefined();
  });

  it("detects the only time zone change, on 20 December", () => {
    const changes = Object.keys(s.days).filter((d) => tzChange(s, d));
    expect(changes).toEqual(["2026-12-20"]);
    const c = tzChange(s, "2026-12-20")!;
    expect([c.from.key, c.to.key, c.from.tz, c.to.tz]).toEqual(["jer", "mao", "America/Fortaleza", "America/Manaus"]);
  });

  it("gives departure and arrival of the Fortaleza Manaus flight", () => {
    const f = dayTransports(s, "2026-12-20").find((x) => bkey(x.booking?.id) === "f3")!;
    expect([f.from?.key, f.to?.key]).toEqual(["for", "mao"]);
  });

  it("starts a day where the previous one ended", () => {
    expect(dayPath(s, "2026-12-15").map((p) => p.key)).toEqual(["for", "mbr", "can"]);
  });

  it("lists upcoming timed slots after an instant", () => {
    const now = zonedInstant("2026-12-16", "12:00", "America/Fortaleza");
    const next = upcoming(s, now)[0];
    expect([next.date, next.slot.key]).toEqual(["2026-12-16", "s9"]);
  });

  it("splits travel and on-site time from timed slots only", () => {
    expect(dayTimeSplit(s, "2026-12-15")).toEqual({ travel: 240, onSite: 0, untimed: 1 });
  });

  it("numbers stops in order of first visit", () => {
    const r = route(s);
    expect(r.stops.map((x) => x.place.key)).toEqual(["for", "mbr", "can", "jer", "mao", "tum", "ana", "sjl", "enc"]);
    expect(route(s, "2026-12-20").segments.map((x) => [x.from.key, x.to.key])).toEqual([["jer", "for"], ["for", "mao"]]);
  });
});
