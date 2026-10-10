// Embedded PostgreSQL running the real migration, with a stub of Supabase's auth schema (tests only).
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import type { Transport, WireRow } from "../src/sync/engine";
import type { CloudApi } from "../src/sync/multi";

const SQL = readFileSync(new URL("./migrations/0001_sync.sql", import.meta.url), "utf8");
const STORAGE_SQL = readFileSync(new URL("./migrations/0002_storage.sql", import.meta.url), "utf8");
const STUB = `
create schema auth;
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
create function auth.jwt() returns jsonb language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb $$;
create role anon; create role authenticated;
grant usage on schema public, auth to authenticated, anon;
-- Minimal stand-in for Supabase Storage tables (same names and helper).
create schema storage;
create table storage.buckets (id text primary key, name text, public boolean);
create table storage.objects (bucket_id text, name text, owner uuid default auth.uid());
alter table storage.objects enable row level security;
create function storage.foldername(name text) returns text[] language sql immutable as $$
  select (string_to_array(name, '/'))[1:array_length(string_to_array(name, '/'), 1) - 1] $$;
grant usage on schema storage to authenticated;
grant select, insert, update, delete on storage.objects to authenticated;
`;

export interface User { id: string; email: string }

export async function startServer() {
  const pg = new PGlite();
  await pg.exec(STUB);
  await pg.exec(SQL);
  await pg.exec(STORAGE_SQL);
  let queue: Promise<unknown> = Promise.resolve();
  // One connection: queries run one at a time, each under the given user's identity.
  const as = <T>(u: User, sql: string, params: unknown[] = []) => {
    const job = queue.then(async () => {
      await pg.exec(`reset role; set request.jwt.claim.sub = '${u.id}'; set request.jwt.claims = '${JSON.stringify({ sub: u.id, email: u.email })}'; set role authenticated;`);
      try { return (await pg.query<T>(sql, params)).rows; } finally { await pg.exec("reset role;"); }
    });
    queue = job.catch(() => undefined);
    return job;
  };
  const transport = (u: User): Transport => ({
    pull: (tripId, sinceRev, limit) =>
      as<WireRow>(u, "select kind, id, data, field_ts, rev from records where trip_id = $1 and rev > $2 order by rev limit $3", [tripId, sinceRev, limit]),
    push: (tripId, rows) => as<WireRow>(u, "select kind, id, data, field_ts, rev from push_records($1, $2::jsonb)", [tripId, JSON.stringify(rows)]),
  });
  const api = (u: User): CloudApi => ({
    ...transport(u),
    myTrips: async () => (await as<{ trip_id: string }>(u, "select trip_id from trip_members where user_id = $1", [u.id])).map((r) => r.trip_id),
    claim: async (tripId) => (await as<{ claim_trip: "owner" | "member" | "forbidden" }>(u, "select claim_trip($1)", [tripId]))[0].claim_trip,
    acceptInvites: async () => { await as(u, "select accept_invites()"); },
  });
  return { pg, as, transport, api };
}
