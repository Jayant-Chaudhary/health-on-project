import { request } from './apiClient';

/** The signed-in user's own profile, for either role. */
export const profileService = {
  async getProfile() {
    return request('/api/profile');
  },

  /** Only the fields passed are changed; anything omitted is left alone. */
  async updateProfile(changes) {
    return request('/api/profile', { method: 'PATCH', body: changes });
  },
};
