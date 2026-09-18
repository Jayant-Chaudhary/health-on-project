-- ============================================================
-- Maternal Health Platform — MVP Schema Migration
-- Target: Supabase (PostgreSQL)
-- ============================================================

create extension if not exists pgcrypto; -- for gen_random_uuid()

-- ============================================================
-- ENUMS
-- ============================================================

create type user_role as enum ('patient', 'clinician', 'receptionist');
create type appointment_status as enum ('invited', 'active', 'checked_in', 'completed', 'cancelled');
create type ocr_status as enum ('pending', 'success', 'partial', 'failed');
create type checklist_source as enum ('static', 'ai_generated');
create type checklist_trigger_type as enum ('always', 'on_ocr_failure', 'on_missing_report');
create type questionnaire_response_type as enum ('yes_no'); -- MVP only supports yes/no

-- ============================================================
-- IDENTITY
-- ============================================================

create table profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  role        user_role not null,
  full_name   text,
  phone       text,
  created_at  timestamptz not null default now()
);

create table patient_details (
  profile_id               uuid primary key references profiles(id) on delete cascade,
  date_of_birth            date,
  emergency_contact_name   text,
  emergency_contact_phone  text
);

-- ============================================================
-- APPOINTMENTS & INVITES
-- ============================================================

create table appointments (
  id            uuid primary key default gen_random_uuid(),
  patient_id    uuid references profiles(id),
  clinician_id  uuid references profiles(id),
  scheduled_at  timestamptz not null,
  status        appointment_status not null default 'invited',
  created_at    timestamptz not null default now()
);

create index idx_appointments_patient on appointments(patient_id);
create index idx_appointments_clinician on appointments(clinician_id);

create table appointment_invites (
  id              uuid primary key default gen_random_uuid(),
  appointment_id  uuid not null unique references appointments(id) on delete cascade,
  patient_email   text not null,
  token           text not null unique,
  expires_at      timestamptz not null,
  used_at         timestamptz,
  created_at      timestamptz not null default now()
);

-- ============================================================
-- VITALS
-- ============================================================

create table vitals_logs (
  id              uuid primary key default gen_random_uuid(),
  patient_id      uuid not null references profiles(id),
  appointment_id  uuid references appointments(id) on delete set null,
  metric_key      text not null,           -- e.g. 'weight'
  value           numeric not null,
  unit            text,
  recorded_at     timestamptz not null default now(),
  source          text not null default 'patient_manual'
);

create index idx_vitals_logs_patient on vitals_logs(patient_id);

-- ============================================================
-- PRE-VISIT QUESTIONNAIRE
-- ============================================================

create table questionnaire_templates (
  id                   uuid primary key default gen_random_uuid(),
  question_text        text not null,
  response_type        questionnaire_response_type not null default 'yes_no',
  is_red_flag_trigger  boolean not null default false,
  sort_order           integer not null default 0,
  is_active            boolean not null default true
);

create table questionnaire_responses (
  id              uuid primary key default gen_random_uuid(),
  appointment_id  uuid not null references appointments(id) on delete cascade,
  patient_id      uuid not null references profiles(id),
  template_id     uuid not null references questionnaire_templates(id),
  answer          boolean not null,
  created_at      timestamptz not null default now()
);

create index idx_questionnaire_responses_appointment on questionnaire_responses(appointment_id);

-- ============================================================
-- LAB REPORTS & STANDARDIZATION
-- ============================================================

create table lab_reports (
  id               uuid primary key default gen_random_uuid(),
  patient_id       uuid not null references profiles(id),
  appointment_id   uuid references appointments(id) on delete set null,
  storage_path     text not null,           -- Supabase Storage, bucket: lab-reports
  uploaded_at      timestamptz not null default now(),
  ocr_status       ocr_status not null default 'pending',
  raw_ocr_payload  jsonb,                   -- exact JSON handed back by the OCR pipeline
  report_date      date                     -- date printed on physical report
);

create index idx_lab_reports_patient on lab_reports(patient_id);

create table metric_dictionary (
  standard_key   text primary key,          -- e.g. 'hemoglobin'
  display_name   text not null,             -- e.g. 'Hemoglobin'
  category       text,                      -- e.g. 'blood'
  unit_standard  text,                      -- e.g. 'g/dL'
  aliases        text[] not null default '{}',  -- e.g. {HB, HGB, Hb, haemoglobin}
  is_active      boolean not null default true
);

create table lab_report_metrics (
  id               uuid primary key default gen_random_uuid(),
  lab_report_id    uuid not null references lab_reports(id) on delete cascade,
  raw_key          text not null,           -- exactly as returned, e.g. "HGB"
  standard_key     text references metric_dictionary(standard_key), -- null until matched
  raw_value        text,                    -- kept as-is; OCR text can be messy
  parsed_value     numeric,                 -- cleaned numeric value once matched/converted
  unit_raw         text,
  unit_standard    text,
  confidence_score numeric,
  needs_review     boolean not null default false, -- true => feeds "AI Triage Alerts"
  reviewed_by      uuid references profiles(id),
  reviewed_value   numeric,
  created_at       timestamptz not null default now()
);

create index idx_lab_report_metrics_report on lab_report_metrics(lab_report_id);
create index idx_lab_report_metrics_standard_key on lab_report_metrics(standard_key);

-- ============================================================
-- PRE-VISIT CHECKLIST
-- ============================================================

create table checklist_rule_templates (
  id            uuid primary key default gen_random_uuid(),
  label         text not null,              -- e.g. 'Bring ID'
  trigger_type  checklist_trigger_type not null default 'always',
  is_active     boolean not null default true
);

create table pre_visit_checklist_items (
  id              uuid primary key default gen_random_uuid(),
  appointment_id  uuid not null references appointments(id) on delete cascade,
  patient_id      uuid not null references profiles(id),
  label           text not null,
  source          checklist_source not null default 'static',
  source_ref      uuid,                     -- e.g. lab_report_id
  is_completed    boolean not null default false,
  created_at      timestamptz not null default now()
);

create index idx_pre_visit_checklist_items_appointment on pre_visit_checklist_items(appointment_id);

-- ============================================================
-- POST-VISIT
-- ============================================================

create table consultation_notes (
  id              uuid primary key default gen_random_uuid(),
  appointment_id  uuid not null unique references appointments(id) on delete cascade,
  clinician_id    uuid not null references profiles(id),
  notes_text      text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create table prescriptions (
  id                  uuid primary key default gen_random_uuid(),
  appointment_id      uuid not null references appointments(id) on delete cascade,
  storage_path        text not null,        -- Supabase Storage, bucket: prescriptions
  typed_instructions  text,
  created_at          timestamptz not null default now()
);

create table post_visit_action_items (
  id              uuid primary key default gen_random_uuid(),
  appointment_id  uuid not null references appointments(id) on delete cascade,
  patient_id      uuid not null references profiles(id),
  label           text not null,
  is_completed    boolean not null default false,
  created_at      timestamptz not null default now()
);

create index idx_post_visit_action_items_appointment on post_visit_action_items(appointment_id);

create table quick_action_templates (
  id         uuid primary key default gen_random_uuid(),
  label      text not null,                 -- e.g. 'Prescribe Iron'
  category   text,
  is_active  boolean not null default true
);

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

alter table profiles enable row level security;
alter table patient_details enable row level security;
alter table appointments enable row level security;
alter table appointment_invites enable row level security;
alter table vitals_logs enable row level security;
alter table questionnaire_templates enable row level security;
alter table questionnaire_responses enable row level security;
alter table lab_reports enable row level security;
alter table metric_dictionary enable row level security;
alter table lab_report_metrics enable row level security;
alter table checklist_rule_templates enable row level security;
alter table pre_visit_checklist_items enable row level security;
alter table consultation_notes enable row level security;
alter table prescriptions enable row level security;
alter table post_visit_action_items enable row level security;
alter table quick_action_templates enable row level security;

-- Default basic policies for user self-access
create policy "Users can view their own profile" on profiles
  for select using (auth.uid() = id);

create policy "Users can update their own profile" on profiles
  for update using (auth.uid() = id);

create policy "Patients can view own vitals" on vitals_logs
  for select using (auth.uid() = patient_id);

create policy "Patients can insert own vitals" on vitals_logs
  for insert with check (auth.uid() = patient_id);
