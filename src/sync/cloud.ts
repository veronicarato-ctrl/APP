// Supabase connection (optional). Without the two public settings below the app runs fully local.
// The anon/publishable key is designed to be public: access is enforced by row level security.
// The Claude API key never goes here (SPEC 3.5).
import { createClient, type Session, type SupabaseClient } from "@supabase/supabase-js";
import { useSyncExternalStore } from "react";
import { db } from "../db/db";
import { onLocalWrite, setActor } from "../db/repo";
import { pendingCount, recordLocalChanges, type WireRow } from "./engine";
import { syncAll, type CloudApi } from "./multi";
import { syncFiles } from "./files";

const URL_ = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const cloud: SupabaseClient | null = URL_ && KEY ? createClient(URL_, KEY, { auth: { persistSession: true, detectSessionInUrl: true } }) : null;

export type SyncPhase = "local" | "signedOut" | "idle" | "syncing" | "offline" | "unreachable" | "forbidden" | "error";

export interface CloudStatus {
  phase: SyncPhase;
  email?: string;
  pending: number;
  lastSync?: string;
  error?: string;
  members: { email: string | null; role: string }[];
}

let status: CloudStatus = { phase: cloud ? "signedOut" : "local", pending: 0, members: [] };
const subs = new Set<() => void>();
const set = (p: Partial<CloudStatus>) => { status = { ...status, ...p }; subs.forEach((f) => f()); };
export const useCloudStatus = () => useSyncExternalStore((f) => { subs.add(f); return () => subs.delete(f); }, () => status);

function api(c: SupabaseClient, userId: string): CloudApi {
  return {
    async pull(tripId, sinceRev, limit) {
      const { data, error } = await c.from("records").select("kind, id, data, field_ts, rev").eq("trip_id", tripId).gt("rev", sinceRev).order("rev").limit(limit);
      if (error) throw error;
      return data as WireRow[];
    },
    async push(tripId, rows) {
      const { data, error } = await c.rpc("push_records", { p_trip: tripId, p_rows: rows });
      if (error) throw error;
      return data as WireRow[];
    },
    async myTrips() {
      const { data, error } = await c.from("trip_members").select("trip_id").eq("user_id", userId);
      if (error) throw error;
      return (data as { trip_id: string }[]).map((r) => r.trip_id);
    },
    async claim(tripId) {
      const { data, error } = await c.rpc("claim_trip", { p_trip: tripId });
      if (error) throw error;
      return data as "owner" | "member" | "forbidden";
    },
    async acceptInvites() {
      const { error } = await c.rpc("accept_invites");
      if (error) throw error;
    },
  };
}

/** Trip shown on this phone; members and invitations refer to it. */
let tripId: string | undefined;
let session: Session | null = null;
let timer: ReturnType<typeof setTimeout> | undefined;

const refreshPending = async () => {
  const ids = new Set((await db.syncMeta.toArray()).map((m) => m.tripId));
  let n = 0;
  for (const id of ids) n += await pendingCount(id);
  set({ pending: n });
};

export function setCloudTrip(id: string | undefined) {
  tripId = id;
  set({ members: [] });
  refreshMembers();
}

async function refreshMembers() {
  if (!cloud || !tripId || !session) return;
  const { data } = await cloud.from("trip_members").select("email, role").eq("trip_id", tripId);
  set({ members: (data as CloudStatus["members"]) ?? [] });
}

/** Full cycle; failures are classified so the screen can say what to do. */
export async function syncNow() {
  if (!cloud || !session) return refreshPending();
  if (!navigator.onLine) { set({ phase: "offline" }); return refreshPending(); }
  set({ phase: "syncing" });
  try {
    const res = await syncAll(api(cloud, session.user.id));
    for (const id of res.synced) await syncFiles(id, cloud);
    const st = tripId ? await db.syncState.get(tripId) : undefined;
    set({ phase: tripId && res.forbidden.includes(tripId) ? "forbidden" : "idle", lastSync: st?.lastSync ?? new Date().toISOString(), error: undefined });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String((e as { message?: string })?.message ?? e);
    const network = /fetch|network|Failed to|Load failed|NetworkError/i.test(msg);
    set({ phase: !navigator.onLine ? "offline" : network ? "unreachable" : "error", error: msg });
  }
  await refreshPending();
  await refreshMembers();
}

const schedule = (ms = 2500) => { clearTimeout(timer); timer = setTimeout(syncNow, ms); };

async function onSignedIn(s: Session) {
  session = s;
  setActor(s.user.email ?? "me");
  set({ email: s.user.email ?? undefined, phase: "idle" });
  await syncNow();
}

/** Starts stamping local edits and, when configured, the sync triggers. */
export function startCloud() {
  onLocalWrite(async (t, d, opts) => {
    await recordLocalChanges(t, opts, d);
    await refreshPending();
    if (session) schedule();
  });
  // Snapshot right away so existing local data has a baseline before any edit.
  db.trips.toArray().then(async (trips) => { for (const t of trips) await recordLocalChanges(t.id); await refreshPending(); });
  if (!cloud) return;

  cloud.auth.getSession().then(({ data }) => { if (data.session) onSignedIn(data.session); });
  cloud.auth.onAuthStateChange((event, s) => {
    if (event === "SIGNED_IN" && s && s.access_token !== session?.access_token) onSignedIn(s);
    if (event === "SIGNED_OUT") { session = null; setActor("me"); set({ phase: "signedOut", email: undefined, members: [] }); }
  });
  window.addEventListener("online", () => schedule(500));
  window.addEventListener("offline", () => set({ phase: session ? "offline" : status.phase }));
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") schedule(500); });
  setInterval(() => { if (session && document.visibilityState === "visible") syncNow(); }, 60_000);
  // Row level security limits these events to the trips the user belongs to.
  cloud.channel("records").on("postgres_changes", { event: "*", schema: "public", table: "records" }, () => schedule(1000)).subscribe();
}

/** Creates the account. Returns true when Supabase asks to confirm the address by e-mail first. */
export async function signUpWithPassword(email: string, password: string) {
  if (!cloud) throw new Error("Sync is not configured");
  const { data, error } = await cloud.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin } });
  if (error) throw error;
  return !data.session;
}

export async function signInWithPassword(email: string, password: string) {
  if (!cloud) throw new Error("Sync is not configured");
  const { error } = await cloud.auth.signInWithPassword({ email, password });
  if (error) throw error;
}

export async function sendSignInEmail(email: string) {
  if (!cloud) throw new Error("Sync is not configured");
  const { error } = await cloud.auth.signInWithOtp({ email, options: { emailRedirectTo: window.location.origin } });
  if (error) throw error;
}

export async function verifyCode(email: string, token: string) {
  if (!cloud) throw new Error("Sync is not configured");
  const { error } = await cloud.auth.verifyOtp({ email, token, type: "email" });
  if (error) throw error;
}

export async function invite(email: string) {
  if (!cloud || !tripId) return;
  const { error } = await cloud.rpc("invite_member", { p_trip: tripId, p_email: email });
  if (error) throw error;
}

export async function signOut() {
  await cloud?.auth.signOut();
}
