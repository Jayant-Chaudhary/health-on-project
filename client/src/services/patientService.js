import { request } from './apiClient';

export const patientService = {
  async getProfile() {
    return request('/auth/me');
  },

  async getAppointment() {
    const appointments = await request('/appointments');
    // For now, return the most recent active appointment, or the first one
    return appointments && appointments.length > 0 ? appointments.find(a => a.status !== 'completed' && a.status !== 'cancelled') || appointments[0] : null;
  },

  async logVitals(vitals) {
    return request('/vitals', {
      method: 'POST',
      body: vitals
    });
  },

  async getLatestVitals() {
    const vitals = await request('/vitals');
    return vitals && vitals.length > 0 ? vitals[vitals.length - 1] : null;
  },

  async updateAppointmentStatus(id, status) {
    return request(`/appointments/${id}/status`, {
      method: 'PATCH',
      body: { status }
    });
  },

  async getVisitSummary() {
    // Fetch all appointments, then for completed ones fetch their post-visit summaries
    const appointments = await request('/appointments');
    if (!appointments) return [];

    const pastAppointments = appointments.filter(a => a.status === 'completed' || a.status === 'archived');
    
    const summaries = await Promise.all(
      pastAppointments.map(async (app) => {
        try {
          const summary = await request(`/post-visit/${app.id}`);
          // Merge summary data with appointment context
          return { 
            ...summary, 
            id: app.id, 
            date: app.scheduled_at, 
            doctorName: app.clinician?.full_name || 'Your Doctor' 
          };
        } catch (e) {
          return null; // summary might not exist yet
        }
      })
    );
    
    return summaries.filter(Boolean);
  },
  
  async toggleNextStep(itemId, done) {
    return request(`/post-visit/action-items/${itemId}`, {
      method: 'PATCH',
      body: { isCompleted: done },
    });
  }
};
