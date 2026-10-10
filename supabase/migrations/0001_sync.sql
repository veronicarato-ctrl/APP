-- Travel Guide, synchronisation schema.
-- Run once in the Supabase SQL editor (or with the Supabase CLI). Safe to read top to bottom.
--
-- Model: a trip is stored as small records (one slot, one booking, one day note...).
-- Each record keeps, per field, the timestamp of its last change (field_ts), and push_records merges
-- field by field: an incoming value wins only if its timestamp is strictly newer (same rule as
-- src/sync/merge.ts). `rev` is a global, increasing revision used by clients to pull what changed.

-- Who can access which trip.
create table if not exists public.trip_members (
  trip_id uuid not null,
  user_id uuid not null,
  role text not null default 'editor' check (role in ('owner', 'editor')),
  email text,
  created_at timestamptz not null default now(),
  primary key (trip_id, user_id)
);

-- Pending invitations by e-mail address.
create table if not exists public.trip_invites (
  trip_id uuid not null,
  email text not null,
  invited_by uuid not null,
  created_at timestamptz not null default now(),
  primary key (trip_id, email)
);

create sequence if not exists public.records_rev;

create table if not exists public.records (
  trip_id uuid not null,
  kind text not null,
  id text not null,
  data jsonb not null default '{}'::jsonb,
  field_ts jsonb not null default '{}'::jsonb,
  rev bigint not null default nextval('public.records_rev'),
  updated_by uuid,
  updated_at timestamptz not null default now(),
  primary key (trip_id, kind, id)
);
create index if not exists records_trip_rev on public.records (trip_id, rev);

-- Membership checks run with definer rights so policies do not recurse.
create or replace function public.is_member(p_trip uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from trip_members where trip_id = p_trip and user_id = auth.uid());
$$;

create or replace function public.is_owner(p_trip uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from trip_members where trip_id = p_trip and user_id = auth.uid() and role = 'owner');
$$;

alter table public.trip_members enable row level security;
alter table public.trip_invites enable row level security;
alter table public.records enable row level security;

drop policy if exists members_read on public.trip_members;
create policy members_read on public.trip_members for select using (public.is_member(trip_id));

drop policy if exists invites_owner_all on public.trip_invites;
create policy invites_owner_all on public.trip_invites for all
  using (public.is_owner(trip_id)) with check (public.is_owner(trip_id) and invited_by = auth.uid());

drop policy if exists records_member_read on public.records;
create policy records_member_read on public.records for select using (public.is_member(trip_id));
drop policy if exists records_member_insert on public.records;
create policy records_member_insert on public.records for insert with check (public.is_member(trip_id));
drop policy if exists records_member_update on public.records;
create policy records_member_update on public.records for update using (public.is_member(trip_id)) with check (public.is_member(trip_id));
-- No delete policy: deletions are a field (_deleted) so they synchronise like any change.

revoke all on public.trip_members, public.trip_invites, public.records from anon, authenticated;
grant select on public.trip_members to authenticated;
grant select, insert, delete on public.trip_invites to authenticated;
grant select, insert, update on public.records to authenticated;
grant usage on sequence public.records_rev to authenticated;

-- First sync of a trip: the caller becomes its owner, unless the trip already has members.
create or replace function public.claim_trip(p_trip uuid) returns text
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  if exists (select 1 from trip_members where trip_id = p_trip and user_id = auth.uid()) then return 'member'; end if;
  if exists (select 1 from trip_members where trip_id = p_trip) then return 'forbidden'; end if;
  insert into trip_members (trip_id, user_id, role, email) values (p_trip, auth.uid(), 'owner', auth.jwt() ->> 'email');
  return 'owner';
end $$;

-- Turns the invitations addressed to the caller's e-mail into memberships.
create or replace function public.accept_invites() returns setof uuid
language plpgsql security definer set search_path = public as $$
declare v_email text := lower(auth.jwt() ->> 'email'); r record;
begin
  if auth.uid() is null or v_email is null then return; end if;
  for r in delete from trip_invites where lower(email) = v_email returning trip_id loop
    insert into trip_members (trip_id, user_id, role, email) values (r.trip_id, auth.uid(), 'editor', v_email)
      on conflict do nothing;
    return next r.trip_id;
  end loop;
end $$;

-- Invites someone by e-mail; only the owner of the trip may do it.
create or replace function public.invite_member(p_trip uuid, p_email text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_owner(p_trip) then raise exception 'only the owner can invite'; end if;
  insert into trip_invites (trip_id, email, invited_by) values (p_trip, lower(trim(p_email)), auth.uid())
    on conflict (trip_id, email) do nothing;
end $$;

-- Merges a batch of records field by field and returns the stored result.
-- Runs with the caller's rights, so row level security applies.
create or replace function public.push_records(p_trip uuid, p_rows jsonb) returns setof public.records
language plpgsql security invoker set search_path = public as $$
declare
  r jsonb; cur public.records; k text; t bigint;
  v_data jsonb; v_ts jsonb; changed boolean;
begin
  if not public.is_member(p_trip) then raise exception 'not a member of this trip'; end if;
  for r in select * from jsonb_array_elements(p_rows) loop
    select * into cur from records where trip_id = p_trip and kind = r ->> 'kind' and id = r ->> 'id' for update;
    if not found then
      insert into records (trip_id, kind, id, data, field_ts, updated_by)
        values (p_trip, r ->> 'kind', r ->> 'id', coalesce(r -> 'data', '{}'), coalesce(r -> 'field_ts', '{}'), auth.uid())
        returning * into cur;
    else
      v_data := cur.data; v_ts := cur.field_ts; changed := false;
      for k, t in select key, value::bigint from jsonb_each_text(coalesce(r -> 'field_ts', '{}')) loop
        if t > coalesce((v_ts ->> k)::bigint, -1) then
          v_ts := jsonb_set(v_ts, array[k], to_jsonb(t));
          if (r -> 'data') ? k then v_data := jsonb_set(v_data, array[k], r -> 'data' -> k);
          else v_data := v_data - k; end if;
          changed := true;
        end if;
      end loop;
      if changed then
        update records set data = v_data, field_ts = v_ts, rev = nextval('public.records_rev'),
          updated_by = auth.uid(), updated_at = now()
          where trip_id = p_trip and kind = cur.kind and id = cur.id returning * into cur;
      end if;
    end if;
    return next cur;
  end loop;
end $$;

grant execute on function public.claim_trip(uuid), public.accept_invites(), public.invite_member(uuid, text), public.push_records(uuid, jsonb),
  public.is_member(uuid), public.is_owner(uuid) to authenticated;

-- Live updates between the two phones (Supabase Realtime), when the publication exists.
do $$ begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'records') then
    execute 'alter publication supabase_realtime add table public.records';
  end if;
end $$;
