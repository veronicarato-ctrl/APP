// Two phones (two local databases) synchronising through the real server schema.
import "fake-indexeddb/auto";
import { beforeAll, describe, expect, it } from "vitest";
import { TravelDB } from "../src/db/db";
import { createTrip, deleteSlot, deleteTrip, listTrips, loadExampleTrip, loadState, onLocalWrite, saveBooking, saveSlot } from "../src/db/repo";
import { recordLocalChanges, pendingCount } from "../src/sync/engine";
import { syncAll } from "../src/sync/multi";
import { runRules } from "../src/engine/rules";
import { startServer } from "./testServer";

onLocalWrite((tripId, d, opts) => recordLocalChanges(tripId, opts, d).then(() => undefined));

const ANA = { id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa", email: "ana@example.com" };
const BEN = { id: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb", email: "ben@example.com" };

let server: Awaited<ReturnType<typeof startServer>>;
let A: TravelDB, B: TravelDB, trip: string;
const get = (d: TravelDB) => loadState(trip, d).then((s) => s!);
const strip = <T extends { log: unknown }>(s: T) => ({ ...s, log: [] });
const syncA = () => syncAll(server.api(ANA), A);
const syncB = () => syncAll(server.api(BEN), B);

beforeAll(async () => {
  server = await startServer();
  A = new TravelDB("phone-a"); B = new TravelDB("phone-b");
  trip = await loadExampleTrip(A);
});

describe("two phones sharing a trip", () => {
  it("first phone uploads the trip, the second starts empty and receives it by invitation", async () => {
    const up = await syncA();
    expect(up.synced).toEqual([trip]);
    expect(await pendingCount(trip, A)).toBe(0);
    expect(await listTrips(B)).toEqual([]);
    await server.as(ANA, "select invite_member($1, $2)", [trip, BEN.email]);
    await syncB();
    expect(strip(await get(B))).toEqual(strip(await get(A)));
    expect(await pendingCount(trip, B)).toBe(0);
  });

  it("edits made offline on both phones are merged", async () => {
    const a = await get(A), b = await get(B);
    const f3 = a.bookings.find((x) => x.key === "f3")!;
    await saveBooking(trip, { ...f3, ref: "GOL123" }, A);
    const s8 = b.days["2026-12-16"].slots.find((x) => x.key === "s8")!;
    await saveSlot(trip, "2026-12-16", { ...s8, title: { ...s8.title, text: "Buggy (Ben)" } }, "2026-12-16", B);
    await syncA(); await syncB(); await syncA();
    for (const d of [A, B]) {
      const s = await get(d);
      expect(s.bookings.find((x) => x.key === "f3")!.ref).toBe("GOL123");
      expect(s.days["2026-12-16"].slots.find((x) => x.key === "s8")!.title.text).toBe("Buggy (Ben)");
    }
    expect(strip(await get(B))).toEqual(strip(await get(A)));
  });

  it("propagates a deletion and a move to another day", async () => {
    const s9 = (await get(A)).days["2026-12-16"].slots.find((x) => x.key === "s9")!;
    await deleteSlot(trip, "2026-12-16", s9.id, A);
    const s19 = (await get(A)).days["2026-12-19"].slots.find((x) => x.key === "s19")!;
    await saveSlot(trip, "2026-12-19", s19, "2026-12-18", A);
    await syncA(); await syncB();
    const b = await get(B);
    expect(b.days["2026-12-16"].slots.some((x) => x.key === "s9")).toBe(false);
    expect(b.days["2026-12-18"].slots.at(-1)!.key).toBe("s19");
    expect(runRules(b)).toEqual(runRules(await get(A)));
  });

  it("flags a confirmed booking changed on both phones, newest value wins", async () => {
    const h4 = (await get(A)).bookings.find((x) => x.key === "h4")!;
    await saveBooking(trip, { ...h4, status: "confirmed", ref: "H4" }, A);
    await syncA(); await syncB();
    const hA = (await get(A)).bookings.find((x) => x.key === "h4")!;
    const hB = (await get(B)).bookings.find((x) => x.key === "h4")!;
    await saveBooking(trip, { ...hA, tel: "+55 92 1111" }, A);
    await new Promise((r) => setTimeout(r, 5));
    await saveBooking(trip, { ...hB, tel: "+55 92 2222" }, B);
    await syncA();
    const res = await syncB();
    expect(res.conflicts).toBe(1);
    const c = await B.conflicts.toArray();
    expect(c[0].fields).toEqual([{ field: "tel", mine: "+55 92 2222", theirs: "+55 92 1111", kept: "mine" }]);
    await syncA();
    for (const d of [A, B]) expect((await get(d)).bookings.find((x) => x.key === "h4")!.tel).toBe("+55 92 2222");
  });
});

describe("several trips per account", () => {
  const NEW = { name: "Japan", lang: "en" as const, start: "2027-04-01", end: "2027-04-03", adults: 2, children: [], origin: "Geneva", homeTz: "Europe/Paris", homeCurrency: "EUR", destTz: "Asia/Tokyo", themeKey: "neutral" };

  it("a new trip stays private until its owner invites someone", async () => {
    const japan = await createTrip(NEW, A);
    expect((await syncA()).synced).toContain(japan);
    await syncB();
    expect((await listTrips(B)).map((t) => t.id)).not.toContain(japan);
  });

  it("deleting a shared trip removes it on the other phone", async () => {
    const extra = await createTrip({ ...NEW, name: "Weekend" }, A);
    await syncA();
    await server.as(ANA, "select invite_member($1, $2)", [extra, BEN.email]);
    await syncB();
    expect((await listTrips(B)).map((t) => t.id)).toContain(extra);
    await deleteTrip(extra, A);
    await syncA(); await syncB();
    expect((await listTrips(B)).map((t) => t.id)).not.toContain(extra);
    expect((await listTrips(A)).map((t) => t.id)).not.toContain(extra);
  });

  it("each user's copy of the example is a separate trip on the server", async () => {
    const mine = await loadExampleTrip(B);
    const res = await syncB();
    expect(res.forbidden).toEqual([]);
    expect(res.synced).toContain(mine);
    expect(mine).not.toBe(trip);
  });
});
