begin;

alter table public.activities
  add column if not exists region_id uuid references public.regions(id) on delete restrict;

with default_region as (
  select id
  from public.regions
  where slug = 'blacksburg'
  limit 1
),
fallback_region as (
  select id
  from public.regions
  order by created_at
  limit 1
),
target_region as (
  select coalesce(
    (select id from default_region),
    (select id from fallback_region)
  ) as id
)
update public.activities
set region_id = target_region.id
from target_region
where public.activities.region_id is null
  and target_region.id is not null;

alter table public.activities
  alter column region_id set not null;

create index if not exists idx_activities_region_id on public.activities(region_id);

commit;

