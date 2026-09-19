import { useEffect, useState } from 'react';
import { fetchMetricTrend } from '../services/clinicianService.js';

/**
 * Fetches the longitudinal series for one metric when its row is expanded.
 * `seed` (the history already bundled with the metric) renders immediately so
 * the chart never flashes empty.
 */
export function useMetricTrend({ standardKey, patientId, enabled, seed = [] }) {
  const [series, setSeries] = useState(seed);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!enabled || !standardKey) return undefined;

    let cancelled = false;
    setLoading(true);

    fetchMetricTrend(standardKey, patientId)
      .then((rows) => {
        if (!cancelled && rows?.length) setSeries(rows);
      })
      .catch(() => {
        /* keep the seeded series — a failed trend fetch is not worth a blocking error */
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [standardKey, patientId, enabled]);

  return { series, loading };
}
