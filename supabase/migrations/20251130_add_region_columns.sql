-- Add region slug tracking for merchants and events
alter table merchants
  add column if not exists region text;

alter table events
  add column if not exists region text not null default 'Unknown';

-- Backfill merchant region slugs from regions table
update merchants
set region = regions.slug
from regions
where merchants.region_id = regions.id
  and (merchants.region is null or merchants.region = '');

-- Backfill event region slugs to keep filtering fast
update events
set region = coalesce(regions.slug, events.region, 'Unknown')
from regions
where events.region_id = regions.id
  and (events.region is null or events.region = '' or events.region = 'Unknown');

create index if not exists events_region_idx on events (region);


