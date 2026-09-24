-- ============================================================
-- Report sharing per appointment, and the profile fields both
-- dashboards need.
-- ============================================================

-- ------------------------------------------------------------
-- 1. A report is the patient's, not an appointment's.
--
-- lab_reports.appointment_id modelled "this report belongs to one
-- appointment", which cannot express what the product needs: a patient
-- uploads reports to their own library once, then chooses which of them to
-- share with each appointment. The same blood panel is often relevant to
-- several visits.
--
-- The column stays (it still records which appointment a report was
-- uploaded during, and older rows rely on it) but it is no longer what
-- decides visibility. This table is.
-- ------------------------------------------------------------
create table if not exists appointment_lab_reports (
  appointment_id  uuid not null references appointments(id) on delete cascade,
  lab_report_id   uuid not null references lab_reports(id) on delete cascade,
  shared_at       timestamptz not null default now(),
  primary key (appointment_id, lab_report_id)
);

create index if not exists idx_appointment_lab_reports_appointment
  on appointment_lab_reports(appointment_id);
create index if not exists idx_appointment_lab_reports_report
  on appointment_lab_reports(lab_report_id);

-- Carry existing single-appointment links over so nothing already uploaded
-- disappears from the clinician's view.
insert into appointment_lab_reports (appointment_id, lab_report_id, shared_at)
select appointment_id, id, uploaded_at
from lab_reports
where appointment_id is not null
on conflict do nothing;

-- ------------------------------------------------------------
-- 2. Patient profile fields.
--
-- The clinician dashboard already displays gestational age, due date,
-- blood type and gravida/para; none of them had anywhere to live, so they
-- could only ever have been hard-coded. Gestational age is derived from
-- due_date rather than stored, because a stored week count is wrong the
-- day after it is written.
-- ------------------------------------------------------------
alter table patient_details
  add column if not exists due_date     date,
  add column if not exists blood_type   text,
  add column if not exists gravida      integer,
  add column if not exists para         integer,
  add column if not exists address      text;

-- ------------------------------------------------------------
-- 3. Keep the name the clinician typed when inviting.
--
-- It was passed to the invite email's greeting and then discarded, so a
-- patient who had not finished onboarding showed as "Unknown patient" on
-- the clinician's own queue.
-- ------------------------------------------------------------
alter table appointment_invites
  add column if not exists patient_full_name text;

-- ------------------------------------------------------------
-- 4. Storage bucket for patient-uploaded lab reports.
-- Private: files are served through short-lived signed URLs.
-- ------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('lab-reports', 'lab-reports', false)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('prescriptions', 'prescriptions', false)
on conflict (id) do nothing;
