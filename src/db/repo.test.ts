import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { TravelDB } from "./db";
import { createTrip, deleteSlot, deletePlace, deleteTrip, getActiveTripId, listTrips, loadExampleTrip, loadState, saveBooking, savePlace, saveSlot, setActiveTripId, updateTrip } from "./repo";
import { BRAZIL_TRIP_KEY, importBrazil } from "../data/importBrazil";
import { runRules } from "../engine/rules";

let d: TravelDB;
beforeEach(async () => {
  d = new TravelDB("test-" + Math.random());
  await loadExampleTrip(d, BRAZIL_TRIP_KEY);
});

describe("local storage", () => {
  it("round-trips the Brazil trip without changes", async () => {
    const s = await loadState((await getActiveTripId(d))!, d);
    expect(s).toEqual(importBrazil());
  });

  it("moves a slot to another day and logs it", async () => {
    const id = (await getActiveTripId(d))!;
    const s = (await loadState(id, d))!;
    const x = s.days["2026-12-16"].slots[0];
    await saveSlot(id, "2026-12-16", x, "2026-12-18", d);
    const t = (await loadState(id, d))!;
    expect(t.days["2026-12-16"].slots.some((y) => y.id === x.id)).toBe(false);
    expect(t.days["2026-12-18"].slots.at(-1)!.id).toBe(x.id);
    expect(t.log[0].message).toContain("moved from 2026-12-16 to 2026-12-18");
  });

  it("deletes a slot and logs it", async () => {
    const id = (await getActiveTripId(d))!;
    const x = (await loadState(id, d))!.days["2026-12-16"].slots[1];
    await deleteSlot(id, "2026-12-16", x.id, d);
    const t = (await loadState(id, d))!;
    expect(t.days["2026-12-16"].slots.map((y) => y.id)).not.toContain(x.id);
    expect(t.log).toHaveLength(1);
  });

  it("confirming the Fortaleza Manaus flight removes its error", async () => {
    const id = (await getActiveTripId(d))!;
    const s = (await loadState(id, d))!;
    const f3 = s.bookings.find((b) => b.key === "f3")!;
    await saveBooking(id, { ...f3, status: "confirmed", ref: "ABC123" }, d);
    const issues = runRules((await loadState(id, d))!);
    expect(issues.filter((i) => i.level === "error")).toHaveLength(1);
    expect((await loadState(id, d))!.bookings.map((b) => b.key)).toEqual(s.bookings.map((b) => b.key));
  });
});

const NEW = { name: "Japan", lang: "en" as const, start: "2027-04-01", end: "2027-04-03", adults: 2, children: [], origin: "Geneva", homeTz: "Europe/Paris", homeCurrency: "EUR", destCurrency: "JPY", budget: 3000, intent: "Deux semaines au Japon, temples et onsen.", modes: { culture: 5, relaxation: 3 } };

describe("several trips", () => {
  it("creates an empty trip with one day per date and makes it the active one", async () => {
    const id = await createTrip(NEW, d);
    expect(await getActiveTripId(d)).toBe(id);
    const s = (await loadState(id, d))!;
    expect(Object.keys(s.days).sort()).toEqual(["2027-04-01", "2027-04-02", "2027-04-03"]);
    expect(s.bookings).toEqual([]);
    expect((await listTrips(d)).map((t) => t.name.text)).toEqual(["Brasil, praia e Amazónia", "Japan"]);
  });

  it("keeps the wishes word for word, the budget, both currencies and the themes, with app-chosen colours", async () => {
    const id = await createTrip(NEW, d);
    const { trip } = (await loadState(id, d))!;
    expect(trip.intent).toEqual({ text: "Deux semaines au Japon, temples et onsen.", lang: "en" });
    expect(trip.budget).toBe(3000);
    expect([trip.homeCurrency, trip.destCurrency]).toEqual(["EUR", "JPY"]);
    expect(trip.modes).toEqual({ culture: 5, relaxation: 3 });
    expect(trip.theme.dark).toBe("#1d3557");
    expect(trip.destTz).toBeUndefined();
    const bare = await createTrip({ ...NEW, intent: "  ", destCurrency: "", budget: null, modes: {} }, d);
    const b = (await loadState(bare, d))!.trip;
    expect([b.intent, b.destCurrency, b.budget]).toEqual([undefined, undefined, null]);
  });

  it("keeps trips independent", async () => {
    const brazil = (await getActiveTripId(d))!;
    const japan = await createTrip(NEW, d);
    const s = (await loadState(japan, d))!;
    await savePlace(japan, { id: "p1", key: "", name: { text: "Tokyo", lang: "en" }, tz: "Asia/Tokyo", region: "", approx: false }, d);
    expect(Object.keys((await loadState(japan, d))!.places)).toEqual(["p1"]);
    expect(Object.keys((await loadState(brazil, d))!.places)).toHaveLength(9);
    await setActiveTripId(brazil, d);
    expect(await getActiveTripId(d)).toBe(brazil);
    expect(s.trip.theme.dark).toBe("#1d3557");
  });

  it("extends the dates and refuses to drop days that still hold activities", async () => {
    const id = await createTrip(NEW, d);
    const s = (await loadState(id, d))!;
    await updateTrip({ ...s.trip, end: "2027-04-05" }, d);
    expect(Object.keys((await loadState(id, d))!.days)).toHaveLength(5);
    await saveSlot(id, "2027-04-05", { id: "x", key: "", type: "culture", title: { text: "Museum", lang: "en" }, start: "", end: "", heavy: false, who: "", origin: "user" }, "2027-04-05", d);
    await expect(updateTrip({ ...s.trip, end: "2027-04-04" }, d)).rejects.toThrow("daysNotEmpty");
    await updateTrip({ ...s.trip, start: "2027-04-02", end: "2027-04-05" }, d);
    expect(Object.keys((await loadState(id, d))!.days).sort()).toEqual(["2027-04-02", "2027-04-03", "2027-04-04", "2027-04-05"]);
  });

  it("refuses to delete a place in use, deletes a trip", async () => {
    const brazil = (await getActiveTripId(d))!;
    const s = (await loadState(brazil, d))!;
    await expect(deletePlace(brazil, Object.keys(s.places)[0], d)).rejects.toThrow("placeInUse");
    const id = await createTrip(NEW, d);
    await deleteTrip(id, d);
    expect(await loadState(id, d)).toBeUndefined();
    expect(await getActiveTripId(d)).toBe(brazil);
  });

  it("loads the example as a new independent trip by default", async () => {
    const a = await loadExampleTrip(d);
    expect(a).not.toBe(importBrazil().trip.id);
    expect(runRules((await loadState(a, d))!).filter((i) => i.level === "error")).toHaveLength(2);
  });
});
