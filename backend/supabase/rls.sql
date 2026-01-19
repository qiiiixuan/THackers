-- Suggested RLS policies for MIINDS Connect
-- Enable RLS on core tables

alter table public.users enable row level security;
alter table public.student_profiles enable row level security;
alter table public.caregiver_profiles enable row level security;
alter table public.caregiver_students enable row level security;
alter table public.events enable row level security;
alter table public.event_signups enable row level security;

-- Users: view/update own profile; staff can view all
create policy "users_select_self"
on public.users for select
using (auth.uid() = id);

create policy "users_select_staff"
on public.users for select
using (
  exists (
    select 1 from public.users u
    where u.id = auth.uid() and u.role = 'STAFF'
  )
);

create policy "users_update_self"
on public.users for update
using (auth.uid() = id);

-- Student profiles: student, linked caregiver, or staff
create policy "student_profiles_select_student"
on public.student_profiles for select
using (auth.uid() = user_id);

create policy "student_profiles_select_linked_caregiver"
on public.student_profiles for select
using (
  exists (
    select 1 from public.caregiver_students cs
    where cs.student_id = user_id and cs.caregiver_id = auth.uid()
  )
);

create policy "student_profiles_select_staff"
on public.student_profiles for select
using (
  exists (
    select 1 from public.users u
    where u.id = auth.uid() and u.role = 'STAFF'
  )
);

-- Caregiver profiles: caregiver or staff
create policy "caregiver_profiles_select_self"
on public.caregiver_profiles for select
using (auth.uid() = user_id);

create policy "caregiver_profiles_select_staff"
on public.caregiver_profiles for select
using (
  exists (
    select 1 from public.users u
    where u.id = auth.uid() and u.role = 'STAFF'
  )
);

-- Caregiver-student links: both parties can view
create policy "caregiver_students_select_linked"
on public.caregiver_students for select
using (auth.uid() = caregiver_id or auth.uid() = student_id);

-- Events: readable by all authenticated users
create policy "events_select_authenticated"
on public.events for select
using (auth.uid() is not null);

-- Event signups: attendee, caregiver link, or event creator
create policy "event_signups_select_self_or_linked"
on public.event_signups for select
using (
  auth.uid() = user_id
  or exists (
    select 1 from public.caregiver_students cs
    where cs.student_id = user_id and cs.caregiver_id = auth.uid()
  )
  or exists (
    select 1 from public.events e
    where e.id = event_id and e.created_by = auth.uid()
  )
);
