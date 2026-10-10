// Two phones (two local databases) synchronising through the real server schema.
import "fake-indexeddb/auto";
import { beforeAll, describe, expect, it } from "vitest";
import { TravelDB } from "../src/db/db";
import { deleteSlot, firstTripId, loadState, onLocalWrite, saveBooking, saveSlot, seedIfEmpty } from "../src/db/repo";
import { recordLocalChanges, sync, pendingCount } from "../src/sync/engine";
import { runRules } from "../src/engine/rules";
import { startServer } from "./testServer";

onLocalWrite((tripId, d, opts) => recordLocalChanges(tripId, opts, d).then(() => undefined));

const ANA = { id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa", email: "ana@example.com" };
const BEN = { id: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb", email: "ben@example.com" };

let server: Awaited<ReturnType<typeof startServer>>;
let A: TravelDB, B: TravelDB, trip: string;
const get = (d: TravelDB) => loadState(trip, d).then((s) => s!);
const strip = <T extends { log: unknown }>(s: T) => ({ ...s, log: [] });

beforeAll(async () => {
  server = await startServer();
  A = new TravelDB("phone-a"); B = new TravelDB("phone-b");
  await seedIfEmpty(A); await seedIfEmpty(B);
  trip = (await firstTripId(A))!;
});

describe("two phones sharing a trip", () => {
  it("first phone uploads the trip, second joins by invitation and receives it", async () => {
    await server.as(ANA, "select claim_trip($1)", [trip]);
    const up = await sync(trip, server.transport(ANA), A);
    expect(up.pushed).toBeGreaterThan(100);
    await server.as(ANA, "select invite_member($1, $2)", [trip, BEN.email]);
    await server.as(BEN, "select accept_invites()");
    await sync(trip, server.transport(BEN), B);
    expect(strip(await get(B))).toEqual(strip(await get(A)));
    expect(await pendingCount(trip, B)).toBe(0);
  });

  it("edits made offline on both phones are merged", async () => {
    const a = await get(A), b = await get(B);
    const f3 = a.bookings.find((x) => x.key === "f3")!;
    await saveBooking(trip, { ...f3, ref: "GOL123" }, A);
    const s8 = b.days["2026-12-16"].slots.find((x) => x.key === "s8")!;
    await saveSlot(trip, "2026-12-16", { ...s8, title: { ...s8.title, text: "Buggy (Ben)" } }, "2026-12-16", B);
    await sync(trip, server.transport(ANA), A);
    await sync(trip, server.transport(BEN), B);
    await sync(trip, server.transport(ANA), A);
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
    await sync(trip, server.transport(ANA), A);
    await sync(trip, server.transport(BEN), B);
    const b = await get(B);
    expect(b.days["2026-12-16"].slots.some((x) => x.key === "s9")).toBe(false);
    expect(b.days["2026-12-18"].slots.at(-1)!.key).toBe("s19");
    expect(runRules(b)).toEqual(runRules(await get(A)));
  });

  it("flags a confirmed booking changed on both phones, newest value wins", async () => {
    const h4 = (await get(A)).bookings.find((x) => x.key === "h4")!;
    await saveBooking(trip, { ...h4, status: "confirmed", ref: "H4" }, A);
    await sync(trip, server.transport(ANA), A);
    await sync(trip, server.transport(BEN), B);
    const hA = (await get(A)).bookings.find((x) => x.key === "h4")!;
    const hB = (await get(B)).bookings.find((x) => x.key === "h4")!;
    await saveBooking(trip, { ...hA, tel: "+55 92 1111" }, A);
    await new Promise((r) => setTimeout(r, 5));
    await saveBooking(trip, { ...hB, tel: "+55 92 2222" }, B);
    await sync(trip, server.transport(ANA), A);
    const res = await sync(trip, server.transport(BEN), B);
    expect(res.conflicts).toHaveLength(1);
    expect(res.conflicts[0].fields).toEqual([{ field: "tel", mine: "+55 92 2222", theirs: "+55 92 1111", kept: "mine" }]);
    await sync(trip, server.transport(ANA), A);
    for (const d of [A, B]) expect((await get(d)).bookings.find((x) => x.key === "h4")!.tel).toBe("+55 92 2222");
  });
});
