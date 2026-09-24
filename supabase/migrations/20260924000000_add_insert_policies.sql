-- Add missing INSERT and UPDATE policies for onboarding upsert flow

-- Profiles
create policy "Users can insert their own profile" on profiles
  for insert with check (auth.uid() = id);

-- Patient Details
create policy "Users can insert their own patient details" on patient_details
  for insert with check (auth.uid() = profile_id);

create policy "Users can update their own patient details" on patient_details
  for update using (auth.uid() = profile_id);

create policy "Users can view their own patient details" on patient_details
  for select using (auth.uid() = profile_id);

-- Clinician Details
create policy "Users can insert their own clinician details" on clinician_details
  for insert with check (auth.uid() = profile_id);

create policy "Users can update their own clinician details" on clinician_details
  for update using (auth.uid() = profile_id);

create policy "Users can view their own clinician details" on clinician_details
  for select using (auth.uid() = profile_id);
