import { describe, expect, it } from "vitest";
import { importBrazil } from "../data/importBrazil";
import type { FileRef } from "../model/types";
import { filesOf } from "./files";

const ref = (path: string): FileRef => ({ id: path, name: "x.jpg", type: "image/jpeg", size: 1, path, addedAt: "2026-10-13T00:00:00Z" });

describe("files of a trip", () => {
  it("lists booking attachments and the cover photo, so both reach the other phone", () => {
    const s = importBrazil();
    const b = s.bookings[0];
    s.bookings[0] = { ...b, files: [ref(`${s.trip.id}/${b.id}/ticket.pdf`)] };
    s.trip.cover = ref(`${s.trip.id}/cover/beach.jpg`);
    expect(filesOf(s).map((f) => f.path)).toEqual([`${s.trip.id}/${b.id}/ticket.pdf`, `${s.trip.id}/cover/beach.jpg`]);
  });
  it("is empty for a trip without files", () => {
    expect(filesOf(importBrazil())).toEqual([]);
  });
});
