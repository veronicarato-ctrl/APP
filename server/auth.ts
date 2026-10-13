// Only signed-in travellers may use the assistant, so the server's AI key cannot be used by anyone else.
import type { Env } from "./providers";

/** Supabase user id behind a session token, or undefined when the token is missing or invalid. */
export async function userFromToken(token: string | undefined, env: Env, f: typeof fetch = fetch): Promise<string | undefined> {
  const url = env.SUPABASE_URL ?? env.VITE_SUPABASE_URL, anon = env.SUPABASE_ANON_KEY ?? env.VITE_SUPABASE_ANON_KEY;
  if (!token || !url || !anon) return undefined;
  const res = await f(`${url.replace(/\/$/, "")}/auth/v1/user`, { headers: { apikey: anon, Authorization: `Bearer ${token}` } });
  if (!res.ok) return undefined;
  const j = (await res.json()) as { id?: string };
  return typeof j.id === "string" ? j.id : undefined;
}
