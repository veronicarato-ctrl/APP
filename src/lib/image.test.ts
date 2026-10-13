import { describe, expect, it } from "vitest";
import { fitWithin } from "./image";

describe("cover photo size", () => {
  it("shrinks the longer side to the limit and keeps the proportions", () => {
    expect(fitWithin(4000, 3000)).toEqual({ w: 1600, h: 1200 });
    expect(fitWithin(3000, 4000)).toEqual({ w: 1200, h: 1600 });
  });
  it("never enlarges a small photo", () => {
    expect(fitWithin(800, 600)).toEqual({ w: 800, h: 600 });
  });
});
