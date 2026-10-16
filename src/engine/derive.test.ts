import { describe, expect, it } from "vitest";
import { importBrazil } from "../data/importBrazil";
import { dayPath, dayTimeSplit, dayTransports, lodgingForNight, placeStates, route, slotMinutes, tzChange, upcoming } from "./derive";
import { slot, trip } from "./testkit";
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

describe("slot length", () => {
  const t = trip({ "2026-12-14": [slot("museum", { start: "10:00", end: "11:30" }), slot("open", { start: "10:00" }), slot("odd", { start: "12:00", end: "11:00" })] });
  it("counts the minutes between the two local times", () => {
    expect(slotMinutes(t, "2026-12-14", t.days["2026-12-14"].slots[0])).toBe(90);
  });
  it("gives nothing when a time is missing or the end comes first", () => {
    expect(slotMinutes(t, "2026-12-14", t.days["2026-12-14"].slots[1])).toBeUndefined();
    expect(slotMinutes(t, "2026-12-14", t.days["2026-12-14"].slots[2])).toBeUndefined();
  });
  it("reads a transport's times in its departure and arrival zones, past midnight too", () => {
    const pl = (id: string, tz: string) => ({ id, key: id, name: { text: id, lang: "en" as const }, tz, region: "", approx: false });
    const x = trip({ "2026-12-14": [
      slot("visit", { placeId: "for" }),
      slot("flight", { type: "transport", placeId: "mao", start: "10:00", end: "11:00" }),
      slot("night", { type: "transport", placeId: "for", start: "23:00", end: "01:00" }),
    ] });
    x.places = { for: pl("for", "America/Fortaleza"), mao: pl("mao", "America/Manaus") };
    const [, flight, night] = x.days["2026-12-14"].slots;
    expect(slotMinutes(x, "2026-12-14", flight)).toBe(120); // 10:00 at UTC-3 to 11:00 at UTC-4
    expect(slotMinutes(x, "2026-12-14", night)).toBe(60); // 23:00 at UTC-4 (03:00 UTC) to 01:00 next day at UTC-3 (04:00 UTC)
  });
  it("leaves the Brazil flights without a length, since their times are not known", () => {
    const f = dayTransports(s, "2026-12-20").find((x) => bkey(x.booking?.id) === "f3")!;
    const m = slotMinutes(s, "2026-12-20", f.slot);
    if (!f.slot.start || !f.slot.end) return expect(m).toBeUndefined();
    const dep = zonedInstant("2026-12-20", f.slot.start, "America/Fortaleza").getTime();
    let arr = zonedInstant("2026-12-20", f.slot.end, "America/Manaus").getTime();
    if (arr <= dep) arr += 86_400_000;
    expect(m).toBe((arr - dep) / 60_000);
  });
});

describe("visited places", () => {
  const states = (iso: string) => {
    const st = placeStates(s, new Date(iso));
    return Object.fromEntries(Object.entries(st).map(([id, v]) => [s.places[id].key, v]));
  };
  it("has every place ahead before the trip", () => {
    expect(new Set(Object.values(states("2026-11-01T12:00:00Z")))).toEqual(new Set(["ahead"]));
  });
  it("marks earlier places visited and today's places today, in the place's own date", () => {
    const st = states("2026-12-20T15:00:00Z");
    expect(st.for).toBe("today");
    expect(st.mao).toBe("today");
    expect(st.can).toBe("visited");
  });
  it("has every place visited after the trip", () => {
    expect(new Set(Object.values(states("2027-01-10T12:00:00Z")))).toEqual(new Set(["visited"]));
  });
});
