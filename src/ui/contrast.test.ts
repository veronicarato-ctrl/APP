// SPEC 10.4: every text/background token pair must reach WCAG 2.1 contrast (4.5:1 for body text).
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync(new URL("../index.css", import.meta.url), "utf8");
const block = (sel: string) => css.slice(css.indexOf(sel), css.indexOf("}", css.indexOf(sel)));
const vars = (b: string) => Object.fromEntries([...b.matchAll(/--([\w-]+):\s*([^;]+);/g)].map((m) => [m[1], m[2].trim()]));
const light = vars(block(":root {"));
const dark = { ...light, ...vars(block(':root[data-theme="dark"] {')), ...vars(css.slice(css.lastIndexOf(':root[data-theme="dark"] {'))) };

type RGBA = [number, number, number, number];
function parse(v: string, env: Record<string, string>): RGBA {
  const ref = v.match(/^var\(--([\w-]+)\)$/);
  if (ref) return parse(env[ref[1]], env);
  if (v.startsWith("#")) return [0, 2, 4].map((i) => parseInt(v.slice(1 + i, 3 + i), 16)).concat(1) as RGBA;
  const m = v.match(/rgba\(([^)]+)\)/)!;
  return m[1].split(",").map(Number) as RGBA;
}
const over = (fg: RGBA, bg: RGBA): RGBA => [0, 1, 2].map((i) => fg[i] * fg[3] + bg[i] * (1 - fg[3])).concat(1) as RGBA;
const lum = (c: RGBA) => {
  const [r, g, b] = c.slice(0, 3).map((x) => { x /= 255; return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
function ratio(env: Record<string, string>, fg: string, bg: string, base = "card") {
  const b = over(parse(env[bg], env), parse(env[base], env));
  const f = over(parse(env[fg], env), b);
  const [x, y] = [lum(f), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}

const TYPES = ["transport", "meal", "culture", "show", "ritual", "nature", "lodging", "rest", "other"];
const pairs: [string, string][] = [
  ["ink", "page"], ["ink", "card"], ["soft", "card"], ["soft", "page"],
  ["error-ink", "card"], ["error-ink", "error-bg"], ["warn-ink", "warn-bg"],
  ["on-dark", "id-dark"], ["id-accent", "id-dark"], ["id-accent", "id-darker"],
  ["urgent-ink", "urgent"], ["on-color", "ok"], ["on-color", "todo"],
  ...TYPES.map((t) => [`${t}-tx`, `${t}-bg`] as [string, string]),
];

describe("colour contrast, light theme", () => {
  for (const [fg, bg] of pairs) it(`${fg} on ${bg}`, () => expect(ratio(light, fg, bg)).toBeGreaterThanOrEqual(4.5));
  // Open decision (SPEC 10.2): #a8780a measures 3.9:1 on white, under 4.5:1 for small labels.
  it("label on card reaches at least the large-text level (pending decision)", () => expect(ratio(light, "label", "card")).toBeGreaterThanOrEqual(3));
});

describe("colour contrast, dark theme", () => {
  for (const [fg, bg] of pairs) it(`${fg} on ${bg}`, () => expect(ratio(dark, fg, bg)).toBeGreaterThanOrEqual(4.5));
  it("label on card", () => expect(ratio(dark, "label", "card")).toBeGreaterThanOrEqual(4.5));
});

import { THEMES } from "../data/themes";

describe("colour contrast, identity presets", () => {
  for (const [key, th] of Object.entries(THEMES)) {
    const env = { ...light, "id-dark": th.dark, "id-darker": th.darker, "id-accent": th.accent, "id-accent-on-light": th.accentOnLight };
    it(`${key}: accent and light text on the dark colours`, () => {
      expect(ratio(env, "id-accent", "id-dark")).toBeGreaterThanOrEqual(4.5);
      expect(ratio(env, "id-accent", "id-darker")).toBeGreaterThanOrEqual(4.5);
      expect(ratio(env, "on-dark", "id-dark")).toBeGreaterThanOrEqual(4.5);
    });
    it(`${key}: accent on white reaches at least the large-text level`, () => expect(ratio(env, "id-accent-on-light", "card")).toBeGreaterThanOrEqual(3));
  }
});
