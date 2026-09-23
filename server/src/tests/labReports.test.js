const request = require('supertest');
const app = require('../app');
const supabaseAdmin = require('../config/supabaseAdminClient');
const { standardizeMetrics } = require('../services/standardization/standardizeLabReport.service');
const { maybeFlagReportForTriage, getTriageQueue } = require('../services/triage.service');

jest.mock('../config/supabaseAdminClient', () => ({
  auth: {
    getUser: jest.fn(),
  },
  from: jest.fn(),
}));

jest.mock('../services/standardization/standardizeLabReport.service', () => ({
  standardizeMetrics: jest.fn(),
}));

jest.mock('../services/triage.service', () => ({
  maybeFlagReportForTriage: jest.fn(),
  getTriageQueue: jest.fn(),
}));

describe('Lab Reports API', () => {
  const mockPatient = {
    id: 'patient-123',
    email: 'patient@example.com',
  };
  const mockClinician = {
    id: 'clinician-456',
    email: 'dr@example.com',
  };

  const mockPatientProfile = {
    role: 'patient',
    full_name: 'Patient Test',
  };
  
  const mockClinicianProfile = {
    role: 'clinician',
    full_name: 'Dr. Test',
  };

  const mockToken = 'valid-token';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const setupAuthMock = (user, profile) => {
    supabaseAdmin.auth.getUser.mockResolvedValue({
      data: { user },
      error: null,
    });

    supabaseAdmin.from.mockImplementation((table) => {
      if (table === 'profiles') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: profile, error: null }),
        };
      }
      return {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        update: jest.fn().mockReturnThis(),
        single: jest.fn().mockReturnThis(),
      };
    });
  };

  describe('POST /lab-reports', () => {
    const validPayload = {
      storagePath: 'labs/report.pdf',
      ocrStatus: 'success',
      metrics: [{ key: 'hb', value: '12', unit: 'g/dL' }]
    };

    it('should ingest a report and metrics', async () => {
      setupAuthMock(mockPatient, mockPatientProfile);
      
      const mockLabReport = { id: 'report-1' };
      const mockStandardized = [{ standardKey: 'hemoglobin', parsedValue: '12' }];
      const mockInsertedMetrics = [{ id: 'metric-1', lab_report_id: 'report-1' }];

      standardizeMetrics.mockResolvedValue(mockStandardized);
      maybeFlagReportForTriage.mockResolvedValue();

      supabaseAdmin.from.mockImplementation((table) => {
        if (table === 'profiles') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: mockPatientProfile, error: null }),
          };
        }
        if (table === 'lab_reports') {
          return {
            insert: jest.fn().mockReturnThis(),
            select: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: mockLabReport, error: null }),
          };
        }
        if (table === 'lab_report_metrics') {
          return {
            insert: jest.fn().mockReturnThis(),
            select: jest.fn().mockResolvedValue({ data: mockInsertedMetrics, error: null }),
          };
        }
      });

      const response = await request(app)
        .post('/lab-reports')
        .set('Authorization', `Bearer ${mockToken}`)
        .send(validPayload);

      expect(response.status).toBe(201);
      expect(response.body.labReport).toEqual(mockLabReport);
      expect(response.body.metrics).toEqual(mockInsertedMetrics);
      expect(standardizeMetrics).toHaveBeenCalledWith(validPayload.metrics);
      expect(maybeFlagReportForTriage).toHaveBeenCalledWith({
        labReport: mockLabReport,
        metrics: mockInsertedMetrics,
      });
    });

    it('should return 400 for invalid payload', async () => {
      setupAuthMock(mockPatient, mockPatientProfile);

      const response = await request(app)
        .post('/lab-reports')
        .set('Authorization', `Bearer ${mockToken}`)
        .send({ ocrStatus: 'success' }); // Missing required storagePath

      expect(response.status).toBe(400);
    });
  });

  describe('GET /lab-reports', () => {
    it('should list reports for the authenticated patient', async () => {
      setupAuthMock(mockPatient, mockPatientProfile);
      const mockReports = [{ id: 'report-1' }];

      supabaseAdmin.from.mockImplementation((table) => {
        if (table === 'profiles') return { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), single: jest.fn().mockResolvedValue({ data: mockPatientProfile, error: null }) };
        if (table === 'lab_reports') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            order: jest.fn().mockResolvedValue({ data: mockReports, error: null }),
          };
        }
      });

      const response = await request(app)
        .get('/lab-reports')
        .set('Authorization', `Bearer ${mockToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockReports);
    });

    it('should list reports for a specific patient if requester is clinician', async () => {
      setupAuthMock(mockClinician, mockClinicianProfile);
      const mockReports = [{ id: 'report-1' }];

      supabaseAdmin.from.mockImplementation((table) => {
        if (table === 'profiles') return { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), single: jest.fn().mockResolvedValue({ data: mockClinicianProfile, error: null }) };
        if (table === 'lab_reports') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            order: jest.fn().mockResolvedValue({ data: mockReports, error: null }),
          };
        }
      });

      const response = await request(app)
        .get('/lab-reports?patientId=patient-123')
        .set('Authorization', `Bearer ${mockToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockReports);
    });
  });

  describe('GET /lab-reports/trend/:standardKey', () => {
    it('should return metric trend', async () => {
      setupAuthMock(mockPatient, mockPatientProfile);
      const mockTrend = [{ parsed_value: '12' }];

      supabaseAdmin.from.mockImplementation((table) => {
        if (table === 'profiles') return { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), single: jest.fn().mockResolvedValue({ data: mockPatientProfile, error: null }) };
        if (table === 'lab_report_metrics') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            order: jest.fn().mockResolvedValue({ data: mockTrend, error: null }),
          };
        }
      });

      const response = await request(app)
        .get('/lab-reports/trend/hemoglobin')
        .set('Authorization', `Bearer ${mockToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockTrend);
    });
  });

  describe('GET /lab-reports/triage/queue', () => {
    it('should list triage queue if clinician', async () => {
      setupAuthMock(mockClinician, mockClinicianProfile);
      const mockQueue = [{ id: 'triage-1' }];
      getTriageQueue.mockResolvedValue(mockQueue);

      const response = await request(app)
        .get('/lab-reports/triage/queue')
        .set('Authorization', `Bearer ${mockToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockQueue);
    });

    it('should return 403 if patient tries to access triage queue', async () => {
      setupAuthMock(mockPatient, mockPatientProfile);

      const response = await request(app)
        .get('/lab-reports/triage/queue')
        .set('Authorization', `Bearer ${mockToken}`);

      expect(response.status).toBe(403);
    });
  });

  describe('PATCH /lab-reports/metrics/:metricId/review', () => {
    it('should review metric if clinician', async () => {
      setupAuthMock(mockClinician, mockClinicianProfile);
      const mockUpdated = { id: 'metric-1' };

      supabaseAdmin.from.mockImplementation((table) => {
        if (table === 'profiles') return { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), single: jest.fn().mockResolvedValue({ data: mockClinicianProfile, error: null }) };
        if (table === 'lab_report_metrics') {
          return {
            update: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            select: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: mockUpdated, error: null }),
          };
        }
      });

      const response = await request(app)
        .patch('/lab-reports/metrics/metric-1/review')
        .set('Authorization', `Bearer ${mockToken}`)
        .send({ standardKey: 'hemoglobin', reviewedValue: 12.5 });

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockUpdated);
    });
  });
});
