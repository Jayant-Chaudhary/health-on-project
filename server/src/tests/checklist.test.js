const request = require('supertest');
const app = require('../app');
const supabaseAdmin = require('../config/supabaseAdminClient');
const { ensureStaticChecklistItems } = require('../services/checklist.service');

jest.mock('../config/supabaseAdminClient', () => ({
  auth: {
    getUser: jest.fn(),
  },
  from: jest.fn(),
}));

jest.mock('../services/checklist.service', () => ({
  ensureStaticChecklistItems: jest.fn(),
}));

describe('Checklist API', () => {
  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
  };
  const mockProfile = {
    role: 'patient',
    full_name: 'Patient Test',
  };

  const mockToken = 'valid-token';

  beforeEach(() => {
    jest.clearAllMocks();

    supabaseAdmin.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    supabaseAdmin.from.mockImplementation((table) => {
      if (table === 'profiles') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: mockProfile, error: null }),
        };
      }
      return {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        update: jest.fn().mockReturnThis(),
        single: jest.fn().mockReturnThis(),
      };
    });
  });

  describe('GET /checklist/:appointmentId', () => {
    it('should return checklist items for an appointment', async () => {
      const mockItems = [{ id: 'item-1', task: 'Task 1' }];
      
      ensureStaticChecklistItems.mockResolvedValue();

      supabaseAdmin.from.mockImplementation((table) => {
        if (table === 'profiles') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: mockProfile, error: null }),
          };
        }
        if (table === 'pre_visit_checklist_items') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            order: jest.fn().mockResolvedValue({ data: mockItems, error: null }),
          };
        }
      });

      const response = await request(app)
        .get('/checklist/appt-123')
        .set('Authorization', `Bearer ${mockToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockItems);
      expect(ensureStaticChecklistItems).toHaveBeenCalledWith('appt-123', mockUser.id);
    });
  });

  describe('PATCH /checklist/items/:itemId', () => {
    it('should toggle item completion status', async () => {
      const mockUpdatedItem = { id: 'item-1', is_completed: true };

      supabaseAdmin.from.mockImplementation((table) => {
        if (table === 'profiles') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: mockProfile, error: null }),
          };
        }
        if (table === 'pre_visit_checklist_items') {
          return {
            update: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            select: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: mockUpdatedItem, error: null }),
          };
        }
      });

      const response = await request(app)
        .patch('/checklist/items/item-1')
        .set('Authorization', `Bearer ${mockToken}`)
        .send({ isCompleted: true });

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockUpdatedItem);
    });

    it('should return 400 if isCompleted is missing or invalid type', async () => {
      const response = await request(app)
        .patch('/checklist/items/item-1')
        .set('Authorization', `Bearer ${mockToken}`)
        .send({ isCompleted: 'not-a-boolean' }); // Invalid payload

      expect(response.status).toBe(400);
    });
  });
});
