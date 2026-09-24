import { request } from './apiClient';

export const checkinService = {
  /**
   * The active questionnaire. The API returns a flat list of question rows
   * ordered by sort_order — each row is its own template, not a container.
   */
  async getQuestions() {
    return (await request('/api/questionnaire/templates')) ?? [];
  },

  /**
   * `answers` maps a template id to a boolean, which is the shape the API
   * stores: one row per question, answered yes or no.
   */
  async saveAnswers(appointmentId, answers) {
    const responses = Object.entries(answers)
      .filter(([, value]) => typeof value === 'boolean')
      .map(([templateId, answer]) => ({ templateId, answer }));

    if (!appointmentId || responses.length === 0) return null;

    return request('/api/questionnaire/responses', {
      method: 'POST',
      body: { appointmentId, responses },
    });
  },

  async getAnswers(appointmentId) {
    if (!appointmentId) return [];
    return (await request(`/api/questionnaire/responses/${appointmentId}`)) ?? [];
  },

  async getChecklist(appointmentId) {
    if (!appointmentId) return [];
    return (await request(`/api/checklist/${appointmentId}`)) ?? [];
  },

  async toggleChecklistItem(itemId, isCompleted) {
    return request(`/api/checklist/items/${itemId}`, {
      method: 'PATCH',
      body: { isCompleted },
    });
  },

  /** Marks the patient as checked in for the visit. */
  async submitCheckin(appointmentId) {
    if (!appointmentId) return null;
    return request(`/api/appointments/${appointmentId}/status`, {
      method: 'PATCH',
      body: { status: 'checked_in' },
    });
  },
};
