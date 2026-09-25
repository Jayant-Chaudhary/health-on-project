-- ============================================================
-- Each doctor's own checklists.
--
-- A doctor keeps three reusable lists:
--   * pre-visit questions   -> questionnaire_templates (clinician_id set)
--   * consultation items    -> clinician_templates (kind = 'consultation')
--   * action items          -> clinician_templates (kind = 'action')
--
-- Pre-visit questions stay in questionnaire_templates because patients'
-- answers already reference that table.
-- ============================================================

create table if not exists clinician_templates (
  id            uuid primary key default gen_random_uuid(),
  clinician_id  uuid not null references profiles(id) on delete cascade,
  kind          text not null check (kind in ('consultation', 'action')),
  label         text not null,
  sort_order    integer not null default 0,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now()
);

create index if not exists idx_clinician_templates_clinician
  on clinician_templates(clinician_id, kind);

-- ------------------------------------------------------------
-- What the doctor ticked during one consultation. A row existing means
-- "done in this visit"; unticking deletes it. Labels are copied rather than
-- referenced so editing a template never rewrites past consultations.
-- ------------------------------------------------------------
create table if not exists consultation_checklist_items (
  id              uuid primary key default gen_random_uuid(),
  appointment_id  uuid not null references appointments(id) on delete cascade,
  clinician_id    uuid not null references profiles(id),
  label           text not null,
  created_at      timestamptz not null default now(),
  unique (appointment_id, label)
);

create index if not exists idx_consultation_checklist_items_appointment
  on consultation_checklist_items(appointment_id);

-- The API uses the service-role key; with RLS on and no policies the
-- tables are closed to direct client access.
alter table clinician_templates enable row level security;
alter table consultation_checklist_items enable row level security;
