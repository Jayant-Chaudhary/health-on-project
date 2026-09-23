import { request } from './apiClient.js';

/** Patients in the clinician's queue, for the sidebar and search. */
export async function fetchPatients() {
  const appointments = await request('/appointments');

  return appointments.map((appointment) => ({
    id: appointment.patient_id,
    name: appointment.patient?.full_name ?? 'Unknown patient',
    mrn: appointment.patient?.mrn ?? '',
    gestationalDays: appointment.patient?.gestational_days ?? null,
    acuity: appointment.acuity ?? 'optimal',
    appointmentId: appointment.id,
  }));
}

/**
 * Everything the dashboard needs for one patient, in one call.
 * The API pieces are fetched in parallel and stitched into the view model the
 * components consume.
 */
export async function fetchPatientDashboard(patientId, appointmentId) {
  const [appointment, responses, reports, checklist, postVisit] = await Promise.all([
    request(`/appointments/${appointmentId}`),
    request(`/questionnaire/responses/${appointmentId}`),
    request(`/lab-reports?patientId=${patientId}`),
    request(`/checklist/${appointmentId}`),
    request(`/post-visit/${appointmentId}`),
  ]);

  return {
    patient: appointment.patient,
    appointment,
    questionnaire: {
      submittedAt: responses[0]?.created_at ?? null,
      answers: responses.map((response) => ({
        id: response.id,
        question: response.template?.question_text ?? '',
        shortLabel: response.template?.short_label ?? response.template?.question_text ?? '',
        answer: response.answer,
        isRedFlagTrigger: response.template?.is_red_flag_trigger ?? false,
        detail: response.detail ?? '',
      })),
    },
    metrics: buildMetrics(reports),
    triageAlerts: buildTriageAlerts(reports),
    notes: { text: postVisit?.notes?.notes_text ?? '', updatedAt: postVisit?.notes?.updated_at ?? null },
    checklist: (checklist ?? []).map((item) => ({
      id: item.id,
      label: item.label,
      category: item.category ?? null,
      isCompleted: item.is_completed,
    })),
    notifications: [],
  };
}

/** Historical series for one metric, for the expanded row chart. */
export async function fetchMetricTrend(standardKey, patientId) {
  const rows = await request(`/lab-reports/trend/${standardKey}?patientId=${patientId}`);

  return rows.map((row) => ({
    date: row.created_at,
    value: Number(row.reviewed_value ?? row.parsed_value),
  }));
}

export async function saveConsultancyNotes(appointmentId, notesText) {
  return request(`/post-visit/${appointmentId}/notes`, { method: 'PUT', body: { notesText } });
}

export async function toggleChecklistItem(itemId, isCompleted) {
  return request(`/checklist/items/${itemId}`, { method: 'PATCH', body: { isCompleted } });
}

export async function addActionItem(appointmentId, label) {
  return request(`/post-visit/${appointmentId}/action-items`, { method: 'POST', body: { label } });
}

/** Doctor types in a value the OCR pipeline could not read confidently. */
export async function resolveTriageAlert(metricId, { standardKey, reviewedValue }) {
  return request(`/lab-reports/metrics/${metricId}/review`, {
    method: 'PATCH',
    body: { standardKey, reviewedValue },
  });
}

// ---------------------------------------------------------------------------
// API → view-model helpers
// ---------------------------------------------------------------------------

/** Latest value per standard_key, with the full series attached for charting. */
function buildMetrics(reports = []) {
  const byKey = new Map();

  for (const report of reports) {
    for (const metric of report.lab_report_metrics ?? []) {
      if (!metric.standard_key) continue;

      const value = metric.reviewed_value ?? metric.parsed_value;
      const entry = byKey.get(metric.standard_key) ?? {
        standardKey: metric.standard_key,
        name: metric.display_name ?? metric.raw_key,
        source: report.source_name ?? 'Lab report',
        unit: metric.unit_standard ?? metric.unit_raw ?? '',
        reference: metric.reference_range ?? '—',
        history: [],
      };

      entry.history.push({ date: report.report_date ?? report.uploaded_at, value: Number(value) });
      byKey.set(metric.standard_key, entry);
    }
  }

  return [...byKey.values()].map((entry) => {
    entry.history.sort((a, b) => new Date(a.date) - new Date(b.date));
    const latest = entry.history.at(-1);
    return {
      ...entry,
      value: latest?.value != null ? String(latest.value) : null,
      recordedAt: latest?.date ?? null,
      status: entry.status ?? 'pending',
    };
  });
}

/** Metrics the OCR pipeline flagged for human review. */
function buildTriageAlerts(reports = []) {
  return reports.flatMap((report) =>
    (report.lab_report_metrics ?? [])
      .filter((metric) => metric.needs_review)
      .map((metric) => ({
        id: metric.id,
        labReportId: report.id,
        metricId: metric.id,
        standardKey: metric.standard_key ?? '',
        label: metric.display_name ?? metric.raw_key,
        reportName: report.source_name ?? 'Uploaded lab report',
        reportDate: report.report_date ?? report.uploaded_at,
        confidence: metric.confidence_score ?? null,
        reason: metric.standard_key
          ? 'Value could not be read confidently.'
          : 'Parameter name did not match the metric dictionary.',
        imageUrl: report.signed_url ?? null,
      }))
  );
}
