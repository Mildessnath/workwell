-- WorkWell seed: registers device01 with default thresholds.
--
-- DEVELOPMENT CONVENIENCE: is_public = true lets the frontend read this
-- device's telemetry with the anon key (no sign-in UI exists yet).
-- Writes stay blocked for anon. For production: set is_public = false,
-- set owner_id to your auth.users id, and add sign-in to the frontend.

insert into public.devices (id, name, firmware, sample_interval_ms, is_public)
values ('device01', 'WorkWell-ESP32-S3', null, 2500, true)
on conflict (id) do nothing;

insert into public.environment_thresholds (device_id)
values ('device01')
on conflict (device_id) do nothing;
