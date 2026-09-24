jest.mock('../../config/supabaseAdminClient', () => {
  // A mock builder that supports `.then` so it can be awaited
  const builder = {
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn().mockReturnThis(),
  };
  return builder;
});

const supabaseAdmin = require('../../config/supabaseAdminClient');
const { ensureStaticChecklistItems, addAiGeneratedChecklistItem } = require('../../services/checklist.service');

describe('Checklist Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('ensureStaticChecklistItems()', () => {
    it('should insert rules that do not already exist', async () => {
      // Mock the first eq() chain for rules, and the second eq() chain for existing items
      // We will mock the ultimate return values using mockResolvedValueOnce on the final method of the chain
      
      // We can use mockImplementationOnce on .then to resolve the promise.
      // 1. fetch staticRules (chain: from -> select -> eq -> eq -> await)
      // 2. fetch existingItems (chain: from -> select -> eq -> await)
      // 3. insert new items (chain: from -> insert -> select -> await)
      
      supabaseAdmin.eq.mockImplementationOnce(() => ({
        // This handles the first query (static rules) which calls eq() twice.
        eq: jest.fn().mockResolvedValue({ 
          data: [{ label: 'Rule A' }, { label: 'Rule B' }], 
          error: null 
        })
      }));
      
      supabaseAdmin.eq.mockResolvedValueOnce({ 
        data: [{ label: 'Rule A' }], // Rule A already exists
        error: null 
      });

      supabaseAdmin.select.mockResolvedValueOnce({
        data: [{ label: 'Rule B', source: 'static' }],
        error: null
      });

      const result = await ensureStaticChecklistItems('appt-1', 'pat-1');
      
      expect(supabaseAdmin.insert).toHaveBeenCalledWith([{
        appointment_id: 'appt-1',
        patient_id: 'pat-1',
        label: 'Rule B',
        source: 'static'
      }]);
      expect(result).toEqual([{ label: 'Rule B', source: 'static' }]);
    });

    it('should return empty array if all rules already exist', async () => {
      supabaseAdmin.eq.mockImplementationOnce(() => ({
        eq: jest.fn().mockResolvedValue({ 
          data: [{ label: 'Rule A' }], 
          error: null 
        })
      }));
      
      supabaseAdmin.eq.mockResolvedValueOnce({ 
        data: [{ label: 'Rule A' }], 
        error: null 
      });

      const result = await ensureStaticChecklistItems('appt-1', 'pat-1');
      
      expect(supabaseAdmin.insert).not.toHaveBeenCalled();
      expect(result).toEqual([]);
    });

    it('should throw if fetching rules fails', async () => {
      supabaseAdmin.eq.mockImplementationOnce(() => ({
        eq: jest.fn().mockResolvedValue({ 
          data: null, 
          error: { message: 'DB Error' } 
        })
      }));

      await expect(ensureStaticChecklistItems('appt-1', 'pat-1')).rejects.toThrow('Failed to load checklist rules: DB Error');
    });
  });

  describe('addAiGeneratedChecklistItem()', () => {
    it('should insert an AI generated item', async () => {
      const mockItem = { id: 'item-1', label: 'Bring report' };
      supabaseAdmin.single.mockResolvedValue({ data: mockItem, error: null });

      const result = await addAiGeneratedChecklistItem({
        appointmentId: 'appt-1',
        patientId: 'pat-1',
        label: 'Bring report',
        sourceRef: 'ref-1'
      });

      expect(supabaseAdmin.insert).toHaveBeenCalledWith({
        appointment_id: 'appt-1',
        patient_id: 'pat-1',
        label: 'Bring report',
        source: 'ai_generated',
        source_ref: 'ref-1',
      });
      expect(result).toEqual(mockItem);
    });

    it('should throw if insert fails', async () => {
      supabaseAdmin.single.mockResolvedValue({ data: null, error: { message: 'Insert failed' } });

      await expect(addAiGeneratedChecklistItem({
        appointmentId: 'appt-1',
        patientId: 'pat-1',
        label: 'Bring report',
        sourceRef: 'ref-1'
      })).rejects.toThrow('Failed to insert AI-generated checklist item: Insert failed');
    });
  });
});
