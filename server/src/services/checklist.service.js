const supabaseAdmin = require('../config/supabaseAdminClient');

/**
 * Ensures the "always" static checklist items exist for an appointment.
 */
async function ensureStaticChecklistItems(appointmentId, patientId) {
  const { data: staticRules, error: rulesError } = await supabaseAdmin
    .from('checklist_rule_templates')
    .select('label')
    .eq('trigger_type', 'always')
    .eq('is_active', true);

  if (rulesError) {
    throw new Error(`Failed to load checklist rules: ${rulesError.message}`);
  }

  const { data: existingItems, error: existingError } = await supabaseAdmin
    .from('pre_visit_checklist_items')
    .select('label')
    .eq('appointment_id', appointmentId);

  if (existingError) {
    throw new Error(`Failed to load existing checklist items: ${existingError.message}`);
  }

  const existingLabels = new Set((existingItems || []).map((i) => i.label));
  const toInsert = (staticRules || [])
    .filter((rule) => !existingLabels.has(rule.label))
    .map((rule) => ({
      appointment_id: appointmentId,
      patient_id: patientId,
      label: rule.label,
      source: 'static',
    }));

  if (toInsert.length === 0) return [];

  const { data: inserted, error: insertError } = await supabaseAdmin
    .from('pre_visit_checklist_items')
    .insert(toInsert)
    .select();

  if (insertError) {
    throw new Error(`Failed to insert static checklist items: ${insertError.message}`);
  }

  return inserted;
}

/**
 * Adds an AI-generated checklist item when the OCR engine fails to read a report.
 */
async function addAiGeneratedChecklistItem({ appointmentId, patientId, label, sourceRef }) {
  const { data, error } = await supabaseAdmin
    .from('pre_visit_checklist_items')
    .insert({
      appointment_id: appointmentId,
      patient_id: patientId,
      label,
      source: 'ai_generated',
      source_ref: sourceRef,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to insert AI-generated checklist item: ${error.message}`);
  }

  return data;
}

module.exports = { ensureStaticChecklistItems, addAiGeneratedChecklistItem };
