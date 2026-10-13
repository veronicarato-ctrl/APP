import "fake-indexeddb/auto";
import { describe, expect, it } from "vitest";
import { TravelDB } from "../db/db";
import { parseRate, rateUrl, refreshRate, savedRate } from "./rates";

const now = new Date("2026-10-13T10:00:00Z");

describe("exchange rates", () => {
  it("reads a reference rate with its date", () => {
    expect(parseRate({ amount: 1, base: "EUR", date: "2026-10-12", rates: { BRL: 6.1234 } }, "EUR", "BRL", now))
      .toEqual({ base: "EUR", quote: "BRL", rate: 6.1234, date: "2026-10-12", source: "ecb", fetchedAt: now.toISOString() });
  });
  it("refuses an answer for another pair, without the currency or without a date", () => {
    expect(parseRate({ base: "USD", date: "2026-10-12", rates: { BRL: 5 } }, "EUR", "BRL")).toBeUndefined();
    expect(parseRate({ base: "EUR", date: "2026-10-12", rates: {} }, "EUR", "MAD")).toBeUndefined();
    expect(parseRate({ base: "EUR", rates: { BRL: 6 } }, "EUR", "BRL")).toBeUndefined();
    expect(parseRate(null, "EUR", "BRL")).toBeUndefined();
  });
  it("asks for one pair and keeps the answer on the phone", async () => {
    const d = new TravelDB("rates-" + Math.random());
    let asked = "";
    const f = (async (url: string) => { asked = url; return new Response(JSON.stringify({ amount: 1, base: "EUR", date: "2026-10-12", rates: { BRL: 6.12 } })); }) as unknown as typeof fetch;
    const r = await refreshRate("EUR", "BRL", d, f);
    expect(asked).toBe(rateUrl("EUR", "BRL"));
    expect(asked).toBe("https://api.frankfurter.dev/v1/latest?base=EUR&symbols=BRL");
    expect((await savedRate("EUR", "BRL", d))?.rate).toBe(r.rate);
  });
  it("fails clearly when the service has no rate for that currency", async () => {
    const d = new TravelDB("rates-" + Math.random());
    const f = (async () => new Response(JSON.stringify({ amount: 1, base: "EUR", date: "2026-10-12", rates: {} }))) as unknown as typeof fetch;
    await expect(refreshRate("EUR", "MAD", d, f)).rejects.toThrow("rateUnavailable");
    expect(await savedRate("EUR", "MAD", d)).toBeUndefined();
  });
});
