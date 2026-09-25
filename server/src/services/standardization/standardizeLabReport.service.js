const supabaseAdmin = require('../../config/supabaseAdminClient');
const env = require('../../config/env');
const { convertUnit } = require('./unitConversion.service');

let dictionaryCache = null;
let tokenSortIndexCache = null;
let dictionaryCacheAt = 0;
const CACHE_TTL_MS = 60 * 1000;

async function loadDictionary() {
  const isStale = Date.now() - dictionaryCacheAt > CACHE_TTL_MS;
  if (dictionaryCache && !isStale) {
    return dictionaryCache;
  }

  const { data, error } = await supabaseAdmin
    .from('metric_dictionary')
    .select('standard_key, display_name, category, unit_standard, aliases')
    .eq('is_active', true);

  if (error) {
    throw new Error(`Failed to load metric_dictionary: ${error.message}`);
  }

  dictionaryCache = data;
  tokenSortIndexCache = buildTokenSortIndex(data);
  dictionaryCacheAt = Date.now();
  return data;
}

function normalizeKey(key) {
  return key.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * The same normalization, but with the words sorted.
 *
 * Labs print the same analyte in either order — "Glucose Fasting" on one
 * report, "Fasting Glucose" on the next — and exact matching treats those as
 * unrelated. Sorting the words makes the comparison order-insensitive.
 *
 * It deliberately does NOT strip qualifiers: "Testosterone, Total" and
 * "Testosterone, Free" are different analytes and must never collapse onto
 * each other.
 */
function tokenSortKey(key) {
  return key
    .trim()
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean)
    .sort()
    .join('');
}

/**
 * Index of token-sorted spelling -> standard_key, built once per dictionary
 * load. A spelling that two different metrics share is dropped rather than
 * resolved arbitrarily: guessing between two analytes is worse than sending
 * the value to the clinician for review.
 */
function buildTokenSortIndex(dictionary) {
  const index = new Map();
  const ambiguous = new Set();

  for (const entry of dictionary) {
    for (const spelling of [entry.standard_key, ...(entry.aliases || [])]) {
      const token = tokenSortKey(spelling);
      if (!token) continue;

      const existing = index.get(token);
      if (existing && existing !== entry.standard_key) {
        ambiguous.add(token);
      } else {
        index.set(token, entry.standard_key);
      }
    }
  }

  for (const token of ambiguous) {
    index.delete(token);
  }

  return index;
}

function findDictionaryEntry(dictionary, rawKey, tokenSortIndex) {
  const normalizedRaw = normalizeKey(rawKey);

  const exact = dictionary.find((entry) => {
    if (normalizeKey(entry.standard_key) === normalizedRaw) return true;
    return (entry.aliases || []).some((alias) => normalizeKey(alias) === normalizedRaw);
  });

  if (exact) return exact;

  // Fall back to an order-insensitive match before giving up.
  const standardKey = tokenSortIndex?.get(tokenSortKey(rawKey));
  return standardKey ? dictionary.find((entry) => entry.standard_key === standardKey) : undefined;
}

/**
 * Numeric reading of a printed result, or NaN when it has none.
 *
 * `parseFloat` alone reads "1,50,000" (Indian digit grouping) as 1 and
 * "<0.5" as NaN. Comparator-prefixed values ("<0.5", ">200") are parsed but
 * reported as `inexact`: the printed number is a bound, not the measurement,
 * so it goes to a clinician rather than straight onto a trend chart.
 */
function parseNumericValue(value) {
  if (typeof value === 'number') return { value, inexact: false };
  if (typeof value !== 'string') return { value: NaN, inexact: false };

  let text = value.trim();
  const inexact = /^[<>≤≥]/.test(text);
  text = text.replace(/^[<>≤≥]=?\s*/, '');

  if (/^[-+]?\d{1,3}(,\d{2})*,\d{3}(\.\d+)?$/.test(text)) {
    // Digit grouping: "1,50,000", "150,000", "7,500.5".
    text = text.replace(/,/g, '');
  } else if (/^[-+]?\d+,\d{1,2}$/.test(text)) {
    // Decimal comma: "13,5".
    text = text.replace(',', '.');
  }

  // Whole-string match, so "12.0 - 15.5" or "11.2 L" are not silently truncated.
  if (!/^[-+]?(\d+\.?\d*|\.\d+)$/.test(text)) return { value: NaN, inexact };
  return { value: Number(text), inexact };
}

async function standardizeMetrics(rawMetrics) {
  const dictionary = await loadDictionary();

  return rawMetrics.map((metric) => {
    const entry = findDictionaryEntry(dictionary, metric.key, tokenSortIndexCache);
    const { value: numericValue, inexact } = parseNumericValue(metric.value);
    const hasNumericValue = !Number.isNaN(numericValue);

    if (!entry) {
      return {
        raw_key: metric.key,
        standard_key: null,
        raw_value: String(metric.value),
        parsed_value: hasNumericValue ? numericValue : null,
        unit_raw: metric.unit || null,
        unit_standard: null,
        confidence_score: metric.confidence ?? null,
        needs_review: true,
      };
    }

    const conversion = hasNumericValue
      ? convertUnit(numericValue, metric.unit, entry.unit_standard)
      : { value: null, converted: false };

    const unitConversionFailed = Boolean(metric.unit) && conversion.converted === false;
    const belowConfidenceThreshold =
      typeof metric.confidence === 'number' && metric.confidence < env.ocrMetricReviewThreshold;

    const needsReview = !hasNumericValue || inexact || unitConversionFailed || belowConfidenceThreshold;

    return {
      raw_key: metric.key,
      standard_key: entry.standard_key,
      raw_value: String(metric.value),
      parsed_value: conversion.value,
      unit_raw: metric.unit || null,
      unit_standard: entry.unit_standard || null,
      confidence_score: metric.confidence ?? null,
      needs_review: needsReview,
    };
  });
}

module.exports = {
  standardizeMetrics,
  loadDictionary,
  // Exported for tests: matching behaviour is worth asserting directly.
  normalizeKey,
  parseNumericValue,
  tokenSortKey,
  buildTokenSortIndex,
  findDictionaryEntry,
};
