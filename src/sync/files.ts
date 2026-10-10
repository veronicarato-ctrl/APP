// Attached tickets and photos: stored on the phone first (works offline), uploaded when signed in,
// and downloaded on the other phone so every ticket is available without network.
import type { SupabaseClient } from "@supabase/supabase-js";
import { db as defaultDb, type TravelDB } from "../db/db";
import { loadState } from "../db/repo";
import { newId } from "../lib/ids";
import type { FileRef } from "../model/types";

export const BUCKET = "trip-files";
const safe = (name: string) => name.normalize("NFKD").replace(/[^\w.-]+/g, "_").slice(-80);

/** Keeps the files on the phone and returns their references, to be saved in the booking. */
export async function keepFiles(tripId: string, bookingId: string, files: File[], d: TravelDB = defaultDb): Promise<FileRef[]> {
  const refs = files.map((f) => {
    const id = newId();
    return { id, name: f.name, type: f.type || "application/octet-stream", size: f.size, path: `${tripId}/${bookingId}/${id}-${safe(f.name)}`, addedAt: new Date().toISOString() };
  });
  await d.blobs.bulkPut(refs.map((r, i) => ({ path: r.path, tripId, blob: files[i], uploaded: false })));
  return refs;
}

export const localBlob = async (path: string, d: TravelDB = defaultDb) => (await d.blobs.get(path))?.blob;

/** Uploads files added on this phone and downloads those added on the other one. */
export async function syncFiles(tripId: string, c: SupabaseClient, d: TravelDB = defaultDb) {
  for (const b of await d.blobs.where({ tripId }).filter((x) => !x.uploaded).toArray()) {
    const { error } = await c.storage.from(BUCKET).upload(b.path, b.blob, { upsert: true, contentType: b.blob.type || undefined });
    if (error) throw error;
    await d.blobs.update(b.path, { uploaded: true });
  }
  const s = await loadState(tripId, d);
  const wanted = (s?.bookings ?? []).flatMap((b) => b.files ?? []);
  for (const f of wanted) {
    if (await d.blobs.get(f.path)) continue;
    const { data, error } = await c.storage.from(BUCKET).download(f.path);
    if (error || !data) continue; // not uploaded yet by the other phone; retried next cycle
    await d.blobs.put({ path: f.path, tripId, blob: data, uploaded: true });
  }
}

/** Opens a file from the phone, or from storage when it is not yet copied here. */
export async function openFile(f: FileRef, c: SupabaseClient | null, d: TravelDB = defaultDb) {
  let blob = await localBlob(f.path, d);
  if (!blob && c) {
    const { data } = await c.storage.from(BUCKET).download(f.path);
    if (data) { blob = data; await d.blobs.put({ path: f.path, tripId: f.path.split("/")[0], blob, uploaded: true }); }
  }
  if (!blob) return false;
  const url = URL.createObjectURL(blob);
  window.open(url, "_blank", "noopener");
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
  return true;
}
