import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { TravelDB } from "./db";
import { deleteSlot, firstTripId, loadState, saveBooking, saveSlot, seedIfEmpty } from "./repo";
import { importBrazil } from "../data/importBrazil";
import { runRules } from "../engine/rules";

let d: TravelDB;
beforeEach(async () => {
  d = new TravelDB("test-" + Math.random());
  await seedIfEmpty(d);
});

describe("local storage", () => {
  it("round-trips the Brazil trip without changes", async () => {
    const s = await loadState((await firstTripId(d))!, d);
    expect(s).toEqual(importBrazil());
  });

  it("moves a slot to another day and logs it", async () => {
    const id = (await firstTripId(d))!;
    const s = (await loadState(id, d))!;
    const x = s.days["2026-12-16"].slots[0];
    await saveSlot(id, "2026-12-16", x, "2026-12-18", d);
    const t = (await loadState(id, d))!;
    expect(t.days["2026-12-16"].slots.some((y) => y.id === x.id)).toBe(false);
    expect(t.days["2026-12-18"].slots.at(-1)!.id).toBe(x.id);
    expect(t.log[0].message).toContain("moved from 2026-12-16 to 2026-12-18");
  });

  it("deletes a slot and logs it", async () => {
    const id = (await firstTripId(d))!;
    const x = (await loadState(id, d))!.days["2026-12-16"].slots[1];
    await deleteSlot(id, "2026-12-16", x.id, d);
    const t = (await loadState(id, d))!;
    expect(t.days["2026-12-16"].slots.map((y) => y.id)).not.toContain(x.id);
    expect(t.log).toHaveLength(1);
  });

  it("confirming the Fortaleza Manaus flight removes its error", async () => {
    const id = (await firstTripId(d))!;
    const s = (await loadState(id, d))!;
    const f3 = s.bookings.find((b) => b.key === "f3")!;
    await saveBooking(id, { ...f3, status: "confirmed", ref: "ABC123" }, d);
    const issues = runRules((await loadState(id, d))!);
    expect(issues.filter((i) => i.level === "error")).toHaveLength(1);
    expect((await loadState(id, d))!.bookings.map((b) => b.key)).toEqual(s.bookings.map((b) => b.key));
  });
});
