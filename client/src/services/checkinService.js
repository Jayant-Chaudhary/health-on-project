import { mockDb } from './mock/mockDb';
import { delay } from './mock/delay';

export const checkinService = {
  async getQuestions() {
    await delay();
    return mockDb.questions;
  },

  async saveAnswers(answers) {
    await delay();
    mockDb.answers = answers;
    mockDb.persist();
    return true;
  },

  async getChecklist() {
    await delay();
    return mockDb.checklist;
  },

  async submitCheckin() {
    await delay(1000);
    mockDb.appointment.status = 'CHECKIN_COMPLETE';
    mockDb.persist();
    return true;
  }
};
