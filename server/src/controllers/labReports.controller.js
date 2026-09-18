const supabaseAdmin = require('../config/supabaseAdminClient');
const { standardizeMetrics } = require('../services/standardization/standardizeLabReport.service');
const { maybeFlagReportForTriage, getTriageQueue } = require('../services/triage.service');

async function ingestReport(req, res, next) {
  try {
    const { appointmentId, storagePath, reportDate, metrics, ocrStatus } = req.validated;
    const patientId = req.user.id;

    const { data: labReport, error: reportError } = await supabaseAdmin
      .from('lab_reports')
      .insert({
        patient_id: patientId,
        appointment_id: appointmentId || null,
        storage_path: storagePath,
        report_date: reportDate || null,
        ocr_status: ocrStatus,
        raw_ocr_payload: req.body,
      })
      .select()
      .single();

    if (reportError) throw reportError;

    const standardized = await standardizeMetrics(metrics);

    let savedMetrics = [];
    if (standardized.length > 0) {
      const rows = standardized.map((m) => ({ ...m, lab_report_id: labReport.id }));
      const { data: insertedMetrics, error: metricsError } = await supabaseAdmin
        .from('lab_report_metrics')
        .insert(rows)
        .select();

      if (metricsError) throw metricsError;
      savedMetrics = insertedMetrics;
    }

    await maybeFlagReportForTriage({ labReport, metrics: savedMetrics });

    res.status(201).json({ labReport, metrics: savedMetrics });
  } catch (err) {
    next(err);
  }
}

async function listReportsForPatient(req, res, next) {
  try {
    const patientId = req.user.role === 'clinician' ? req.query.patientId : req.user.id;

    if (!patientId) {
      return res.status(400).json({ error: 'patientId is required' });
    }

    const { data, error } = await supabaseAdmin
      .from('lab_reports')
      .select('*, lab_report_metrics ( * )')
      .eq('patient_id', patientId)
      .order('uploaded_at', { ascending: false });

    if (error) throw error;

    res.json(data);
  } catch (err) {
    next(err);
  }
}

async function getMetricTrend(req, res, next) {
  try {
    const { standardKey } = req.params;
    const patientId = req.user.role === 'clinician' ? req.query.patientId : req.user.id;

    if (!patientId) {
      return res.status(400).json({ error: 'patientId is required' });
    }

    const { data, error } = await supabaseAdmin
      .from('lab_report_metrics')
      .select(
        'parsed_value, reviewed_value, unit_standard, created_at, lab_reports!inner ( patient_id, uploaded_at )'
      )
      .eq('standard_key', standardKey)
      .eq('lab_reports.patient_id', patientId)
      .order('created_at', { ascending: true });

    if (error) throw error;

    res.json(data);
  } catch (err) {
    next(err);
  }
}

async function reviewMetric(req, res, next) {
  try {
    const { standardKey, reviewedValue } = req.validated;

    const { data, error } = await supabaseAdmin
      .from('lab_report_metrics')
      .update({
        standard_key: standardKey,
        reviewed_value: reviewedValue,
        reviewed_by: req.user.id,
        needs_review: false,
      })
      .eq('id', req.params.metricId)
      .select()
      .single();

    if (error) throw error;

    res.json(data);
  } catch (err) {
    next(err);
  }
}

async function listTriageQueue(req, res, next) {
  try {
    const data = await getTriageQueue();
    res.json(data);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  ingestReport,
  listReportsForPatient,
  getMetricTrend,
  reviewMetric,
  listTriageQueue,
};
