const supabaseAdmin = require('../config/supabaseAdminClient');
const { standardizeMetrics } = require('../services/standardization/standardizeLabReport.service');
const { maybeFlagReportForTriage, getTriageQueue } = require('../services/triage.service');
const { extractFromFile } = require('../services/ocr.service');
const {
  LAB_REPORTS_BUCKET,
  uploadFile,
  createSignedUrl,
  removeFile,
} = require('../services/storage.service');

/**
 * Writes one report and its standardized metrics.
 *
 * Shared by the JSON ingest route (an external pipeline posting a payload)
 * and the file-upload route, so both land in the database identically.
 */
async function persistReport({ patientId, appointmentId, storagePath, reportDate, ocrStatus, metrics, rawPayload }) {
  const { data: labReport, error: reportError } = await supabaseAdmin
    .from('lab_reports')
    .insert({
      patient_id: patientId,
      appointment_id: appointmentId || null,
      storage_path: storagePath,
      report_date: reportDate || null,
      ocr_status: ocrStatus,
      raw_ocr_payload: rawPayload,
    })
    .select()
    .single();

  if (reportError) throw reportError;

  const standardized = await standardizeMetrics(metrics || []);

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

  // Uploading against an appointment shares it with that appointment too.
  if (appointmentId) {
    await supabaseAdmin
      .from('appointment_lab_reports')
      .upsert({ appointment_id: appointmentId, lab_report_id: labReport.id }, { onConflict: 'appointment_id,lab_report_id' });
  }

  await maybeFlagReportForTriage({ labReport, metrics: savedMetrics });

  return { labReport, metrics: savedMetrics };
}

/**
 * Receives a file, stores it, and runs the extraction pipeline over it.
 *
 * The upload is recorded even when extraction fails: losing a patient's
 * document because OCR had a bad day is worse than a report the clinician
 * has to read manually.
 */
async function uploadReport(req, res, next) {
  let storagePath = null;

  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const patientId = req.user.role === 'clinician' ? req.body.patientId : req.user.id;
    if (!patientId) {
      return res.status(400).json({ error: 'patientId is required' });
    }

    storagePath = await uploadFile({
      bucket: LAB_REPORTS_BUCKET,
      ownerId: patientId,
      buffer: req.file.buffer,
      originalName: req.file.originalname,
      contentType: req.file.mimetype,
    });

    const extracted = await extractFromFile({
      buffer: req.file.buffer,
      originalName: req.file.originalname,
      storagePath,
    });

    const result = await persistReport({
      patientId,
      appointmentId: req.body.appointmentId || null,
      storagePath,
      reportDate: extracted.reportDate,
      ocrStatus: extracted.ocrStatus,
      metrics: extracted.metrics,
      rawPayload: extracted,
    });

    res.status(201).json({
      ...result,
      signedUrl: await createSignedUrl(LAB_REPORTS_BUCKET, storagePath),
      fileName: req.file.originalname,
    });
  } catch (err) {
    // Do not leave an orphaned object behind if the database write failed.
    if (storagePath) await removeFile(LAB_REPORTS_BUCKET, storagePath);
    next(err);
  }
}

/** Share an already-uploaded report with one of the patient's appointments. */
async function shareReportWithAppointment(req, res, next) {
  try {
    const { appointmentId } = req.validated;
    const { reportId } = req.params;

    const owned = await assertReportOwnedBy(reportId, req.user);
    if (!owned.ok) return res.status(owned.status).json({ error: owned.error });

    const appointment = await assertAppointmentOwnedBy(appointmentId, req.user);
    if (!appointment.ok) return res.status(appointment.status).json({ error: appointment.error });

    const { error } = await supabaseAdmin
      .from('appointment_lab_reports')
      .upsert({ appointment_id: appointmentId, lab_report_id: reportId }, { onConflict: 'appointment_id,lab_report_id' });

    if (error) throw error;

    res.status(200).json({ appointmentId, reportId, shared: true });
  } catch (err) {
    next(err);
  }
}

/** Stop sharing a report with an appointment. The report itself is untouched. */
async function unshareReportFromAppointment(req, res, next) {
  try {
    const { reportId, appointmentId } = req.params;

    const owned = await assertReportOwnedBy(reportId, req.user);
    if (!owned.ok) return res.status(owned.status).json({ error: owned.error });

    const { error } = await supabaseAdmin
      .from('appointment_lab_reports')
      .delete()
      .eq('appointment_id', appointmentId)
      .eq('lab_report_id', reportId);

    if (error) throw error;

    res.status(200).json({ appointmentId, reportId, shared: false });
  } catch (err) {
    next(err);
  }
}

/** Delete a report, its metrics (cascade), its shares (cascade) and its file. */
async function deleteReport(req, res, next) {
  try {
    const owned = await assertReportOwnedBy(req.params.reportId, req.user);
    if (!owned.ok) return res.status(owned.status).json({ error: owned.error });

    const { error } = await supabaseAdmin.from('lab_reports').delete().eq('id', req.params.reportId);
    if (error) throw error;

    await removeFile(LAB_REPORTS_BUCKET, owned.report.storage_path);

    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

/** A patient may only touch their own reports; a clinician may read any. */
async function assertReportOwnedBy(reportId, user) {
  const { data: report, error } = await supabaseAdmin
    .from('lab_reports')
    .select('id, patient_id, storage_path')
    .eq('id', reportId)
    .maybeSingle();

  if (error) throw error;
  if (!report) return { ok: false, status: 404, error: 'Report not found' };
  if (user.role !== 'clinician' && report.patient_id !== user.id) {
    return { ok: false, status: 403, error: 'Not authorized for this report' };
  }
  return { ok: true, report };
}

async function assertAppointmentOwnedBy(appointmentId, user) {
  const { data: appointment, error } = await supabaseAdmin
    .from('appointments')
    .select('id, patient_id, clinician_id')
    .eq('id', appointmentId)
    .maybeSingle();

  if (error) throw error;
  if (!appointment) return { ok: false, status: 404, error: 'Appointment not found' };

  const isOwner = appointment.patient_id === user.id || appointment.clinician_id === user.id;
  if (!isOwner) return { ok: false, status: 403, error: 'Not authorized for this appointment' };
  return { ok: true, appointment };
}

async function ingestReport(req, res, next) {
  try {
    const { appointmentId, storagePath, reportDate, metrics, ocrStatus } = req.validated;

    const result = await persistReport({
      patientId: req.user.id,
      appointmentId,
      storagePath,
      reportDate,
      ocrStatus,
      metrics,
      rawPayload: req.body,
    });

    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

/**
 * The patient's report library, or just the reports shared with one
 * appointment when `appointmentId` is given.
 *
 * A clinician reading an appointment sees only what the patient chose to
 * share with it — that choice is the whole point of the join table, so it is
 * enforced here rather than left to the caller.
 */
async function listReportsForPatient(req, res, next) {
  try {
    const patientId = req.user.role === 'clinician' ? req.query.patientId : req.user.id;
    const { appointmentId } = req.query;

    if (!patientId) {
      return res.status(400).json({ error: 'patientId is required' });
    }

    let sharedReportIds = null;
    if (appointmentId) {
      const { data: shares, error: shareError } = await supabaseAdmin
        .from('appointment_lab_reports')
        .select('lab_report_id')
        .eq('appointment_id', appointmentId);

      if (shareError) throw shareError;
      sharedReportIds = shares.map((row) => row.lab_report_id);

      if (sharedReportIds.length === 0) return res.json([]);
    }

    let query = supabaseAdmin
      .from('lab_reports')
      .select('*, lab_report_metrics ( * ), appointment_lab_reports ( appointment_id )')
      .eq('patient_id', patientId)
      .order('uploaded_at', { ascending: false });

    if (sharedReportIds) query = query.in('id', sharedReportIds);

    const { data, error } = await query;
    if (error) throw error;

    // Signed URLs expire, so they are minted per response rather than stored.
    const withUrls = await Promise.all(
      data.map(async (report) => ({
        ...report,
        signed_url: await createSignedUrl(LAB_REPORTS_BUCKET, report.storage_path),
        shared_appointment_ids: (report.appointment_lab_reports || []).map((s) => s.appointment_id),
      }))
    );

    res.json(withUrls);
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
  uploadReport,
  listReportsForPatient,
  getMetricTrend,
  reviewMetric,
  listTriageQueue,
  shareReportWithAppointment,
  unshareReportFromAppointment,
  deleteReport,
};
