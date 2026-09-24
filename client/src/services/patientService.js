import { request } from './apiClient';

/** An appointment still ahead of the patient, or in progress today. */
const UPCOMING_STATUSES = new Set(['invited', 'active', 'checked_in']);

export const patientService = {
  async getProfile() {
    return request('/api/profile');
  },

  /**
   * Every appointment the patient has, newest first, split into upcoming and
   * past. A patient sees several doctors over a pregnancy, so the dashboard
   * lists them rather than silently picking one.
   */
  async getAppointments() {
    const appointments = (await request('/api/appointments')) ?? [];

    const sorted = [...appointments].sort(
      (a, b) => new Date(b.scheduled_at) - new Date(a.scheduled_at)
    );

    return {
      all: sorted,
      upcoming: sorted
        .filter((a) => UPCOMING_STATUSES.has(a.status))
        .sort((a, b) => new Date(a.scheduled_at) - new Date(b.scheduled_at)),
      past: sorted.filter((a) => !UPCOMING_STATUSES.has(a.status)),
    };
  },

  /**
   * The API stores one row per measurement, so a weight-plus-blood-pressure
   * update is three rows rather than one object.
   */
  async logVitals(metrics, appointmentId) {
    return Promise.all(
      metrics
        .filter((m) => m.value != null && !Number.isNaN(Number(m.value)))
        .map((m) =>
          request('/api/vitals', {
            method: 'POST',
            body: {
              metricKey: m.metricKey,
              value: Number(m.value),
              unit: m.unit,
              ...(appointmentId ? { appointmentId } : {}),
            },
          })
        )
    );
  },

  /** Most recent reading per metric, keyed by metric_key. */
  async getLatestVitals() {
    const rows = (await request('/api/vitals')) ?? [];
    const latest = {};
    // The API returns newest first, so the first row seen per key wins.
    for (const row of rows) {
      if (!latest[row.metric_key]) latest[row.metric_key] = row;
    }
    return latest;
  },

  async updateAppointmentStatus(id, status) {
    return request(`/api/appointments/${id}/status`, { method: 'PATCH', body: { status } });
  },

  /** Post-visit summary for one completed appointment. */
  async getVisitSummary(appointmentId) {
    return request(`/api/post-visit/${appointmentId}`);
  },
};
