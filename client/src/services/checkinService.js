import { request } from './apiClient';

export const checkinService = {
  async getQuestions(appointmentId) {
    if (appointmentId) {
      return request(`/questionnaire/appointment/${appointmentId}`);
    }
    return request('/questionnaire/templates');
  },

  async saveAnswers(appointmentId, answers) {
    // answers is expected to be { templateId: boolean } in UI, but backend wants array
    // We assume the UI will be updated or we format it if needed, but for now we just pass it.
    // The backend route is POST /questionnaire/responses and expects { appointmentId, responses: [{ templateId, answer }] }
    const formattedResponses = Object.entries(answers).map(([templateId, obj]) => ({
      templateId,
      answer: obj.value === 'yes',
      detail: obj.notes || ''
    }));
    return request('/questionnaire/responses', {
      method: 'POST',
      body: { appointmentId, responses: formattedResponses }
    });
  },

  async getChecklist(appointmentId) {
    return request(`/checklist/${appointmentId}`);
  },

  async submitCheckin(appointmentId) {
    // Update appointment status to checked_in
    return request(`/appointments/${appointmentId}/status`, {
      method: 'PATCH',
      body: { status: 'checked_in' }
    });
  }
};
