-- Migration: Add appointment_questionnaires and clinician_id to questionnaire_templates

-- 1. Add clinician_id to templates so doctors have their own list
ALTER TABLE questionnaire_templates 
ADD COLUMN clinician_id uuid REFERENCES profiles(id) ON DELETE CASCADE;

-- 2. Create join table for appointments and questionnaires
CREATE TABLE appointment_questionnaires (
  appointment_id uuid NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  template_id uuid NOT NULL REFERENCES questionnaire_templates(id) ON DELETE CASCADE,
  PRIMARY KEY (appointment_id, template_id)
);

-- Enable RLS
ALTER TABLE appointment_questionnaires ENABLE ROW LEVEL SECURITY;

-- 3. Add policies for the join table
CREATE POLICY "Clinicians can insert appointment_questionnaires for their appointments" 
  ON appointment_questionnaires
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM appointments a 
      WHERE a.id = appointment_questionnaires.appointment_id 
      AND a.clinician_id = auth.uid()
    )
  );

CREATE POLICY "Users can view appointment_questionnaires for their appointments" 
  ON appointment_questionnaires
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM appointments a 
      WHERE a.id = appointment_questionnaires.appointment_id 
      AND (a.clinician_id = auth.uid() OR a.patient_id = auth.uid())
    )
  );

-- 4. Add policies for templates (clinician specific)
-- Drop existing policies if they conflict (for safety) or add new ones
CREATE POLICY "Clinicians can insert their own templates" 
  ON questionnaire_templates
  FOR INSERT WITH CHECK (clinician_id = auth.uid());

CREATE POLICY "Clinicians can view their own templates" 
  ON questionnaire_templates
  FOR SELECT USING (clinician_id = auth.uid() OR clinician_id IS NULL);
