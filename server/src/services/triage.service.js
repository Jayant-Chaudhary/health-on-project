const supabaseAdmin = require('../config/supabaseAdminClient');
const { addAiGeneratedChecklistItem } = require('./checklist.service');

/**
 * Called right after a lab report + its standardized metrics have been saved.
 */
async function maybeFlagReportForTriage({ labReport, metrics }) {
  const anyMetricNeedsReview = metrics.some((m) => m.needs_review);
  const ocrFailedOrPartial = labReport.ocr_status === 'failed' || labReport.ocr_status === 'partial';

  if (!anyMetricNeedsReview && !ocrFailedOrPartial) {
    return null;
  }

  if (!labReport.appointment_id) {
    return null;
  }

  const reportLabel = labReport.report_date
    ? `Bring the physical report from ${labReport.report_date}`
    : 'Bring the physical copy of your recent lab report';

  return addAiGeneratedChecklistItem({
    appointmentId: labReport.appointment_id,
    patientId: labReport.patient_id,
    label: reportLabel,
    sourceRef: labReport.id,
  });
}

/**
 * The clinician-facing triage queue: metrics still needing manual review, from
 * reports the clinician's patients have shared with the clinician's visits.
 */
async function getTriageQueue(clinicianId) {
  const { data: appointments, error: appointmentsError } = await supabaseAdmin
    .from('appointments')
    .select('id')
    .eq('clinician_id', clinicianId);

  if (appointmentsError) {
    throw new Error(`Failed to load triage queue: ${appointmentsError.message}`);
  }

  const appointmentIds = (appointments || []).map((a) => a.id);
  if (appointmentIds.length === 0) return [];

  const { data: shares, error: sharesError } = await supabaseAdmin
    .from('appointment_lab_reports')
    .select('lab_report_id')
    .in('appointment_id', appointmentIds);

  if (sharesError) {
    throw new Error(`Failed to load triage queue: ${sharesError.message}`);
  }

  const reportIds = [...new Set((shares || []).map((s) => s.lab_report_id))];
  if (reportIds.length === 0) return [];

  const { data, error } = await supabaseAdmin
    .from('lab_report_metrics')
    .select(
      `
      id, raw_key, raw_value, standard_key, confidence_score, needs_review, created_at,
      lab_reports ( id, patient_id, storage_path, uploaded_at, ocr_status, report_date )
    `
    )
    .eq('needs_review', true)
    .is('reviewed_by', null)
    .in('lab_report_id', reportIds)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to load triage queue: ${error.message}`);
  }

  return data;
}

module.exports = { maybeFlagReportForTriage, getTriageQueue };
