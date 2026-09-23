import { request } from './apiClient';

export const checkinService = {
  async getQuestions() {
    // GET /api/questionnaire/templates
    // The backend returns an array of templates. We'll use the first one's questions.
    const templates = await request('/api/questionnaire/templates');
    if (!templates || templates.length === 0) return [];
    
    // We store the templateId globally or just return the questions mapped properly
    // For simplicity, we just return the questions array.
    window.__currentTemplateId = templates[0].id;
    return templates[0].questions || [];
  },

  async saveAnswers(appointmentId, answers) {
    // answers is likely a key-value object from the frontend state.
    // The backend expects: { appointmentId, templateId, responses: [{ questionId, answerValue }] }
    
    const templateId = window.__currentTemplateId;
    if (!templateId || !appointmentId) return false;

    // Convert flat answers object to array format
    const formattedResponses = Object.entries(answers).map(([key, value]) => ({
      questionId: key,
      answerValue: typeof value === 'boolean' ? (value ? 'yes' : 'no') : String(value)
    }));

    return request('/api/questionnaire/responses', {
      method: 'POST',
      body: {
        appointmentId,
        templateId,
        responses: formattedResponses
      }
    });
  },

  async getChecklist(appointmentId) {
    if (!appointmentId) return [];
    try {
      const data = await request(`/api/checklist/${appointmentId}`);
      return data?.items || [];
    } catch (e) {
      return [];
    }
  },

  async toggleChecklistItem(itemId, done) {
    return request(`/api/checklist/items/${itemId}`, {
      method: 'PATCH',
      body: { status: done ? 'completed' : 'pending' }
    });
  },

  async submitCheckin(appointmentId) {
    if (!appointmentId) return false;
    // Update appointment status to ready (in triage)
    return request(`/api/appointments/${appointmentId}/status`, {
      method: 'PATCH',
      body: { status: 'ready' }
    });
  }
};
