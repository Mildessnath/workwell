-- WorkWell — initial schema
-- ESP32 -> HiveMQ Cloud -> Python subscriber (service role) -> Postgres -> React (anon/authenticated)
--
-- Write model:
--   * Telemetry tables (readings, status events, alerts) are written ONLY by the
--     subscriber using the service-role key, which bypasses RLS. No insert
--     policies exist for anon/authenticated on those tables.
--   * Thresholds are writable by the device owner (authenticated).
--   * Peekaboo tables are private to each authenticated user.
-- Read model:
--   * A device's telemetry is readable by its owner, or by anyone when
--     devices.is_public = true (development convenience, see seed.sql).

-- ---------------------------------------------------------------- types
create type public.device_status    as enum ('online', 'offline', 'unknown');
create type public.sensor_kind      as enum ('temp', 'hum', 'light', 'sound');
create type public.alert_level      as enum ('warning', 'critical');
create type public.alert_source     as enum ('device', 'subscriber');
create type public.interaction_kind as enum ('pet', 'feed', 'game', 'decorate', 'mood');
create type public.item_type        as enum ('treat', 'decoration');

-- ------------------------------------------------------- updated_at helper
create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- ---------------------------------------------------------------- devices
create table public.devices (
  id                  text primary key check (id ~ '^[a-z0-9_-]{1,64}$'),
  owner_id            uuid references auth.users (id) on delete set null,
  name                text not null default 'WorkWell ESP32' check (char_length(name) <= 80),
  firmware            text check (char_length(firmware) <= 40),
  sample_interval_ms  integer not null default 2500 check (sample_interval_ms between 500 and 600000),
  is_public           boolean not null default false,
  status              public.device_status not null default 'unknown',
  last_seen_at        timestamptz,
  status_changed_at   timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create index devices_owner_idx on public.devices (owner_id);
create trigger devices_updated_at before update on public.devices
  for each row execute function public.set_updated_at();

-- Connection history (LWT / heartbeat / watchdog).
create table public.device_status_events (
  id           bigint generated always as identity primary key,
  device_id    text not null references public.devices (id) on delete cascade,
  status       public.device_status not null,
  rssi         integer check (rssi between -120 and 0),
  ip_address   inet,
  uptime_s     bigint check (uptime_s >= 0),
  firmware     text check (char_length(firmware) <= 40),
  reason       text check (char_length(reason) <= 120),
  reported_at  timestamptz not null,
  received_at  timestamptz not null default now()
);
create index device_status_events_device_time_idx on public.device_status_events (device_id, received_at desc);

-- --------------------------------------------------------- sensor readings
create table public.sensor_readings (
  id             bigint generated always as identity primary key,
  device_id      text not null references public.devices (id) on delete cascade,
  recorded_at    timestamptz not null,               -- device clock (or receive time if absent/invalid)
  received_at    timestamptz not null default now(), -- subscriber clock
  temperature_c  numeric(5, 2) check (temperature_c between -40 and 85),     -- DHT22 range
  humidity_pct   numeric(5, 2) check (humidity_pct between 0 and 100),
  light_lux      numeric(9, 2) check (light_lux between 0 and 120000),       -- BH1750 range
  noise_dba      numeric(5, 2) check (noise_dba between 0 and 140),
  seq            bigint check (seq >= 0),
  constraint sensor_readings_has_value
    check (num_nonnulls(temperature_c, humidity_pct, light_lux, noise_dba) > 0),
  constraint sensor_readings_device_time_uniq unique (device_id, recorded_at)  -- idempotent retries
);
create index sensor_readings_device_time_idx on public.sensor_readings (device_id, recorded_at desc);

-- ------------------------------------------------------------- thresholds
create table public.environment_thresholds (
  device_id         text primary key references public.devices (id) on delete cascade,
  max_temp_c        numeric(4, 1) not null default 26.5 check (max_temp_c between 15 and 40),
  min_light_lux     integer       not null default 300  check (min_light_lux between 0 and 2000),
  max_humidity_pct  integer       not null default 60   check (max_humidity_pct between 20 and 95),
  max_noise_dba     integer       not null default 58   check (max_noise_dba between 30 and 120),
  updated_by        uuid references auth.users (id) on delete set null,
  updated_at        timestamptz not null default now()
);
create trigger environment_thresholds_updated_at before update on public.environment_thresholds
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------- alerts
create table public.environment_alerts (
  id           bigint generated always as identity primary key,
  device_id    text not null references public.devices (id) on delete cascade,
  sensor       public.sensor_kind not null,
  level        public.alert_level not null,
  value        numeric(9, 2),
  threshold    numeric(9, 2),
  message      text not null check (char_length(message) between 1 and 500),
  source       public.alert_source not null,
  reading_id   bigint references public.sensor_readings (id) on delete set null,
  created_at   timestamptz not null default now(),
  resolved_at  timestamptz,
  constraint environment_alerts_resolution_order check (resolved_at is null or resolved_at >= created_at)
);
create index environment_alerts_device_time_idx on public.environment_alerts (device_id, created_at desc);
create index environment_alerts_open_idx on public.environment_alerts (device_id, sensor) where resolved_at is null;

-- ------------------------------------------------------- Peekaboo (per user)
create table public.peekaboo_profiles (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null unique references auth.users (id) on delete cascade,
  display_name  text not null default 'Peekaboo' check (char_length(display_name) between 1 and 40),
  level         integer not null default 1 check (level >= 1),
  xp            integer not null default 0 check (xp >= 0 and xp < 200),  -- 200 XP per level (frontend XP_PER_LEVEL)
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create trigger peekaboo_profiles_updated_at before update on public.peekaboo_profiles
  for each row execute function public.set_updated_at();

create table public.peekaboo_interactions (
  id          bigint generated always as identity primary key,
  profile_id  uuid not null references public.peekaboo_profiles (id) on delete cascade,
  kind        public.interaction_kind not null,
  item_key    text check (item_key ~ '^[a-z0-9_-]{1,40}$'),
  xp_awarded  integer not null default 0 check (xp_awarded between 0 and 1000),
  details     jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);
create index peekaboo_interactions_profile_time_idx on public.peekaboo_interactions (profile_id, created_at desc);

create table public.peekaboo_inventory (
  profile_id   uuid not null references public.peekaboo_profiles (id) on delete cascade,
  item_key     text not null check (item_key ~ '^[a-z0-9_-]{1,40}$'),
  item_type    public.item_type not null,
  quantity     integer not null default 1 check (quantity >= 0),
  equipped     boolean not null default false,
  acquired_at  timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  primary key (profile_id, item_key),
  constraint peekaboo_inventory_only_decorations_equip check (item_type = 'decoration' or equipped = false)
);
create trigger peekaboo_inventory_updated_at before update on public.peekaboo_inventory
  for each row execute function public.set_updated_at();

-- ------------------------------------------------------------ RLS helpers
-- SECURITY DEFINER so policies on child tables can read devices without recursion.
create or replace function public.can_read_device(p_device_id text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.devices d
    where d.id = p_device_id and (d.is_public or d.owner_id = auth.uid())
  );
$$;

create or replace function public.owns_device(p_device_id text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.devices d
    where d.id = p_device_id and d.owner_id is not null and d.owner_id = auth.uid()
  );
$$;

create or replace function public.owns_profile(p_profile_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.peekaboo_profiles p where p.id = p_profile_id and p.user_id = auth.uid());
$$;

-- -------------------------------------------------------------------- RLS
alter table public.devices                enable row level security;
alter table public.device_status_events   enable row level security;
alter table public.sensor_readings        enable row level security;
alter table public.environment_thresholds enable row level security;
alter table public.environment_alerts     enable row level security;
alter table public.peekaboo_profiles      enable row level security;
alter table public.peekaboo_interactions  enable row level security;
alter table public.peekaboo_inventory     enable row level security;

create policy devices_read on public.devices
  for select to anon, authenticated using (is_public or owner_id = auth.uid());
create policy devices_owner_update on public.devices
  for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy status_events_read on public.device_status_events
  for select to anon, authenticated using (public.can_read_device(device_id));
create policy readings_read on public.sensor_readings
  for select to anon, authenticated using (public.can_read_device(device_id));
create policy alerts_read on public.environment_alerts
  for select to anon, authenticated using (public.can_read_device(device_id));
create policy alerts_owner_resolve on public.environment_alerts
  for update to authenticated using (public.owns_device(device_id)) with check (public.owns_device(device_id));

create policy thresholds_read on public.environment_thresholds
  for select to anon, authenticated using (public.can_read_device(device_id));
create policy thresholds_owner_insert on public.environment_thresholds
  for insert to authenticated with check (public.owns_device(device_id));
create policy thresholds_owner_update on public.environment_thresholds
  for update to authenticated using (public.owns_device(device_id)) with check (public.owns_device(device_id));

create policy profiles_owner_all on public.peekaboo_profiles
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy interactions_owner_read on public.peekaboo_interactions
  for select to authenticated using (public.owns_profile(profile_id));
create policy interactions_owner_insert on public.peekaboo_interactions
  for insert to authenticated with check (public.owns_profile(profile_id));
create policy inventory_owner_all on public.peekaboo_inventory
  for all to authenticated using (public.owns_profile(profile_id)) with check (public.owns_profile(profile_id));

-- -------------------------------------------- history aggregation (RPC)
-- SECURITY INVOKER (default): RLS on sensor_readings still applies.
create or replace function public.reading_buckets(p_device_id text, p_range text)
returns table (
  bucket_start   timestamptz,
  temperature_c  numeric,
  humidity_pct   numeric,
  light_lux      numeric,
  noise_dba      numeric,
  samples        bigint
)
language sql stable set search_path = public as $$
  with cfg as (
    select
      case p_range when 'daily' then interval '3 hours'
                   when 'weekly' then interval '1 day'
                   when 'monthly' then interval '7 days' end as step,
      case p_range when 'daily' then interval '24 hours'
                   when 'weekly' then interval '7 days'
                   when 'monthly' then interval '28 days' end as span
  )
  select
    date_bin(cfg.step, r.recorded_at, timestamptz '2000-01-03 00:00:00+00') as bucket_start, -- Monday origin
    round(avg(r.temperature_c), 1) as temperature_c,
    round(avg(r.humidity_pct), 1)  as humidity_pct,
    round(avg(r.light_lux), 0)     as light_lux,
    round(avg(r.noise_dba), 1)     as noise_dba,
    count(*)                       as samples
  from public.sensor_readings r
  cross join cfg
  where cfg.step is not null
    and r.device_id = p_device_id
    and r.recorded_at >= now() - cfg.span
  group by 1
  order by 1;
$$;

grant execute on function public.reading_buckets(text, text) to anon, authenticated;

-- ---------------------------------------------------------------- realtime
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.sensor_readings, public.devices, public.environment_alerts;
  end if;
end $$;
