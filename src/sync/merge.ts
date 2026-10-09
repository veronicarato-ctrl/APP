// Per-field last-writer-wins merge. Each field carries the timestamp of its last change.
// The same rule runs on the server (supabase/migrations, push_records) and must stay identical:
// an incoming value replaces the stored one only if its timestamp is strictly newer.
import type { Data } from "./records";

export type FieldTs = Record<string, number>;

export interface Side { data: Data; ts: FieldTs }

/** Fields whose values differ between two records. */
export function changedFields(a: Data, b: Data): string[] {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  const norm = (v: unknown) => (v === undefined ? "\u0000absent" : JSON.stringify(v));
  return [...keys].filter((k) => norm(a[k]) !== norm(b[k]));
}

/** Applies `incoming` onto `base`, field by field, keeping the newer timestamp. */
export function mergeLww(base: Side, incoming: Side): Side {
  const data = { ...base.data }, ts = { ...base.ts };
  for (const [k, t] of Object.entries(incoming.ts)) {
    if (t > (ts[k] ?? -1)) {
      ts[k] = t;
      // A field absent from the incoming data was cleared (null is a real value, e.g. budget: null).
      if (!(k in incoming.data)) delete data[k];
      else data[k] = incoming.data[k];
    }
  }
  return { data, ts };
}

/** Hybrid clock: never goes backwards and stays ahead of every timestamp already seen. */
export function nextTick(lastSeen: number, now = Date.now()): number {
  return Math.max(now, lastSeen + 1);
}
