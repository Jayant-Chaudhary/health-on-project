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

function matchSpelling(dictionary, rawKey, tokenSortIndex) {
  const normalizedRaw = normalizeKey(rawKey);
  if (!normalizedRaw) return undefined;

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
 * Bracketed words that describe how or where a test was run, never which
 * analyte it is — so "CRP (Quantitative)" may fall back to "CRP". Anything
 * else in brackets ("Direct", "Free", "Fasting") changes the analyte and is
 * never dropped.
 */
const METHOD_QUALIFIER = new RegExp(
  '^(' +
    [
      'quantitative', 'qualitative', 'calculated', 'calc', 'derived', 'computed', 'automated',
      'serum', 'plasma', 'whole blood', 'blood', 'edta', 'venous', 'capillary',
      'wintrobe', 'westergren', 'modified westergren',
      'clia', 'eclia', 'cmia', 'elisa', 'elfa', 'hplc', 'ise', 'ise indirect', 'ise direct',
      'enzymatic', 'kinetic', 'colorimetric', 'photometric', 'photometry', 'spectrophotometry',
      'immunoturbidimetry', 'immunoturbidimetric', 'turbidimetric', 'nephelometry',
      'jaffe', 'ifcc', 'biuret', 'bcg', 'bromocresol green', 'diazo', 'uricase', 'urease',
      'hexokinase', 'god pod', 'god-pod', 'gpo', 'chod pod', 'chod-pod', 'glucose oxidase',
      'impedance', 'electrical impedance', 'flow cytometry', 'microscopy', 'dipstick',
      '3rd generation', 'third generation',
    ].join('|') +
    ')$',
  'i'
);

/**
 * The dictionary entry for a printed test name, or undefined.
 *
 * Tries the name as printed first. Labs often add a bracket — an
 * abbreviation ("Hematocrit (HCT)", "Mean Cell Hb Concentration (MCHC)") or
 * a method ("ESR (Wintrobe)") — so it then tries each bracketed abbreviation
 * on its own, and finally the name without a method-only bracket.
 */
function findDictionaryEntry(dictionary, rawKey, tokenSortIndex) {
  const printed = String(rawKey ?? '');
  const direct = matchSpelling(dictionary, printed, tokenSortIndex);
  if (direct) return direct;

  const brackets = [...printed.matchAll(/[(\[]([^)\]]*)[)\]]/g)].map((m) => m[1].trim());
  if (brackets.length === 0) return undefined;
  const outside = printed.replace(/[(\[][^)\]]*[)\]]/g, ' ').replace(/\s+/g, ' ').trim();

  for (const inner of brackets) {
    if (!inner || METHOD_QUALIFIER.test(inner)) continue;
    const byAbbreviation = matchSpelling(dictionary, inner, tokenSortIndex);
    if (byAbbreviation) return byAbbreviation;
  }

  if (outside && brackets.every((inner) => !inner || METHOD_QUALIFIER.test(inner))) {
    return matchSpelling(dictionary, outside, tokenSortIndex);
  }

  return undefined;
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

/**
 * Results that are words, not numbers: dipstick grades, colours, microscopy
 * counts. They are genuine readings — "Negative" is the answer, not a failed
 * parse — so they are stored as printed and not sent to manual review.
 */
const QUALITATIVE_RESULT = new RegExp(
  '^(' +
    [
      'negative', 'positive', 'nil', 'absent', 'present', 'trace', 'normal', 'abnormal',
      'not detected', 'detected', 'non[- ]?reactive', 'reactive', 'not seen', 'seen',
      '[1-4]\\+', '\\+{1,4}', // dipstick grades: "2+", "++"
      '(pale |light |dark |deep )?(yellow|straw|amber|red|brown|orange)( yellow)?', 'colou?rless',
      'clear', 'slightly (turbid|hazy|cloudy)', 'turbid', 'hazy', 'cloudy',
      'acidic', 'alkaline', 'neutral',
      'occasional', 'rare', 'few', 'moderate', 'many', 'plenty', 'numerous',
    ].join('|') +
    ')$',
  'i'
);

/** A microscopy count printed as a range ("2-4" pus cells per hpf). */
const PER_FIELD_RANGE = /^\d+\s*[-–]\s*\d+$/;

function isQualitativeResult(value, entry) {
  if (typeof value !== 'string') return false;
  const text = value.trim().replace(/\s+/g, ' ');
  if (QUALITATIVE_RESULT.test(text)) return true;
  // A range is a real result only for urine microscopy; anywhere else it is
  // almost always the reference range picked up instead of the value.
  return entry?.category === 'urine' && PER_FIELD_RANGE.test(text);
}

async function standardizeMetrics(rawMetrics) {
  const dictionary = await loadDictionary();

  return rawMetrics.map((metric) => {
    const entry = findDictionaryEntry(dictionary, metric.key, tokenSortIndexCache);
    const { value: numericValue, inexact } = parseNumericValue(metric.value);
    const hasNumericValue = !Number.isNaN(numericValue);
    const qualitative = !hasNumericValue && isQualitativeResult(metric.value, entry);
    const unreadable = !hasNumericValue && !qualitative;
    const belowConfidenceThreshold =
      typeof metric.confidence === 'number' && metric.confidence < env.ocrMetricReviewThreshold;

    // A test the dictionary does not know is still a confident reading; it is
    // kept under its printed name and only flagged when the value itself is
    // doubtful (unreadable, a bound like "<0.5", or low OCR confidence).
    if (!entry) {
      return {
        raw_key: metric.key,
        standard_key: null,
        raw_value: String(metric.value),
        parsed_value: hasNumericValue ? numericValue : null,
        unit_raw: metric.unit || null,
        unit_standard: null,
        confidence_score: metric.confidence ?? null,
        needs_review: unreadable || inexact || belowConfidenceThreshold,
      };
    }

    const conversion = hasNumericValue
      ? convertUnit(numericValue, metric.unit, entry.unit_standard, entry.standard_key)
      : { value: null, converted: false };

    const unitConversionFailed = Boolean(metric.unit) && conversion.converted === false;

    const needsReview = unreadable || inexact || unitConversionFailed || belowConfidenceThreshold;

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
