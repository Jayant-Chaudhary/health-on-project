import { Icon } from '../common/Icon.jsx';
import { TrendChart } from './TrendChart.jsx';
import { useMetricTrend } from '../../hooks/useMetricTrend.js';
import { trendOf } from '../../utils/clinical.js';
import { formatDate, relativeDays } from '../../utils/format.js';

const TREND_ICON = { up: 'trendUp', down: 'trendDown', flat: 'minus' };

/**
 * One parameter in the clinical data grid. The whole row is a disclosure
 * button — activating it expands the longitudinal history for that parameter
 * without navigating away from the patient.
 *
 * Reports carry no reference ranges yet, so the row makes no normal/abnormal
 * claim: it shows the reading, when it was taken, and whether OCR flagged it.
 */
export function MetricRow({ metric, patientId, expanded, onToggle }) {
  const { series, loading } = useMetricTrend({
    standardKey: metric.standardKey,
    patientId,
    enabled: expanded,
    seed: metric.history ?? [],
  });

  const { direction, delta } = trendOf(metric.history ?? []);

  return (
    <>
      <tr
        className={`cursor-pointer border-t border-line transition-colors hover:bg-subcanvas/70
                    ${expanded ? 'bg-subcanvas/70' : ''}`}
        onClick={onToggle}
      >
        <td className="py-3 pl-5 pr-2 align-top">
          <div className="flex items-start gap-2.5">
            <span
              className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${metric.needsReview ? 'bg-terracotta' : 'bg-sage'}`}
            />
            <div className="min-w-0">
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onToggle();
                }}
                aria-expanded={expanded}
                className="block truncate text-left font-display text-label-lg text-ink hover:text-cypress"
              >
                {metric.name}
              </button>
              <p className="truncate text-body-sm text-ink-3">{metric.source}</p>
            </div>
          </div>
        </td>

        <td className="px-2 py-3 align-top">
          {metric.value == null ? (
            <span className="text-body-sm italic text-ink-3">Needs review</span>
          ) : (
            <span className="font-display text-label-lg tabular text-ink">
              {metric.value}
              {metric.unit && (
                <span className="ml-1 font-sans text-body-sm font-normal text-ink-3">{metric.unit}</span>
              )}
            </span>
          )}
        </td>

        <td className="px-2 py-3 align-top">
          <span className="block text-body-sm text-ink-2" title={formatDate(metric.recordedAt)}>
            {relativeDays(metric.recordedAt) || '—'}
          </span>
          {metric.needsReview && (
            <span className="pill mt-1 border-terracotta-border bg-terracotta-surface text-terracotta">Needs review</span>
          )}
        </td>

        <td className="py-3 pl-2 pr-5 align-top">
          <div className="flex items-center justify-end gap-2 text-ink-2">
            {direction !== 'flat' && (
              <span
                className="inline-flex items-center gap-1 text-body-sm tabular"
                title={`${delta > 0 ? '+' : ''}${delta} since previous reading`}
              >
                <Icon name={TREND_ICON[direction]} size={14} />
                {delta > 0 ? '+' : ''}
                {delta}
              </span>
            )}
            <Icon
              name="chevronDown"
              size={16}
              className={`shrink-0 text-ink-3 transition-transform duration-250 ${expanded ? 'rotate-180' : ''}`}
            />
          </div>
        </td>
      </tr>

      {expanded && (
        <tr className="border-t border-line bg-subcanvas/40">
          <td colSpan={4} className="px-5 py-4">
            <div className="rounded-xl border border-line bg-surface p-4">
              <div className="mb-2 flex items-center gap-2">
                <Icon name="history" size={15} className="text-ink-3" />
                <h4 className="font-display text-label-lg text-ink">{metric.name} — history</h4>
                {loading && <span className="text-body-sm text-ink-3">loading…</span>}
              </div>
              <TrendChart
                series={series}
                unit={metric.unit}

              />
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

export default MetricRow;
