-- migration: increase set name max length from 10 to 20 characters
-- created at (utc): 2026-01-26 12:00:00
--
-- purpose:
-- - increase maximum set name length from 10 to 20 characters
-- - update database constraint to match updated validation rules
--
-- affected objects:
-- - constraint: public.sets.sets_name_max_10 (dropped and recreated as sets_name_max_20)
-- - comment: public.sets.name column comment updated to reflect new limit
--
-- notes:
-- - this is a backward-compatible change (existing data will remain valid)
-- - frontend validation has been updated to match this new limit

begin;

-- drop old constraint
alter table public.sets
drop constraint if exists sets_name_max_10;

-- add new constraint with increased limit
alter table public.sets
add constraint sets_name_max_20 check (char_length(btrim(name)) <= 20);

-- update column comment to reflect new limit
comment on column public.sets.name is
  'display name. must be non-empty after trimming and <= 20 chars.';

commit;
