import { describe, expect, it } from "vitest";
import { importBrazil } from "../data/importBrazil";
import { DELETED, explode, implode } from "./records";
import { changedFields, mergeLww, nextTick } from "./merge";

describe("records", () => {
  it("explode then implode gives back the same trip", () => {
    const s = importBrazil();
    expect(implode(explode(s))).toEqual(s);
  });
  it("record keys are unique", () => {
    const keys = explode(importBrazil()).map((r) => `${r.kind}:${r.id}`);
    expect(new Set(keys).size).toBe(keys.length);
  });
  it("skips deleted records", () => {
    const s = importBrazil();
    const recs = explode(s);
    const slot = recs.find((r) => r.kind === "slot")!;
    slot.data = { ...slot.data, [DELETED]: true };
    const t = implode(recs);
    expect(Object.values(t.days).flatMap((d) => d.slots).some((x) => x.id === slot.id)).toBe(false);
  });
});

describe("per-field merge", () => {
  it("keeps the newer value of each field independently", () => {
    const base = { data: { ref: "A", tel: "1" }, ts: { ref: 10, tel: 10 } };
    const inc = { data: { ref: "B", tel: "2" }, ts: { ref: 20, tel: 5 } };
    expect(mergeLww(base, inc)).toEqual({ data: { ref: "B", tel: "1" }, ts: { ref: 20, tel: 10 } });
  });
  it("keeps the stored value on equal timestamps", () => {
    expect(mergeLww({ data: { a: 1 }, ts: { a: 5 } }, { data: { a: 2 }, ts: { a: 5 } }).data).toEqual({ a: 1 });
  });
  it("removes a field cleared by a newer change", () => {
    expect(mergeLww({ data: { note: "x" }, ts: { note: 1 } }, { data: {}, ts: { note: 2 } }).data).toEqual({});
  });
  it("lists changed fields", () => {
    expect(changedFields({ a: 1, b: null, c: 3 }, { a: 2, b: null })).toEqual(["a", "c"]);
  });
  it("the clock never goes backwards", () => {
    expect(nextTick(5000, 1000)).toBe(5001);
    expect(nextTick(5000, 9000)).toBe(9000);
  });
});
