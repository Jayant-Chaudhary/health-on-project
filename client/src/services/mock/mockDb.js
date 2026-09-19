import { mockPatient } from '../../data/mockPatient';
import { mockAppointment } from '../../data/mockAppointment';
import { mockQuestions } from '../../data/mockQuestions';
import { mockReports } from '../../data/mockReports';
import { mockChecklist } from '../../data/mockChecklist';
import { mockVisitSummary } from '../../data/mockVisitSummary';

class MockDb {
  constructor() {
    this.init();
  }

  init() {
    // Load from session storage if available to persist during dev
    const stored = sessionStorage.getItem('mamta_mock_db');
    if (stored) {
      const parsed = JSON.parse(stored);
      // Migration: If visitSummary was the old single object, reset it to the new array
      if (!Array.isArray(parsed.visitSummary)) {
        parsed.visitSummary = [...mockVisitSummary];
      }
      this.patient = parsed.patient;
      this.appointment = parsed.appointment;
      this.questions = parsed.questions;
      this.reports = parsed.reports;
      this.checklist = parsed.checklist;
      this.visitSummary = parsed.visitSummary;
      this.answers = parsed.answers || [];
      this.vitals = parsed.vitals || [];
    } else {
      this.patient = { ...mockPatient };
      this.appointment = { ...mockAppointment };
      this.questions = [...mockQuestions];
      this.reports = [...mockReports];
      this.checklist = [...mockChecklist];
      this.visitSummary = [...mockVisitSummary];
      this.answers = [];
      this.vitals = [];
      this.persist();
    }
  }

  persist() {
    sessionStorage.setItem('mamta_mock_db', JSON.stringify({
      patient: this.patient,
      appointment: this.appointment,
      questions: this.questions,
      reports: this.reports,
      checklist: this.checklist,
      visitSummary: this.visitSummary,
      answers: this.answers,
      vitals: this.vitals
    }));
  }
}

export const mockDb = new MockDb();
