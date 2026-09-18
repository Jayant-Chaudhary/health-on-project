-- ============================================================
-- Maternal Health Platform — Seed Data
-- ============================================================

-- Metric Dictionary initial entries
insert into metric_dictionary (standard_key, display_name, category, unit_standard, aliases) values
  ('hemoglobin', 'Hemoglobin', 'blood', 'g/dL', ARRAY['HB', 'HGB', 'Hb', 'haemoglobin']),
  ('platelets', 'Platelet Count', 'blood', '10^3/µL', ARRAY['PLT', 'Platelets', 'Platelet Count']),
  ('blood_glucose_fasting', 'Fasting Blood Sugar', 'metabolic', 'mg/dL', ARRAY['FBS', 'Fasting Glucose', 'Fasting Blood Sugar']),
  ('blood_pressure_systolic', 'Systolic Blood Pressure', 'vitals', 'mmHg', ARRAY['BP Systolic', 'SBP', 'Systolic']),
  ('blood_pressure_diastolic', 'Diastolic Blood Pressure', 'vitals', 'mmHg', ARRAY['BP Diastolic', 'DBP', 'Diastolic']);

-- Pre-visit Questionnaire Templates (MVP yes/no questions)
insert into questionnaire_templates (question_text, response_type, is_red_flag_trigger, sort_order) values
  ('Have you experienced severe headaches or blurred vision recently?', 'yes_no', true, 1),
  ('Have you noticed sudden swelling in your hands, face, or feet?', 'yes_no', true, 2),
  ('Are you experiencing any vaginal bleeding or fluid leakage?', 'yes_no', true, 3),
  ('Have you felt decreased baby movement over the past 24 hours?', 'yes_no', true, 4),
  ('Are you experiencing fever, chills, or burning sensation during urination?', 'yes_no', true, 5),
  ('Have you taken all prescribed daily prenatal vitamins?', 'yes_no', false, 6);

-- Checklist Rule Templates
insert into checklist_rule_templates (label, trigger_type) values
  ('Bring photo ID and insurance card', 'always'),
  ('Bring previous physical lab reports if available', 'always'),
  ('Upload missing blood panel report', 'on_missing_report'),
  ('Bring physical copy of unreadable report for manual clinician review', 'on_ocr_failure');

-- Quick Action Templates for Clinicians
insert into quick_action_templates (label, category) values
  ('Prescribe Iron Supplement (Oral Ferrous Sulfate)', 'prescription'),
  ('Schedule Follow-up Ultrasound in 2 Weeks', 'appointment'),
  ('Order Repeat Full Blood Count (CBC) Test', 'lab_order'),
  ('Advise Bed Rest & Hydration', 'advice');
