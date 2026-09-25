jest.mock('../../config/supabaseAdminClient', () => ({
  from: jest.fn(),
}));

const supabaseAdmin = require('../../config/supabaseAdminClient');
const { ensureStaticChecklistItems, addAiGeneratedChecklistItem } = require('../../services/checklist.service');
const { ok, fail, mockTables } = require('../helpers/supabaseMock');

describe('Checklist Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('ensureStaticChecklistItems()', () => {
    it('should insert rules that do not already exist', async () => {
      const chains = mockTables(supabaseAdmin, {
        checklist_rule_templates: ok([{ label: 'Rule A' }, { label: 'Rule B' }]),
        // Existing items, then the insert.
        pre_visit_checklist_items: [ok([{ label: 'Rule A' }]), ok([{ label: 'Rule B', source: 'static' }])],
      });

      const result = await ensureStaticChecklistItems('appt-1', 'pat-1');

      expect(chains.checklist_rule_templates[0].eq).toHaveBeenCalledWith('trigger_type', 'always');
      expect(chains.pre_visit_checklist_items[1].insert).toHaveBeenCalledWith([
        {
          appointment_id: 'appt-1',
          patient_id: 'pat-1',
          label: 'Rule B',
          source: 'static',
        },
      ]);
      expect(result).toEqual([{ label: 'Rule B', source: 'static' }]);
    });

    it('should return empty array if all rules already exist', async () => {
      const chains = mockTables(supabaseAdmin, {
        checklist_rule_templates: ok([{ label: 'Rule A' }]),
        pre_visit_checklist_items: ok([{ label: 'Rule A' }]),
      });

      const result = await ensureStaticChecklistItems('appt-1', 'pat-1');

      expect(chains.pre_visit_checklist_items).toHaveLength(1);
      expect(chains.pre_visit_checklist_items[0].insert).not.toHaveBeenCalled();
      expect(result).toEqual([]);
    });

    it('should throw if fetching rules fails', async () => {
      mockTables(supabaseAdmin, {
        checklist_rule_templates: fail('DB Error'),
      });

      await expect(ensureStaticChecklistItems('appt-1', 'pat-1')).rejects.toThrow(
        'Failed to load checklist rules: DB Error'
      );
    });
  });

  describe('addAiGeneratedChecklistItem()', () => {
    it('should insert an AI generated item', async () => {
      const mockItem = { id: 'item-1', label: 'Bring report' };
      const chains = mockTables(supabaseAdmin, { pre_visit_checklist_items: ok(mockItem) });

      const result = await addAiGeneratedChecklistItem({
        appointmentId: 'appt-1',
        patientId: 'pat-1',
        label: 'Bring report',
        sourceRef: 'ref-1',
      });

      expect(chains.pre_visit_checklist_items[0].insert).toHaveBeenCalledWith({
        appointment_id: 'appt-1',
        patient_id: 'pat-1',
        label: 'Bring report',
        source: 'ai_generated',
        source_ref: 'ref-1',
      });
      expect(result).toEqual(mockItem);
    });

    it('should throw if insert fails', async () => {
      mockTables(supabaseAdmin, { pre_visit_checklist_items: fail('Insert failed') });

      await expect(
        addAiGeneratedChecklistItem({
          appointmentId: 'appt-1',
          patientId: 'pat-1',
          label: 'Bring report',
          sourceRef: 'ref-1',
        })
      ).rejects.toThrow('Failed to insert AI-generated checklist item: Insert failed');
    });
  });
});
