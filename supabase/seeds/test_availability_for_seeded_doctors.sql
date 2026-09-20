-- DATOS DE PRUEBA: horarios para las cuentas creadas por scripts/create-test-users.mjs.
-- Ejecutar después de las migraciones y de: pnpm seed:test-users
-- Crea tres cupos por día hábil durante los próximos cinco días; es idempotente.

with seeded_staff as (
  select sm.id as staff_member_id, sm.profile_id, pr.role_code, ss.specialty_id
  from public.staff_member sm
  join public.profile p on p.id=sm.profile_id
  join public.profile_role pr on pr.profile_id=p.id and pr.revoked_at is null
  left join lateral (
    select specialty_id from public.staff_specialty
    where staff_member_id=sm.id and active_from <= current_date and (active_to is null or active_to >= current_date)
    order by is_primary desc, active_from desc limit 1
  ) ss on true
  where p.email in (
    'revision.ana.demo@salud-universitaria.test',
    'revision.carlos.demo@salud-universitaria.test',
    'revision.elena.demo@salud-universitaria.test',
    'dermatologia.demo@salud-universitaria.test',
    'oftalmologia.demo@salud-universitaria.test',
    'interna.demo@salud-universitaria.test',
    'urologia.demo@salud-universitaria.test'
  ) and sm.is_active
), future_days as (
  select day::date as day
  from generate_series(current_date + 1, current_date + 9, interval '1 day') day
  where extract(isodow from day) between 1 and 5
), daily_hours as (
  select * from (values (time '09:00'),(time '10:00'),(time '11:00')) as h(start_time)
), planned_slots as (
  select ss.staff_member_id,ss.profile_id,
    case when ss.role_code='REVIEW_DOCTOR' then null else ss.specialty_id end as specialty_id,
    ((d.day + h.start_time) at time zone 'America/La_Paz') as starts_at,
    ((d.day + h.start_time + interval '45 minutes') at time zone 'America/La_Paz') as ends_at
  from seeded_staff ss cross join future_days d cross join daily_hours h
)
insert into public.availability_slot(staff_member_id,specialty_id,starts_at,ends_at,capacity,booked_count,status,published_at,created_by)
select staff_member_id,specialty_id,starts_at,ends_at,1,0,'PUBLISHED',now(),profile_id
from planned_slots ps
where not exists(
  select 1 from public.availability_slot existing
  where existing.staff_member_id=ps.staff_member_id and existing.starts_at=ps.starts_at
);
