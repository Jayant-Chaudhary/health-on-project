jest.mock('../../config/supabaseAdminClient', () => ({
  from: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  is: jest.fn().mockReturnThis(),
  order: jest.fn().mockResolvedValue({ data: [], error: null }),
}));

jest.mock('../../services/checklist.service', () => ({
  addAiGeneratedChecklistItem: jest.fn().mockResolvedValue({ id: 'checklist-1' }),
}));

const supabaseAdmin = require('../../config/supabaseAdminClient');
const { maybeFlagReportForTriage, getTriageQueue } = require('../../services/triage.service');
const { addAiGeneratedChecklistItem } = require('../../services/checklist.service');

describe('Triage Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('maybeFlagReportForTriage()', () => {
    it('should return null if no metrics need review and OCR was successful', async () => {
      const result = await maybeFlagReportForTriage({
        labReport: { ocr_status: 'success', appointment_id: 'appt-1' },
        metrics: [{ needs_review: false }, { needs_review: false }],
      });
      expect(result).toBeNull();
      expect(addAiGeneratedChecklistItem).not.toHaveBeenCalled();
    });

    it('should add checklist item if a metric needs review', async () => {
      const result = await maybeFlagReportForTriage({
        labReport: { id: 'report-1', ocr_status: 'success', appointment_id: 'appt-1', patient_id: 'pat-1', report_date: '2023-10-01' },
        metrics: [{ needs_review: false }, { needs_review: true }],
      });
      
      expect(addAiGeneratedChecklistItem).toHaveBeenCalledWith({
        appointmentId: 'appt-1',
        patientId: 'pat-1',
        label: 'Bring the physical report from 2023-10-01',
        sourceRef: 'report-1'
      });
      expect(result).toEqual({ id: 'checklist-1' });
    });

    it('should add checklist item if OCR failed or was partial', async () => {
      const result = await maybeFlagReportForTriage({
        labReport: { id: 'report-1', ocr_status: 'failed', appointment_id: 'appt-1', patient_id: 'pat-1' },
        metrics: [{ needs_review: false }], // Metrics might not exist or might not need review directly
      });
      
      expect(addAiGeneratedChecklistItem).toHaveBeenCalledWith({
        appointmentId: 'appt-1',
        patientId: 'pat-1',
        label: 'Bring the physical copy of your recent lab report',
        sourceRef: 'report-1'
      });
    });

    it('should return null if there is no appointment_id', async () => {
      const result = await maybeFlagReportForTriage({
        labReport: { ocr_status: 'failed' },
        metrics: [{ needs_review: true }],
      });
      expect(result).toBeNull();
    });
  });

  describe('getTriageQueue()', () => {
    it('should return the triage queue successfully', async () => {
      const mockQueue = [{ id: 'metric-1' }];
      supabaseAdmin.order.mockResolvedValue({ data: mockQueue, error: null });

      const result = await getTriageQueue();
      expect(result).toEqual(mockQueue);
      expect(supabaseAdmin.from).toHaveBeenCalledWith('lab_report_metrics');
      expect(supabaseAdmin.eq).toHaveBeenCalledWith('needs_review', true);
      expect(supabaseAdmin.is).toHaveBeenCalledWith('reviewed_by', null);
    });

    it('should throw an error if database query fails', async () => {
      supabaseAdmin.order.mockResolvedValue({ data: null, error: { message: 'DB Error' } });

      await expect(getTriageQueue()).rejects.toThrow('Failed to load triage queue: DB Error');
    });
  });
});
