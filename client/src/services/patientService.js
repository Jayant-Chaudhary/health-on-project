import { request } from './apiClient';

export const patientService = {
  async getProfile() {
    return request('/api/auth/me');
  },

  async getAppointment() {
    const appointments = await request('/api/appointments');
    // For now, return the most recent active appointment, or the first one
    return appointments && appointments.length > 0 ? appointments[0] : null;
  },

  async logVitals(vitals) {
    return request('/api/vitals', {
      method: 'POST',
      body: vitals
    });
  },

  async getLatestVitals() {
    const vitals = await request('/api/vitals');
    return vitals && vitals.length > 0 ? vitals[vitals.length - 1] : null;
  },

  async updateAppointmentStatus(id, status) {
    return request(`/api/appointments/${id}/status`, {
      method: 'PATCH',
      body: { status }
    });
  },

  async getVisitSummary() {
    // Fetch all appointments, then for completed ones fetch their post-visit summaries
    const appointments = await request('/api/appointments');
    if (!appointments) return [];

    const pastAppointments = appointments.filter(a => a.status === 'completed' || a.status === 'archived');
    
    const summaries = await Promise.all(
      pastAppointments.map(async (app) => {
        try {
          const summary = await request(`/api/post-visit/${app.id}`);
          // Merge summary data with appointment context
          return { ...summary, id: app.id, date: app.appointment_date, doctorName: 'Dr. Sarah Jenkins' };
        } catch (e) {
          return null; // summary might not exist yet
        }
      })
    );
    
    return summaries.filter(Boolean);
  },
  
  async toggleNextStep(appointmentId, itemId, done) {
    console.warn("Backend does not explicitly support toggling post-visit action items for patients yet.");
    // In a real app we'd PATCH /api/post-visit/:id/action-items/:itemId
    return true; 
  }
};
