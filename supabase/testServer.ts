// Embedded PostgreSQL running the real migration, with a stub of Supabase's auth schema (tests only).
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import type { Transport, WireRow } from "../src/sync/engine";

const SQL = readFileSync(new URL("./migrations/0001_sync.sql", import.meta.url), "utf8");
const STUB = `
create schema auth;
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
create function auth.jwt() returns jsonb language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb $$;
create role anon; create role authenticated;
grant usage on schema public, auth to authenticated, anon;
`;

export interface User { id: string; email: string }

export async function startServer() {
  const pg = new PGlite();
  await pg.exec(STUB);
  await pg.exec(SQL);
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
  return { pg, as, transport };
}
