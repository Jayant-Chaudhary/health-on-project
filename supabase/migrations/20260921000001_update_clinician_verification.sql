-- Add verification and state medical council fields to clinician_details
alter table clinician_details
  add column is_verified boolean default false,
  add column state_medical_council text;
