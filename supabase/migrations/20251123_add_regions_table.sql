-- Create regions table and link events to regions
create extension if not exists "uuid-ossp";

create table if not exists public.regions (
    id uuid primary key default uuid_generate_v4(),
    name text not null,
    slug text not null unique,
    subtitle text,
    cover_image text,
    is_active boolean not null default true,
    created_at timestamptz not null default now()
);

create index if not exists idx_regions_is_active on public.regions (is_active);

do $$
declare
    v_region_id uuid;
begin
    insert into public.regions (name, slug, subtitle, cover_image, is_active)
    values (
        'Blacksburg',
        'blacksburg',
        'Virginia Tech · Downtown · Nightlife',
        'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=900&q=60',
        true
    )
    on conflict (slug) do update set
        name = excluded.name,
        subtitle = excluded.subtitle,
        cover_image = excluded.cover_image,
        is_active = true
    returning id into v_region_id;

    alter table public.events
        add column if not exists region_id uuid references public.regions(id) on delete restrict;

    if v_region_id is not null then
        update public.events
        set region_id = v_region_id
        where region_id is null;
    end if;

    alter table public.events
        alter column region_id set not null;

        -- ensure merchants table has region support
        alter table public.merchants
            add column if not exists region_id uuid references public.regions(id) on delete restrict;

        if v_region_id is not null then
            update public.merchants
            set region_id = v_region_id
            where region_id is null;
        end if;

        alter table public.merchants
            alter column region_id set not null;
end $$;

create index if not exists idx_merchants_region_id on public.merchants(region_id);

