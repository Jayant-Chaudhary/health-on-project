import { request } from './apiClient';

export const inviteService = {
  /** Public: describes what the invite is for, before asking for anything. */
  async getInvite(token) {
    return request(`/api/auth/invite/${token}`);
  },

  /** Sets a first password for a new patient and links them to the appointment. */
  async acceptInvite(token, password) {
    return request('/api/auth/accept-invite', { method: 'POST', body: { token, password } });
  },
};
