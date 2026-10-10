// Offline-first synchronisation. IndexedDB stays the source the screens read from; the server is
// reached only when there is a network and a signed-in account. Every local edit is stamped per
// field, so changes made in airplane mode are sent later and merged field by field.
import { db as defaultDb, type Conflict, type SyncMeta, type TravelDB } from "../db/db";
import { loadState, removeTripLocal, replaceTrip } from "../db/repo";
import { newId } from "../lib/ids";
import { changedFields, mergeLww, nextTick, type FieldTs } from "./merge";
import { DELETED, explode, implode, recKey, type Data, type Kind, type Rec } from "./records";

export interface WireRow { kind: Kind; id: string; data: Data; field_ts: FieldTs; rev?: number | string }

export interface Transport {
  pull(tripId: string, sinceRev: number, limit: number): Promise<WireRow[]>;
  push(tripId: string, rows: WireRow[]): Promise<WireRow[]>;
}

const metaKey = (tripId: string, kind: Kind, id: string) => `${tripId}|${recKey(kind, id)}`;
const pick = <T extends object>(o: T, keys: string[]) =>
  Object.fromEntries(keys.filter((k) => k in o).map((k) => [k, (o as Record<string, unknown>)[k]])) as T;
const same = (a: unknown, b: unknown) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

async function state(d: TravelDB, tripId: string) {
  return (await d.syncState.get(tripId)) ?? { tripId, lastRev: 0, clock: 0 };
}

/**
 * Compares the local trip with the last snapshot and stamps every changed field.
 * `baseline` stamps with 0, so seeded data never overrides anything already on the server.
 */
export async function recordLocalChanges(tripId: string, opts: { baseline?: boolean } = {}, d: TravelDB = defaultDb) {
  // A trip deleted on this phone has no state: every known record is then stamped as deleted.
  const s = await loadState(tripId, d);
  return d.transaction("rw", [d.syncMeta, d.syncState], async () => {
    const metas = new Map((await d.syncMeta.where({ tripId }).toArray()).map((m) => [m.key, m]));
    if (!s && metas.size === 0) return 0;
    const st = await state(d, tripId);
    const baseline = opts.baseline || (metas.size === 0 && !!s);
    let clock = st.clock;
    const tick = () => (baseline ? 0 : (clock = nextTick(clock)));
    const changed: SyncMeta[] = [];
    const seen = new Set<string>();

    for (const r of s ? explode(s) : []) {
      const key = metaKey(tripId, r.kind, r.id);
      seen.add(key);
      const m = metas.get(key);
      if (!m) {
        const t = tick(), fields = Object.keys(r.data);
        changed.push({ key, tripId, kind: r.kind, id: r.id, shadow: r.data, ts: Object.fromEntries(fields.map((f) => [f, t])), base: {}, dirty: fields });
        continue;
      }
      const ch = changedFields(m.shadow, r.data);
      if (!ch.length) continue;
      const t = tick();
      changed.push({ ...m, shadow: r.data, ts: { ...m.ts, ...Object.fromEntries(ch.map((f) => [f, t])) }, dirty: [...new Set([...m.dirty, ...ch])] });
    }
    for (const m of metas.values()) {
      if (seen.has(m.key) || m.shadow[DELETED]) continue;
      const t = tick();
      changed.push({ ...m, shadow: { ...m.shadow, [DELETED]: true }, ts: { ...m.ts, [DELETED]: t }, dirty: [...new Set([...m.dirty, DELETED])] });
    }
    if (changed.length) await d.syncMeta.bulkPut(changed);
    await d.syncState.put({ ...st, clock });
    return changed.length;
  });
}

export async function pendingCount(tripId: string, d: TravelDB = defaultDb) {
  return (await d.syncMeta.where({ tripId }).toArray()).filter((m) => m.dirty.length).length;
}

/** Merges server rows into the local trip. Local unsent fields win only if strictly newer. */
export async function applyRemote(tripId: string, rows: WireRow[], d: TravelDB = defaultDb): Promise<Conflict[]> {
  if (!rows.length) return [];
  const conflicts: Conflict[] = [];
  await d.transaction("rw", [d.syncMeta, d.syncState, d.conflicts, d.trips, d.places, d.bookings, d.days, d.sources, d.checks, d.prep, d.log], async () => {
    const metas = new Map((await d.syncMeta.where({ tripId }).toArray()).map((m) => [m.key, m]));
    const st = await state(d, tripId);
    let clock = st.clock;

    for (const row of rows) {
      const key = metaKey(tripId, row.kind, row.id);
      const m = metas.get(key) ?? { key, tripId, kind: row.kind, id: row.id, shadow: {}, ts: {}, base: {}, dirty: [] };
      const local = { data: pick(m.shadow, m.dirty), ts: pick(m.ts, m.dirty) };
      const merged = mergeLww({ data: row.data, ts: row.field_ts }, local);

      // Visible alert when a confirmed booking was changed on both sides since the last sync.
      if (row.kind === "booking" && m.dirty.length) {
        const remoteChanged = Object.keys(row.field_ts).filter((f) => (row.field_ts[f] ?? -1) !== (m.base[f] ?? -1));
        const confirmed = m.shadow.status === "confirmed" || row.data.status === "confirmed";
        if (confirmed && remoteChanged.length) {
          const fields = [...new Set([...m.dirty, ...remoteChanged])].filter((f) => !same(m.shadow[f], row.data[f]));
          if (fields.length)
            conflicts.push({
              id: newId(), tripId, recordId: row.id, at: new Date().toISOString(),
              title: String((merged.data.title as { text?: string })?.text ?? row.id),
              fields: fields.map((f) => ({ field: f, mine: m.shadow[f], theirs: row.data[f], kept: same(merged.data[f], m.shadow[f]) ? "mine" : "theirs" })),
            });
        }
      }

      const dirty = m.dirty.filter((f) => (m.ts[f] ?? 0) > (row.field_ts[f] ?? -1));
      metas.set(key, { ...m, shadow: merged.data, ts: merged.ts, base: row.field_ts, dirty });
      for (const t of Object.values(row.field_ts)) if (t > clock) clock = t;
    }

    // Rebuild the trip from all known records and replace the local copy.
    const recs: Rec[] = [...metas.values()].map((m) => ({ kind: m.kind, id: m.id, data: m.shadow }));
    const tripRec = recs.find((r) => r.kind === "trip");
    if (tripRec && !tripRec.data[DELETED]) await replaceTrip(tripId, implode(recs), d);
    else if (tripRec) await removeTripLocal(tripId, d); // deleted by another member
    await d.syncMeta.bulkPut([...metas.values()]);
    if (conflicts.length) await d.conflicts.bulkPut(conflicts);
    await d.syncState.put({ ...st, clock });
  });
  return conflicts;
}

export async function pull(tripId: string, t: Transport, d: TravelDB = defaultDb) {
  let pulled = 0;
  const conflicts: Conflict[] = [];
  for (;;) {
    const st = await state(d, tripId);
    const rows = await t.pull(tripId, st.lastRev, 500);
    if (!rows.length) break;
    conflicts.push(...(await applyRemote(tripId, rows, d)));
    const lastRev = Math.max(st.lastRev, ...rows.map((r) => Number(r.rev ?? 0)));
    await d.syncState.put({ ...(await state(d, tripId)), lastRev });
    pulled += rows.length;
    if (rows.length < 500) break;
  }
  return { pulled, conflicts };
}

export async function push(tripId: string, t: Transport, d: TravelDB = defaultDb) {
  const dirty = (await d.syncMeta.where({ tripId }).toArray()).filter((m) => m.dirty.length);
  let pushed = 0;
  for (let i = 0; i < dirty.length; i += 200) {
    const batch = dirty.slice(i, i + 200);
    const rows = batch.map((m) => ({ kind: m.kind, id: m.id, data: pick(m.shadow, m.dirty), field_ts: pick(m.ts, m.dirty) }));
    const stored = await t.push(tripId, rows);
    await applyRemote(tripId, stored, d);
    pushed += batch.length;
  }
  return pushed;
}

let running: Promise<unknown> = Promise.resolve();

/** One full cycle: stamp local edits, pull, push. Calls are serialised. */
export function sync(tripId: string, t: Transport, d: TravelDB = defaultDb) {
  const job = running.then(async () => {
    await recordLocalChanges(tripId, {}, d);
    try {
      const { pulled, conflicts } = await pull(tripId, t, d);
      const pushed = await push(tripId, t, d);
      await d.syncState.put({ ...(await state(d, tripId)), lastSync: new Date().toISOString(), error: undefined });
      return { pulled, pushed, conflicts };
    } catch (e) {
      await d.syncState.put({ ...(await state(d, tripId)), error: e instanceof Error ? e.message : String(e) });
      throw e;
    }
  });
  running = job.catch(() => undefined);
  return job;
}
