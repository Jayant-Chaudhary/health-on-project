const supabaseAdmin = require('../../config/supabaseAdminClient');
const env = require('../../config/env');
const { convertUnit } = require('./unitConversion.service');

let dictionaryCache = null;
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
  dictionaryCacheAt = Date.now();
  return data;
}

function normalizeKey(key) {
  return key.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
}

function findDictionaryEntry(dictionary, rawKey) {
  const normalizedRaw = normalizeKey(rawKey);

  return dictionary.find((entry) => {
    if (normalizeKey(entry.standard_key) === normalizedRaw) return true;
    return (entry.aliases || []).some((alias) => normalizeKey(alias) === normalizedRaw);
  });
}

async function standardizeMetrics(rawMetrics) {
  const dictionary = await loadDictionary();

  return rawMetrics.map((metric) => {
    const entry = findDictionaryEntry(dictionary, metric.key);
    const numericValue = typeof metric.value === 'number' ? metric.value : parseFloat(metric.value);
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

    const needsReview = !hasNumericValue || unitConversionFailed || belowConfidenceThreshold;

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

module.exports = { standardizeMetrics, loadDictionary };
