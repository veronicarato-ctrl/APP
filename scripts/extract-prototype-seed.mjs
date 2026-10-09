// Evaluates the data section of the reference prototype (guiao-viagem-brasil.jsx)
// and writes the resulting seed verbatim to src/data/brazil-2026.prototype.json.
// The data is never retyped by hand, so the import cannot drift from the prototype.
import { readFileSync, writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const src = readFileSync(new URL("../guiao-viagem-brasil.jsx", import.meta.url), "utf8");
const start = src.indexOf("const KEY =");
const end = src.indexOf("/* ============ UTILITÁRIOS");
if (start < 0 || end < 0) throw new Error("Prototype markers not found");

const body =
  src.slice(start, end) +
  "\nexport default { seed: SEED, sources: SRC, prep: PREP, prepNote: PREP_SRC[0] };\n";
const dir = mkdtempSync(join(tmpdir(), "proto-"));
const file = join(dir, "data.mjs");
writeFileSync(file, body);
const { default: data } = await import(pathToFileURL(file).href);

const out = new URL("../src/data/brazil-2026.prototype.json", import.meta.url);
writeFileSync(out, JSON.stringify(data, null, 2) + "\n");
console.log("Wrote", out.pathname);
