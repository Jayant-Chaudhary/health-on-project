// 1. MOCK EXTERNAL DEPENDENCIES
// We mock the Supabase client to simulate a chained query: .from().select().eq()
jest.mock('../../config/supabaseAdminClient', () => ({
  from: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  eq: jest.fn().mockResolvedValue({ data: [], error: null }), // Default empty dictionary
}));

// We mock env so we don't need a real .env file
jest.mock('../../config/env', () => ({
  ocrMetricReviewThreshold: 0.8, // Set a fixed threshold for testing
}));

// We mock the unit conversion service so we isolate the standardization logic
jest.mock('../../services/standardization/unitConversion.service', () => ({
  convertUnit: jest.fn((value, from, to) => {
    // A simple mock: if from and to are different, just multiply by 2
    if (from && to && from !== to) return { value: value * 2, converted: true };
    return { value, converted: true };
  }),
}));

const supabaseAdmin = require('../../config/supabaseAdminClient');
const { standardizeMetrics, loadDictionary } = require('../../services/standardization/standardizeLabReport.service');

describe('Standardize Lab Report Service', () => {
  // A fake dictionary to simulate what Supabase would return
  const mockDictionary = [
    {
      standard_key: 'hemoglobin',
      display_name: 'Hemoglobin',
      category: 'blood',
      unit_standard: 'g/dl',
      aliases: ['hb', 'hgb'],
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset the Supabase mock to return our fake dictionary
    supabaseAdmin.eq.mockResolvedValue({ data: mockDictionary, error: null });
  });

  // 2. TEST THE CORE LOGIC
  describe('standardizeMetrics()', () => {
    
    it('should match an exact standard_key', async () => {
      const rawMetrics = [{ key: 'hemoglobin', value: 15, unit: 'g/l', confidence: 0.9 }];
      const result = await standardizeMetrics(rawMetrics);

      expect(result[0].standard_key).toBe('hemoglobin');
      expect(result[0].needs_review).toBe(false);
      // Because we mocked convertUnit to multiply by 2 (since g/l !== g/dl)
      expect(result[0].parsed_value).toBe(30); 
    });

    it('should match an alias (e.g., hb)', async () => {
      const rawMetrics = [{ key: 'hb', value: 15, unit: 'g/l', confidence: 0.9 }];
      const result = await standardizeMetrics(rawMetrics);

      expect(result[0].standard_key).toBe('hemoglobin');
      expect(result[0].needs_review).toBe(false);
    });

    it('should flag as needs_review if confidence is below threshold', async () => {
      const rawMetrics = [{ key: 'hemoglobin', value: 15, unit: 'g/l', confidence: 0.5 }];
      const result = await standardizeMetrics(rawMetrics);

      expect(result[0].standard_key).toBe('hemoglobin');
      expect(result[0].needs_review).toBe(true); // 0.5 < 0.8
    });

    it('should flag as needs_review if key is unmapped', async () => {
      const rawMetrics = [{ key: 'unknown_metric', value: 10, unit: 'mg', confidence: 0.9 }];
      const result = await standardizeMetrics(rawMetrics);

      expect(result[0].standard_key).toBeNull();
      expect(result[0].needs_review).toBe(true);
    });

    it('should flag as needs_review if value is not numeric', async () => {
      const rawMetrics = [{ key: 'hemoglobin', value: 'invalid-string', unit: 'g/l', confidence: 0.9 }];
      const result = await standardizeMetrics(rawMetrics);

      expect(result[0].parsed_value).toBeNull();
      expect(result[0].needs_review).toBe(true);
    });
  });

  describe('loadDictionary() error handling', () => {
    it('should throw an error if database query fails', async () => {
      // Fast-forward time to bypass the in-memory cache
      jest.spyOn(Date, 'now').mockReturnValue(Date.now() + 100000);
      supabaseAdmin.eq.mockResolvedValueOnce({ data: null, error: { message: 'DB connection failed' } });
      
      const rawMetrics = [{ key: 'hb', value: 15, unit: 'g/l', confidence: 0.9 }];
      await expect(standardizeMetrics(rawMetrics)).rejects.toThrow('Failed to load metric_dictionary: DB connection failed');
      
      jest.restoreAllMocks();
    });
  });
});
