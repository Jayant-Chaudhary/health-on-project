import { request } from './apiClient.js';

/** Create an appointment, attach its questionnaire and invite the patient. */
export async function createAppointment({
  patientEmail,
  patientFullName,
  scheduledAt,
  questionnaireTemplateIds,
  newQuestions,
}) {
  return request('/api/appointments', {
    method: 'POST',
    body: { patientEmail, patientFullName, scheduledAt, questionnaireTemplateIds, newQuestions },
  });
}

export async function getQuestionnaireTemplates() {
  return request('/api/questionnaire/templates');
}

/** Patients in the clinician's queue, for the sidebar and search. */
export async function fetchPatients() {
  const appointments = await request('/api/appointments');

  return appointments.map((appointment) => ({
    id: appointment.patient_id,
    name: appointment.patient?.full_name ?? appointment.invited_email ?? 'Invited patient',
    // Nothing to open until the patient has accepted and been linked.
    isPending: !appointment.patient_id,
    scheduledAt: appointment.scheduled_at,
    status: appointment.status,
    mrn: '',
    gestationalDays: null,
    acuity: 'pending',
    appointmentId: appointment.id,
  }));
}

/**
 * Everything the dashboard needs for one appointment, in one call.
 * The API pieces are fetched in parallel and stitched into the view model the
 * components consume.
 */
export async function fetchPatientDashboard(patientId, appointmentId) {
  const [appointment, responses, reports, postVisit] = await Promise.all([
    request(`/api/appointments/${appointmentId}`),
    request(`/api/questionnaire/responses/${appointmentId}`),
    // Only what the patient chose to share with this appointment.
    request(`/api/lab-reports?appointmentId=${appointmentId}`),
    request(`/api/post-visit/${appointmentId}`),
  ]);

  return {
    patient: buildPatient(appointment, patientId),
    appointment,
    questionnaire: {
      submittedAt: responses[0]?.created_at ?? null,
      answers: responses.map((response) => {
        const template = response.questionnaire_templates;
        return {
          id: response.id,
          question: template?.question_text ?? '',
          shortLabel: template?.question_text ?? '',
          answer: response.answer,
          isRedFlagTrigger: template?.is_red_flag_trigger ?? false,
          detail: response.detail ?? '',
        };
      }),
    },
    metrics: buildMetrics(reports),
    triageAlerts: buildTriageAlerts(reports),
    notes: { text: postVisit?.notes?.notes_text ?? '', updatedAt: postVisit?.notes?.updated_at ?? null },
    // The clinician's checklist is the patient's post-visit "next steps".
    checklist: (postVisit?.actionItems ?? []).map((item) => ({
      id: item.id,
      label: item.label,
      isCompleted: item.is_completed,
    })),
    notifications: [],
  };
}

/** Historical series for one metric, for the expanded row chart. */
export async function fetchMetricTrend(standardKey, patientId) {
  const rows = await request(`/api/lab-reports/trend/${standardKey}?patientId=${patientId}`);

  return rows.map((row) => ({
    date: row.lab_reports?.report_date ?? row.created_at,
    value: Number(row.reviewed_value ?? row.parsed_value),
  }));
}

export async function saveConsultancyNotes(appointmentId, notesText) {
  return request(`/api/post-visit/${appointmentId}/notes`, { method: 'PUT', body: { notesText } });
}

export async function toggleActionItem(itemId, isCompleted) {
  return request(`/api/post-visit/action-items/${itemId}`, { method: 'PATCH', body: { isCompleted } });
}

export async function addActionItem(appointmentId, label) {
  return request(`/api/post-visit/${appointmentId}/action-items`, { method: 'POST', body: { label } });
}

/** Doctor types in a value the OCR pipeline could not read confidently. */
export async function resolveTriageAlert(metricId, { standardKey, reviewedValue }) {
  return request(`/api/lab-reports/metrics/${metricId}/review`, {
    method: 'PATCH',
    body: {
      reviewedValue,
      ...(standardKey ? { standardKey } : {}),
    },
  });
}

// ---------------------------------------------------------------------------
// API → view-model helpers
// ---------------------------------------------------------------------------

const DAY_MS = 86_400_000;
const GESTATION_DAYS = 280;

function first(value) {
  return (Array.isArray(value) ? value[0] : value) ?? null;
}

function ageFrom(dateOfBirth) {
  if (!dateOfBirth) return '—';
  const dob = new Date(dateOfBirth);
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const beforeBirthday =
    now.getMonth() < dob.getMonth() || (now.getMonth() === dob.getMonth() && now.getDate() < dob.getDate());
  if (beforeBirthday) age -= 1;
  return Number.isNaN(age) ? '—' : age;
}

/** Same derivation as the API's profile controller: counted back from the due date. */
function gestationalDaysFrom(dueDate) {
  if (!dueDate) return null;
  const due = new Date(dueDate).getTime();
  if (Number.isNaN(due)) return null;
  const elapsed = GESTATION_DAYS - Math.round((due - Date.now()) / DAY_MS);
  return elapsed >= 0 && elapsed <= GESTATION_DAYS + 28 ? elapsed : null;
}

/** The header card's patient, from the appointment's embedded profile. */
function buildPatient(appointment, patientId) {
  const profile = appointment.patient;
  const details = first(profile?.patient_details);

  return {
    id: profile?.id ?? patientId,
    name: profile?.full_name ?? appointment.invited_email ?? 'Invited patient',
    acuity: 'pending',
    acuityLabel: 'Pre-visit',
    mrn: profile?.id ? `ID ${profile.id.slice(0, 8)}` : 'Pending registration',
    age: ageFrom(details?.date_of_birth),
    gravida: details?.gravida ?? '—',
    para: details?.para ?? '—',
    bloodType: details?.blood_type ?? '—',
    gestationalDays: gestationalDaysFrom(details?.due_date),
    dueDate: details?.due_date ?? null,
  };
}

/** Latest value per standard_key, with the full series attached for charting. */
function buildMetrics(reports = []) {
  const byKey = new Map();

  for (const report of reports) {
    for (const metric of report.lab_report_metrics ?? []) {
      if (!metric.standard_key) continue;

      const value = metric.reviewed_value ?? metric.parsed_value;
      const entry = byKey.get(metric.standard_key) ?? {
        standardKey: metric.standard_key,
        name: metric.metric_dictionary?.display_name ?? metric.raw_key,
        source: report.source_name ?? 'Lab report',
        unit: metric.unit_standard ?? metric.unit_raw ?? '',
        reference: metric.reference_range ?? '—',
        history: [],
      };

      // An unreadable value stays out of the series rather than charting as 0.
      if (value != null) {
        entry.history.push({ date: report.report_date ?? report.uploaded_at, value: Number(value) });
      }
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
        label: metric.metric_dictionary?.display_name ?? metric.raw_key,
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
