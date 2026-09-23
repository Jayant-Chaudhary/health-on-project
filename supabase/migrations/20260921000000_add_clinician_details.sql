-- Add clinician_details table to complement patient_details

create table clinician_details (
  profile_id               uuid primary key references profiles(id) on delete cascade,
  specialty                text,
  license_number           text
);

-- Enable RLS
alter table clinician_details enable row level security;
