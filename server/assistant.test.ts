import { describe, expect, it } from "vitest";
import { importBrazil } from "../src/data/importBrazil";
import { compactState } from "../src/assistant/protocol";
import { handle } from "./assistant";
import { callProvider, configured, defaultProvider, ProviderError } from "./providers";
import { sameName, verifyPlace } from "./places";

const ENV = { VITE_SUPABASE_URL: "https://x.supabase.co", VITE_SUPABASE_ANON_KEY: "anon", ANTHROPIC_API_KEY: "k" };
const answer = JSON.stringify({
  summary: "Two days.", questions: [],
  ops: [
    { op: "addPlace", place: { ref: "p1", name: "Teatro Amazonas", city: "Manaus", country: "Brazil", category: "museum" } },
    { op: "add", date: "2026-12-21", slot: { type: "culture", title: "Teatro Amazonas", place: "p1" } },
    { op: "explode" },
  ],
});
/** Network stand-in: Supabase accepts "good" tokens, Google Places finds the theatre. */
const net = (async (url: string, init?: RequestInit) => {
  if (url.endsWith("/auth/v1/user")) return new Response(JSON.stringify((init?.headers as Record<string, string>).Authorization === "Bearer good" ? { id: "u1" } : {}), { status: (init?.headers as Record<string, string>).Authorization === "Bearer good" ? 200 : 401 });
  if (url.includes("places.googleapis.com")) return new Response(JSON.stringify({ places: [{ displayName: { text: "Teatro Amazonas" }, formattedAddress: "Largo de São Sebastião, Manaus", location: { latitude: -3.13, longitude: -60.02 }, websiteUri: "https://example.org/teatro" }] }));
  return new Response("{}", { status: 404 });
}) as unknown as typeof fetch;
const post = (body: unknown, token = "good") => new Request("https://app.test/api/assistant", { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: JSON.stringify(body) });
const req = { mode: "ask", text: "Add the opera house", state: compactState(importBrazil()) };

describe("assistant endpoint", () => {
  it("refuses anyone who is not signed in, so the AI key cannot be used by strangers", async () => {
    let called = false;
    const r = await handle(post(req, "bad"), { env: ENV, fetch: net, call: async () => { called = true; throw new Error(); } });
    expect(r.status).toBe(401);
    expect(called).toBe(false);
  });
  it("says when no AI provider is configured on the server", async () => {
    const r = await handle(post(req), { env: { ...ENV, ANTHROPIC_API_KEY: undefined }, fetch: net });
    expect([r.status, (await r.json()).error]).toEqual([503, "noProvider"]);
  });
  it("returns the checked proposal, the dropped count, the unverified places with a search link, and the cost", async () => {
    let system = "";
    const r = await handle(post(req), { env: ENV, fetch: net, call: async (_p, s) => { system = s; return { text: answer, model: "m", inputTokens: 1200, outputTokens: 300 }; } });
    const j = await r.json();
    expect(r.status).toBe(200);
    expect(system).toContain("Never invent a fact");
    expect(j.ops).toHaveLength(2);
    expect(j.dropped).toBe(1);
    expect(j.checks.p1).toEqual({ status: "unverified", searchUrl: "https://www.google.com/maps/search/?api=1&query=Teatro%20Amazonas%2C%20Manaus%2C%20Brazil" });
    expect([j.meta.provider, j.meta.inputTokens, j.meta.outputTokens]).toEqual(["anthropic", 1200, 300]);
  });
  it("verifies places when a directory key is set", async () => {
    const r = await handle(post(req), { env: { ...ENV, GOOGLE_PLACES_API_KEY: "g" }, fetch: net, now: () => new Date("2026-10-13T10:00:00Z"), call: async () => ({ text: answer, model: "m", inputTokens: 0, outputTokens: 0 }) });
    expect((await r.json()).checks.p1).toEqual({ status: "verified", url: "https://example.org/teatro", source: "Google Places", checkedAt: "2026-10-13", address: "Largo de São Sebastião, Manaus", lat: -3.13, lng: -60.02 });
  });
  it("reports a refusal and a non-JSON answer clearly", async () => {
    const refused = await handle(post(req), { env: ENV, fetch: net, call: async () => { throw new ProviderError("refused", "x"); } });
    expect([refused.status, (await refused.json()).error]).toEqual([422, "refused"]);
    const prose = await handle(post(req), { env: ENV, fetch: net, call: async () => ({ text: "I would suggest the opera.", model: "m", inputTokens: 0, outputTokens: 0 }) });
    expect([prose.status, (await prose.json()).error]).toEqual([502, "notJson"]);
  });
  it("lists the configured providers without revealing any key", async () => {
    const r = await handle(new Request("https://app.test/api/assistant"), { env: { ...ENV, OPENAI_API_KEY: "o", OPENAI_MODEL: "x", AI_PROVIDER: "openai" }, fetch: net });
    const text = await r.text();
    expect(JSON.parse(text)).toEqual({ providers: ["anthropic", "openai"], default: "openai" });
    expect(text).not.toContain("k\"");
  });
});

describe("providers", () => {
  it("needs a key, and a model name for the providers whose models are not chosen here", () => {
    expect(configured({ OPENAI_API_KEY: "o" })).toEqual([]);
    expect(configured({ MISTRAL_API_KEY: "m", MISTRAL_MODEL: "x", ANTHROPIC_API_KEY: "a" })).toEqual(["anthropic", "mistral"]);
    expect(defaultProvider({ ANTHROPIC_API_KEY: "a", AI_PROVIDER: "mistral" })).toBe("anthropic");
  });
  it("sends a chat completions request in JSON mode and reads the usage", async () => {
    let sent: { url: string; body: Record<string, unknown>; auth: string } | undefined;
    const f = (async (url: string, init: RequestInit) => {
      sent = { url, body: JSON.parse(String(init.body)), auth: (init.headers as Record<string, string>).Authorization };
      return new Response(JSON.stringify({ model: "mistral-x", choices: [{ message: { content: "{}" } }], usage: { prompt_tokens: 10, completion_tokens: 2 } }));
    }) as unknown as typeof fetch;
    const r = await callProvider("mistral", "sys", "user", { MISTRAL_API_KEY: "m", MISTRAL_MODEL: "mistral-x" }, f);
    expect(sent!.url).toBe("https://api.mistral.ai/v1/chat/completions");
    expect(sent!.auth).toBe("Bearer m");
    expect(sent!.body).toEqual({ model: "mistral-x", messages: [{ role: "system", content: "sys" }, { role: "user", content: "user" }], response_format: { type: "json_object" } });
    expect(r).toEqual({ text: "{}", model: "mistral-x", inputTokens: 10, outputTokens: 2 });
  });
});

describe("place check", () => {
  it("matches names loosely but not different places", () => {
    expect(sameName("Teatro Amazonas", "teatro amazonas")).toBe(true);
    expect(sameName("Museu da Amazônia (MUSA)", "Museu da Amazonia")).toBe(true);
    expect(sameName("Hotel Tropical", "Teatro Amazonas")).toBe(false);
  });
  it("stays unverified when the directory finds another place", async () => {
    const f = (async () => new Response(JSON.stringify({ places: [{ displayName: { text: "Other Hotel" }, websiteUri: "https://example.org/x" }] }))) as unknown as typeof fetch;
    const v = await verifyPlace({ ref: "p", name: "Pousada X", city: "Canoa Quebrada", country: "Brazil", category: "hotel" }, { GOOGLE_PLACES_API_KEY: "g" }, new Date(), f);
    expect(v.status).toBe("unverified");
  });
});
