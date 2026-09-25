/**
 * Unit tests for standardizeLabReport.service.js
 *
 * The module exposes several pure helpers (normalizeKey, tokenSortKey,
 * buildTokenSortIndex, findDictionaryEntry) alongside the async
 * standardizeMetrics pipeline. All supabase I/O is mocked.
 *
 * Cache isolation: the module holds process-level singleton caches
 * (dictionaryCache, dictionaryCacheAt). We reset them between tests
 * by calling jest.resetModules() and re-requiring the module.
 */

jest.mock('../../config/supabaseAdminClient', () => ({
  from: jest.fn(),
}));

// We mock env so the confidence threshold is deterministic regardless of
// whatever .env file exists on the developer's machine.
jest.mock('../../config/env', () => ({
  ocrMetricReviewThreshold: 0.75,
}));

// ─── Helpers re-imported per test group that needs cache isolation ────────────
// For pure-function tests we can import once at the top.
const {
  normalizeKey,
  tokenSortKey,
  buildTokenSortIndex,
  findDictionaryEntry,
} = require('../../services/standardization/standardizeLabReport.service');

const supabaseAdmin = require('../../config/supabaseAdminClient');

// Helper: build a minimal supabase mock that resolves with the given dictionary
function mockDictionary(entries) {
  supabaseAdmin.from.mockReturnValue({
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockResolvedValue({ data: entries, error: null }),
  });
}

// Helper: build a minimal supabase mock that rejects with an error
function mockDictionaryError(message) {
  supabaseAdmin.from.mockReturnValue({
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockResolvedValue({ data: null, error: { message } }),
  });
}

// ─── Pure helper tests ────────────────────────────────────────────────────────

describe('normalizeKey', () => {
  it('lowercases the key', () => {
    expect(normalizeKey('Hemoglobin')).toBe('hemoglobin');
  });

  it('strips non-alphanumeric characters', () => {
    expect(normalizeKey('HbA1c (%)')).toBe('hba1c');
  });

  it('trims leading and trailing whitespace', () => {
    expect(normalizeKey('  glucose  ')).toBe('glucose');
  });

  it('handles an already-normalised key', () => {
    expect(normalizeKey('glucose')).toBe('glucose');
  });
});

describe('tokenSortKey', () => {
  it('"Glucose Fasting" and "Fasting Glucose" produce the same token', () => {
    expect(tokenSortKey('Glucose Fasting')).toBe(tokenSortKey('Fasting Glucose'));
  });

  it('does NOT collapse "Testosterone, Total" onto "Testosterone, Free"', () => {
    expect(tokenSortKey('Testosterone, Total')).not.toBe(tokenSortKey('Testosterone, Free'));
  });

  it('lowercases and strips punctuation before sorting', () => {
    expect(tokenSortKey('  Blood, Glucose ')).toBe(tokenSortKey('glucose blood'));
  });
});

describe('buildTokenSortIndex', () => {
  it('maps a standard_key spelling to itself', () => {
    const dict = [{ standard_key: 'hemoglobin', aliases: [] }];
    const index = buildTokenSortIndex(dict);
    expect(index.get(tokenSortKey('hemoglobin'))).toBe('hemoglobin');
  });

  it('maps an alias to the standard_key', () => {
    const dict = [{ standard_key: 'hemoglobin', aliases: ['HB', 'Hgb'] }];
    const index = buildTokenSortIndex(dict);
    expect(index.get(tokenSortKey('HB'))).toBe('hemoglobin');
    expect(index.get(tokenSortKey('Hgb'))).toBe('hemoglobin');
  });

  it('drops an ambiguous token that maps to two different standard_keys', () => {
    const dict = [
      { standard_key: 'glucose_fasting', aliases: ['fasting glucose'] },
      { standard_key: 'glucose_random', aliases: ['fasting glucose'] }, // same alias!
    ];
    const index = buildTokenSortIndex(dict);
    // The token for "fasting glucose" is ambiguous — it must be dropped.
    expect(index.has(tokenSortKey('fasting glucose'))).toBe(false);
  });

  it('returns an empty Map for an empty dictionary', () => {
    expect(buildTokenSortIndex([])).toEqual(new Map());
  });
});

describe('findDictionaryEntry', () => {
  const dict = [
    { standard_key: 'hemoglobin', aliases: ['Hb', 'Hgb'], unit_standard: 'g/dl' },
    { standard_key: 'glucose_fasting', aliases: ['Fasting Glucose', 'Blood Glucose Fasting'], unit_standard: 'mg/dl' },
  ];
  const index = buildTokenSortIndex(dict);

  it('returns the entry on an exact standard_key match', () => {
    expect(findDictionaryEntry(dict, 'hemoglobin', index)).toMatchObject({ standard_key: 'hemoglobin' });
  });

  it('returns the entry on a case-insensitive standard_key match', () => {
    expect(findDictionaryEntry(dict, 'HEMOGLOBIN', index)).toMatchObject({ standard_key: 'hemoglobin' });
  });

  it('returns the entry via alias', () => {
    expect(findDictionaryEntry(dict, 'Hgb', index)).toMatchObject({ standard_key: 'hemoglobin' });
  });

  it('returns the entry via token-sort fallback (word-order variant)', () => {
    // "Glucose Fasting" is a word-order variant of "Fasting Glucose" (an alias)
    expect(findDictionaryEntry(dict, 'Glucose Fasting', index)).toMatchObject({
      standard_key: 'glucose_fasting',
    });
  });

  it('returns undefined when no match is found', () => {
    expect(findDictionaryEntry(dict, 'completely_unknown_metric', index)).toBeUndefined();
  });
});

// ─── standardizeMetrics (async pipeline) ─────────────────────────────────────

describe('standardizeMetrics', () => {
  // Re-require per describe block to reset the module-level cache.
  let standardizeMetrics;

  beforeEach(() => {
    jest.resetModules();
    // Re-mock after resetModules wipes the registry.
    jest.mock('../../config/supabaseAdminClient', () => ({ from: jest.fn() }));
    jest.mock('../../config/env', () => ({ ocrMetricReviewThreshold: 0.75 }));
    ({ standardizeMetrics } = require('../../services/standardization/standardizeLabReport.service'));
    // Re-get the fresh supabase mock reference.
    const freshSupabase = require('../../config/supabaseAdminClient');
    mockDictionaryVia(freshSupabase);
  });

  // We need a helper that uses the freshly-required supabase mock.
  function mockDictionaryVia(supabase, entries) {
    const dict = entries ?? [
      { standard_key: 'hemoglobin', aliases: ['Hb', 'Hgb'], unit_standard: 'g/dl', display_name: 'Haemoglobin', category: 'CBC' },
      { standard_key: 'glucose_fasting', aliases: ['Fasting Glucose'], unit_standard: 'mg/dl', display_name: 'Fasting Glucose', category: 'Metabolic' },
    ];
    supabase.from.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockResolvedValue({ data: dict, error: null }),
    });
  }

  it('returns an empty array for empty input', async () => {
    await expect(standardizeMetrics([])).resolves.toEqual([]);
  });

  it('standardizes a known metric with matching units (no conversion needed)', async () => {
    const result = await standardizeMetrics([
      { key: 'Hb', value: 12.5, unit: 'g/dl', confidence: 0.95 },
    ]);
    expect(result[0]).toMatchObject({
      standard_key: 'hemoglobin',
      raw_key: 'Hb',
      raw_value: '12.5',
      parsed_value: 12.5,
      unit_raw: 'g/dl',
      unit_standard: 'g/dl',
      confidence_score: 0.95,
      needs_review: false,
    });
  });

  it('converts units when raw unit differs from standard unit', async () => {
    // hemoglobin standard is g/dl; input is g/l (needs divide by 10)
    const result = await standardizeMetrics([
      { key: 'hemoglobin', value: 120, unit: 'g/l', confidence: 0.9 },
    ]);
    expect(result[0].standard_key).toBe('hemoglobin');
    expect(result[0].parsed_value).toBeCloseTo(12, 5);
    expect(result[0].needs_review).toBe(false);
  });

  it('sets needs_review: true when unit conversion fails', async () => {
    // Input unit "lb" cannot be converted to "g/dl"
    const result = await standardizeMetrics([
      { key: 'hemoglobin', value: 12, unit: 'lb', confidence: 0.9 },
    ]);
    expect(result[0].standard_key).toBe('hemoglobin');
    expect(result[0].needs_review).toBe(true);
  });

  it('sets needs_review: true when confidence is below threshold (0.75)', async () => {
    const result = await standardizeMetrics([
      { key: 'hemoglobin', value: 12, unit: 'g/dl', confidence: 0.6 },
    ]);
    expect(result[0].needs_review).toBe(true);
  });

  it('does NOT set needs_review for confidence exactly at threshold', async () => {
    // confidence === threshold → NOT below → should not flag
    const result = await standardizeMetrics([
      { key: 'hemoglobin', value: 12, unit: 'g/dl', confidence: 0.75 },
    ]);
    expect(result[0].needs_review).toBe(false);
  });

  it('sets needs_review: true and parsed_value: null for non-numeric value', async () => {
    const result = await standardizeMetrics([
      { key: 'hemoglobin', value: 'see report', unit: 'g/dl', confidence: 0.9 },
    ]);
    expect(result[0].needs_review).toBe(true);
    expect(result[0].parsed_value).toBeNull();
  });

  it('sets standard_key: null and needs_review: true for an unknown metric key', async () => {
    const result = await standardizeMetrics([
      { key: 'unknown_analyte_xyz', value: 42, unit: 'mg/dl', confidence: 0.9 },
    ]);
    expect(result[0]).toMatchObject({
      standard_key: null,
      needs_review: true,
      raw_key: 'unknown_analyte_xyz',
    });
  });

  it('does not set needs_review when confidence is absent (null/undefined)', async () => {
    // No confidence score → belowConfidenceThreshold check is skipped
    const result = await standardizeMetrics([
      { key: 'hemoglobin', value: 12, unit: 'g/dl' }, // no confidence field
    ]);
    expect(result[0].confidence_score).toBeNull();
    expect(result[0].needs_review).toBe(false);
  });

  // --- Defensive: malformed input entries (Caveat 6 from the debate) ---

  it('does not crash when a metric entry has a null value', async () => {
    const result = await standardizeMetrics([
      { key: 'hemoglobin', value: null, unit: 'g/dl', confidence: 0.9 },
    ]);
    expect(result[0].needs_review).toBe(true);
    expect(result[0].parsed_value).toBeNull();
  });

  // --- loadDictionary error propagation ---

  it('throws when supabase returns an error loading the dictionary', async () => {
    const freshSupabase = require('../../config/supabaseAdminClient');
    freshSupabase.from.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockResolvedValue({ data: null, error: { message: 'DB unavailable' } }),
    });

    await expect(standardizeMetrics([{ key: 'hemoglobin', value: 12, unit: 'g/dl' }]))
      .rejects.toThrow('Failed to load metric_dictionary: DB unavailable');
  });

  // --- Cache behaviour ---

  it('does not call supabase a second time within the cache TTL', async () => {
    const freshSupabase = require('../../config/supabaseAdminClient');

    await standardizeMetrics([{ key: 'hemoglobin', value: 12, unit: 'g/dl' }]);
    await standardizeMetrics([{ key: 'hemoglobin', value: 13, unit: 'g/dl' }]);

    // supabase.from should have been called only once (first load)
    expect(freshSupabase.from).toHaveBeenCalledTimes(1);
  });
});

describe('parseNumericValue', () => {
  const { parseNumericValue } = require('../../services/standardization/standardizeLabReport.service');

  it.each([
    ['1,50,000', 150000], // Indian digit grouping
    ['150,000', 150000],
    ['7,500.5', 7500.5],
    ['13,5', 13.5], // decimal comma
    ['11.2', 11.2],
    ['.5', 0.5],
    [' 92 ', 92],
    [7, 7],
  ])('reads %p as %p', (raw, expected) => {
    expect(parseNumericValue(raw)).toEqual({ value: expected, inexact: false });
  });

  it.each(['<0.5', '> 200', '>=200', '≤ 1.0'])('reads %p as an inexact bound', (raw) => {
    const { value, inexact } = parseNumericValue(raw);
    expect(Number.isNaN(value)).toBe(false);
    expect(inexact).toBe(true);
  });

  it.each(['12.0 - 15.5', 'Non Reactive', '11.2 L', '', null, undefined])(
    'rejects %p instead of truncating it',
    (raw) => {
      expect(Number.isNaN(parseNumericValue(raw).value)).toBe(true);
    }
  );
});

describe('standardizeMetrics value parsing', () => {
  let standardizeMetrics;

  beforeEach(() => {
    jest.resetModules();
    jest.mock('../../config/supabaseAdminClient', () => ({ from: jest.fn() }));
    jest.mock('../../config/env', () => ({ ocrMetricReviewThreshold: 0.75 }));
    ({ standardizeMetrics } = require('../../services/standardization/standardizeLabReport.service'));
    require('../../config/supabaseAdminClient').from.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockResolvedValue({
        data: [
          { standard_key: 'platelets', aliases: ['Platelet Count'], unit_standard: '/cumm' },
          { standard_key: 'crp', aliases: ['CRP'], unit_standard: 'mg/l' },
        ],
        error: null,
      }),
    });
  });

  it('parses an Indian-grouped platelet count in full', async () => {
    const [metric] = await standardizeMetrics([{ key: 'Platelet Count', value: '1,50,000', unit: '/cumm' }]);
    expect(metric.parsed_value).toBe(150000);
    expect(metric.needs_review).toBe(false);
  });

  it('sends a "<" bound to review rather than recording it as exact', async () => {
    const [metric] = await standardizeMetrics([{ key: 'CRP', value: '<0.5', unit: 'mg/l' }]);
    expect(metric.parsed_value).toBe(0.5);
    expect(metric.needs_review).toBe(true);
  });
});
