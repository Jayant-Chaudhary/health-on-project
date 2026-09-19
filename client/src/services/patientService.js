import { mockDb } from './mock/mockDb';
import { delay } from './mock/delay';

export const patientService = {
  async getProfile() {
    await delay();
    return mockDb.patient;
  },

  async getAppointment() {
    await delay();
    return mockDb.appointment;
  },

  async logVitals(vitals) {
    await delay();
    mockDb.vitals.push({ ...vitals, date: new Date().toISOString() });
    mockDb.persist();
    return true;
  },

  async getLatestVitals() {
    await delay();
    return mockDb.vitals[mockDb.vitals.length - 1] || null;
  },

  async updateAppointmentStatus(status) {
    await delay();
    mockDb.appointment.status = status;
    mockDb.persist();
    return mockDb.appointment;
  },

  async getVisitSummary() {
    await delay();
    return mockDb.visitSummary;
  },
  
  async toggleNextStep(id, done) {
    await delay(300);
    for (const visit of mockDb.visitSummary) {
      const step = visit.nextSteps.find(s => s.id === id);
      if (step) {
        step.done = done;
        mockDb.persist();
        break;
      }
    }
  }
};
