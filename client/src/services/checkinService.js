import { request } from './apiClient';

export const checkinService = {
  /**
   * The questions for one appointment — the ones its clinician chose, or the
   * clinic's default set. Each row is its own template, ordered by sort_order.
   */
  async getQuestions(appointmentId) {
    if (!appointmentId) return [];
    return (await request(`/api/questionnaire/appointment/${appointmentId}`)) ?? [];
  },

  /**
   * `answers` maps a template id to `{ value: 'yes' | 'no', notes }` for a
   * yes/no question, or `{ text }` for a written one. The API stores one row
   * per question: the yes/no plus any detail given with a yes, or the text.
   */
  async saveAnswers(appointmentId, answers) {
    const responses = Object.entries(answers)
      .map(([templateId, a]) => {
        if (typeof a?.text === 'string') {
          const text = a.text.trim();
          return text ? { templateId, text } : null;
        }
        if (a?.value !== 'yes' && a?.value !== 'no') return null;
        const detail = a.value === 'yes' ? a.notes?.trim() : '';
        return { templateId, answer: a.value === 'yes', ...(detail ? { detail } : {}) };
      })
      .filter(Boolean);

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

};
