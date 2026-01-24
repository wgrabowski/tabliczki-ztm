-- migration: create sets and set_items (mvp)
-- created at (utc): 2026-01-16 19:51:04
--
-- purpose:
-- - create user-owned "dashboard sets" and their pinned stop items
-- - enforce hard limits (6 sets per user, 6 items per set) in the database
-- - enable row level security (rls) with strict owner-only access
--
-- affected objects:
-- - extension: pgcrypto (for gen_random_uuid())
-- - tables: public.sets, public.set_items
-- - indexes: sets_user_id_idx, sets_user_id_btrim_name_uniq,
--            set_items_set_id_idx, set_items_set_id_position_idx, set_items_set_id_stop_id_uniq
-- - rls policies: per-table, per-action (select/insert/update/delete), per-role (anon/authenticated)
-- - functions: public.enforce_sets_limit(), public.enforce_set_items_limit_and_position(),
--              public.enforce_set_items_immutable()
-- - triggers: sets_limit_bi, set_items_limit_position_bi, set_items_immutable_bu
--
-- notes:
-- - sql keywords are written in lowercase to match project guidelines.
-- - the plan specifies case-sensitive uniqueness for names, ignoring leading/trailing spaces.
--   we implement this with a unique index on (user_id, btrim(name)).
-- - the plan specifies fixed error messages for limits; these are raised verbatim (including case).
-- - "position" is 1-based and can have gaps (we use max(position)+1).

begin;

-- required for gen_random_uuid() in this schema.
create extension if not exists pgcrypto;

-- -----------------------------------------------------------------------------
-- table: public.sets
-- -----------------------------------------------------------------------------
create table if not exists public.sets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  -- validation (trim outer spaces only; internal spaces are allowed)
  constraint sets_name_not_blank check (char_length(btrim(name)) > 0),
  constraint sets_name_max_10 check (char_length(btrim(name)) <= 10)
);

comment on table public.sets is
  'user-owned sets of pinned stop boards (mvp).';

comment on column public.sets.user_id is
  'owner id (supabase auth.users). rls enforces owner-only access.';

comment on column public.sets.name is
  'display name. must be non-empty after trimming and <= 10 chars.';

-- indexes
create index if not exists sets_user_id_idx on public.sets (user_id);

-- uniqueness per user, case-sensitive, ignoring leading/trailing spaces.
create unique index if not exists sets_user_id_btrim_name_uniq
  on public.sets (user_id, btrim(name));

-- rls
alter table public.sets enable row level security;
-- defense-in-depth: ensure even table owners can't bypass rls accidentally.
alter table public.sets force row level security;

-- policies must be granular: one per action and per role (anon/authenticated).
-- sets are private user configuration; anon has no access.

create policy sets_select_anon
  on public.sets
  for select
  to anon
  using (false);

comment on policy sets_select_anon on public.sets is
  'anon has no access to private user configuration.';

create policy sets_insert_anon
  on public.sets
  for insert
  to anon
  with check (false);

comment on policy sets_insert_anon on public.sets is
  'anon cannot create sets.';

create policy sets_update_anon
  on public.sets
  for update
  to anon
  using (false)
  with check (false);

comment on policy sets_update_anon on public.sets is
  'anon cannot update sets.';

create policy sets_delete_anon
  on public.sets
  for delete
  to anon
  using (false);

comment on policy sets_delete_anon on public.sets is
  'anon cannot delete sets.';

-- authenticated: owner-only access. we rely on auth.uid() provided by supabase.

create policy sets_select_authenticated
  on public.sets
  for select
  to authenticated
  using (user_id = auth.uid());

comment on policy sets_select_authenticated on public.sets is
  'authenticated users can read only their own sets (owner-only).';

create policy sets_insert_authenticated
  on public.sets
  for insert
  to authenticated
  with check (user_id = auth.uid());

comment on policy sets_insert_authenticated on public.sets is
  'authenticated users can create sets only for themselves (user_id must equal auth.uid()).';

create policy sets_update_authenticated
  on public.sets
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

comment on policy sets_update_authenticated on public.sets is
  'authenticated users can update only their own sets, and cannot transfer ownership.';

create policy sets_delete_authenticated
  on public.sets
  for delete
  to authenticated
  using (user_id = auth.uid());

comment on policy sets_delete_authenticated on public.sets is
  'authenticated users can delete only their own sets.';

-- -----------------------------------------------------------------------------
-- table: public.set_items
-- -----------------------------------------------------------------------------
create table if not exists public.set_items (
  id uuid primary key default gen_random_uuid(),
  set_id uuid not null references public.sets(id) on delete cascade,
  stop_id integer not null,
  position integer not null,
  constraint set_items_position_min_1 check (position >= 1)
);

comment on table public.set_items is
  'items pinned into a set (stop boards). includes stable ordering via position (1-based).';

comment on column public.set_items.set_id is
  'parent set id. ownership is derived from the referenced set.';

comment on column public.set_items.stop_id is
  'ztm stop id (integer). unique within a set.';

comment on column public.set_items.position is
  '1-based ordering position within a set. gaps allowed.';

-- indexes
create index if not exists set_items_set_id_idx on public.set_items (set_id);
create index if not exists set_items_set_id_position_idx on public.set_items (set_id, position);
create unique index if not exists set_items_set_id_stop_id_uniq on public.set_items (set_id, stop_id);

-- rls
alter table public.set_items enable row level security;
-- defense-in-depth: ensure even table owners can't bypass rls accidentally.
alter table public.set_items force row level security;

-- helper predicate for ownership: the item is accessible if its set belongs to auth.uid().
-- we inline this predicate in each policy for clarity and to keep policies self-contained.

create policy set_items_select_anon
  on public.set_items
  for select
  to anon
  using (false);

comment on policy set_items_select_anon on public.set_items is
  'anon has no access to private user configuration.';

create policy set_items_insert_anon
  on public.set_items
  for insert
  to anon
  with check (false);

comment on policy set_items_insert_anon on public.set_items is
  'anon cannot create set items.';

create policy set_items_update_anon
  on public.set_items
  for update
  to anon
  using (false)
  with check (false);

comment on policy set_items_update_anon on public.set_items is
  'anon cannot update set items.';

create policy set_items_delete_anon
  on public.set_items
  for delete
  to anon
  using (false);

comment on policy set_items_delete_anon on public.set_items is
  'anon cannot delete set items.';

create policy set_items_select_authenticated
  on public.set_items
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.sets s
      where s.id = set_items.set_id
        and s.user_id = auth.uid()
    )
  );

comment on policy set_items_select_authenticated on public.set_items is
  'authenticated users can read items only from sets they own (ownership via public.sets).';

create policy set_items_insert_authenticated
  on public.set_items
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.sets s
      where s.id = set_items.set_id
        and s.user_id = auth.uid()
    )
  );

comment on policy set_items_insert_authenticated on public.set_items is
  'authenticated users can add items only into sets they own (ownership via public.sets).';

create policy set_items_update_authenticated
  on public.set_items
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.sets s
      where s.id = set_items.set_id
        and s.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.sets s
      where s.id = set_items.set_id
        and s.user_id = auth.uid()
    )
  );

comment on policy set_items_update_authenticated on public.set_items is
  'authenticated users can update items only within sets they own; immutability trigger blocks key fields.';

create policy set_items_delete_authenticated
  on public.set_items
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.sets s
      where s.id = set_items.set_id
        and s.user_id = auth.uid()
    )
  );

comment on policy set_items_delete_authenticated on public.set_items is
  'authenticated users can delete items only from sets they own.';

-- -----------------------------------------------------------------------------
-- triggers: hard limits and automatic position assignment
-- -----------------------------------------------------------------------------

-- 1) limit 6 sets per user
create or replace function public.enforce_sets_limit()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_count integer;
begin
  -- guard: user_id must be present (table already enforces not null)
  select count(*) into v_count
  from public.sets
  where user_id = new.user_id;

  if v_count >= 6 then
    raise exception 'MAX_SETS_PER_USER_EXCEEDED: limit=6';
  end if;

  return new;
end;
$$;

comment on function public.enforce_sets_limit() is
  'before insert trigger to enforce max 6 sets per user. raises fixed error message.';

-- destructive (idempotency): drop trigger to ensure it matches function definition above.
drop trigger if exists sets_limit_bi on public.sets;
create trigger sets_limit_bi
before insert on public.sets
for each row
execute function public.enforce_sets_limit();

-- 2) limit 6 items per set + 3) assign position if missing/invalid
create or replace function public.enforce_set_items_limit_and_position()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_count integer;
  v_next_pos integer;
begin
  select count(*) into v_count
  from public.set_items
  where set_id = new.set_id;

  if v_count >= 6 then
    raise exception 'MAX_ITEMS_PER_SET_EXCEEDED: limit=6';
  end if;

  -- if position is null or <= 0, set it to max(position)+1 (gaps allowed).
  if new.position is null or new.position <= 0 then
    select coalesce(max(position) + 1, 1) into v_next_pos
    from public.set_items
    where set_id = new.set_id;

    new.position := v_next_pos;
  end if;

  return new;
end;
$$;

comment on function public.enforce_set_items_limit_and_position() is
  'before insert trigger: enforce max 6 items per set and assign position (1-based, max+1).';

-- destructive (idempotency): drop trigger to ensure it matches function definition above.
drop trigger if exists set_items_limit_position_bi on public.set_items;
create trigger set_items_limit_position_bi
before insert on public.set_items
for each row
execute function public.enforce_set_items_limit_and_position();

-- 4) recommended: immutability of set_items (set and forget)
-- this blocks changes to set_id, stop_id, position. it still allows other columns in the future.
create or replace function public.enforce_set_items_immutable()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if new.set_id is distinct from old.set_id
     or new.stop_id is distinct from old.stop_id
     or new.position is distinct from old.position then
    raise exception 'SET_ITEM_IMMUTABLE';
  end if;

  return new;
end;
$$;

comment on function public.enforce_set_items_immutable() is
  'before update trigger: prevents changes to set_id/stop_id/position to keep ordering stable (mvp).';

-- destructive (idempotency): drop trigger to ensure it matches function definition above.
drop trigger if exists set_items_immutable_bu on public.set_items;
create trigger set_items_immutable_bu
before update on public.set_items
for each row
execute function public.enforce_set_items_immutable();

commit;

