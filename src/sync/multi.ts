// Synchronises every trip of the account: trips created on this phone, trips shared by an
// invitation, and trips deleted here (whose deletion must still be sent).
import { db as defaultDb, type TravelDB } from "../db/db";
import { sync, type Transport } from "./engine";

export interface CloudApi extends Transport {
  /** Trips the signed-in user is a member of on the server. */
  myTrips(): Promise<string[]>;
  /** First sync of a local trip: the caller becomes owner unless the trip already has members. */
  claim(tripId: string): Promise<"owner" | "member" | "forbidden">;
  acceptInvites(): Promise<void>;
}

export interface SyncAllResult { synced: string[]; forbidden: string[]; conflicts: number }

export async function syncAll(api: CloudApi, d: TravelDB = defaultDb): Promise<SyncAllResult> {
  await api.acceptInvites();
  const local = new Set((await d.trips.toArray()).map((t) => t.id));
  const known = new Set((await d.syncMeta.toArray()).map((m) => m.tripId));
  const remote = new Set(await api.myTrips());
  const res: SyncAllResult = { synced: [], forbidden: [], conflicts: 0 };
  for (const tripId of new Set([...local, ...known, ...remote])) {
    if (!remote.has(tripId)) {
      // Not on the server for this account yet: claim it if it still exists here.
      if (!local.has(tripId)) continue;
      const r = await api.claim(tripId);
      if (r === "forbidden") { res.forbidden.push(tripId); continue; }
    }
    const out = await sync(tripId, api, d);
    res.conflicts += out.conflicts.length;
    res.synced.push(tripId);
  }
  return res;
}
