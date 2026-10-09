// Runs the real migration in an embedded PostgreSQL (PGlite) with a stub of Supabase's auth schema,
// then checks access rules and the per-field merge done by push_records.
import { beforeAll, describe, expect, it } from "vitest";
import { startServer } from "./testServer";

const TRIP = "11111111-1111-1111-1111-111111111111";
const ANA = { id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa", email: "ana@example.com" };
const BEN = { id: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb", email: "ben@example.com" };
const EVE = { id: "eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee", email: "eve@example.com" };

let as: Awaited<ReturnType<typeof startServer>>["as"];
const push = (u: typeof ANA, rows: unknown[]) =>
  as<{ kind: string; id: string; data: Record<string, unknown>; field_ts: Record<string, number>; rev: string }>(u, "select * from push_records($1, $2::jsonb)", [TRIP, JSON.stringify(rows)]);

beforeAll(async () => {
  ({ as } = await startServer());
});

describe("supabase migration", () => {
  it("lets the first user claim the trip as owner, and refuses a stranger", async () => {
    expect((await as<{ claim_trip: string }>(ANA, "select claim_trip($1)", [TRIP]))[0].claim_trip).toBe("owner");
    expect((await as<{ claim_trip: string }>(EVE, "select claim_trip($1)", [TRIP]))[0].claim_trip).toBe("forbidden");
  });

  it("stores records and hides them from non-members", async () => {
    await push(ANA, [{ kind: "booking", id: "f3", data: { ref: "", status: "todo" }, field_ts: { ref: 0, status: 0 } }]);
    expect(await as(EVE, "select * from records")).toHaveLength(0);
    await expect(push(EVE, [{ kind: "booking", id: "x", data: {}, field_ts: {} }])).rejects.toThrow(/not a member/);
  });

  it("only the owner can invite, and the invite becomes a membership on sign-in", async () => {
    await expect(as(EVE, "select invite_member($1, $2)", [TRIP, BEN.email])).rejects.toThrow(/only the owner/);
    await as(ANA, "select invite_member($1, $2)", [TRIP, "Ben@Example.com"]);
    expect(await as(BEN, "select * from records")).toHaveLength(0);
    expect((await as<{ accept_invites: string }>(BEN, "select accept_invites()")).map((r) => r.accept_invites)).toEqual([TRIP]);
    expect(await as(BEN, "select * from records")).toHaveLength(1);
  });

  it("merges field by field, newest timestamp wins", async () => {
    await push(ANA, [{ kind: "booking", id: "f3", data: { ref: "ANA1" }, field_ts: { ref: 100 } }]);
    await push(BEN, [{ kind: "booking", id: "f3", data: { status: "confirmed" }, field_ts: { status: 90 } }]);
    // An older write to ref is ignored.
    const [row] = await push(BEN, [{ kind: "booking", id: "f3", data: { ref: "OLD" }, field_ts: { ref: 50 } }]);
    expect(row.data).toEqual({ ref: "ANA1", status: "confirmed" });
    expect(row.field_ts).toEqual({ ref: 100, status: 90 });
  });

  it("removes a field cleared by a newer change and bumps the revision only on change", async () => {
    const [a] = await push(ANA, [{ kind: "booking", id: "f3", data: {}, field_ts: { ref: 200 } }]);
    expect(a.data).toEqual({ status: "confirmed" });
    const [b] = await push(ANA, [{ kind: "booking", id: "f3", data: {}, field_ts: { ref: 150 } }]);
    expect(b.rev).toBe(a.rev);
  });

  it("cannot delete rows directly, deletions are a field", async () => {
    await expect(as(ANA, "delete from records")).rejects.toThrow(/permission denied/);
    expect(await as(ANA, "select * from records")).toHaveLength(1);
  });
});
