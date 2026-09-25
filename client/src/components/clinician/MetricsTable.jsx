import { useState } from 'react';
import { SectionCard } from '../common/SectionCard.jsx';
import { EmptyState } from '../common/EmptyState.jsx';
import { MetricRow } from './MetricRow.jsx';

const COLUMNS = [
  { label: 'Test / Parameter', className: 'pl-5 pr-2', width: 'w-[42%]' },
  { label: 'Latest value', className: 'px-2', width: 'w-[26%]' },
  { label: 'Recorded', className: 'px-2', width: 'w-[20%]' },
  { label: 'Trend', className: 'pl-2 pr-5 text-right', width: 'w-[12%]' },
];

/**
 * Left column: every standardized clinical parameter in one scannable grid.
 * Rows are clickable and expand into that parameter's history.
 */
export function MetricsTable({ metrics = [], patientId }) {
  const [expandedKey, setExpandedKey] = useState(null);

  return (
    <SectionCard
      icon="chart"
      title="Clinical Data"
      subtitle="Select any row to open its history across past visits"
      action={
        <span className="shrink-0 rounded-full bg-subcanvas px-3 py-1 text-label-sm uppercase text-ink-2">
          {metrics.length} parameters
        </span>
      }
    >
      {metrics.length === 0 ? (
        <EmptyState
          icon="flask"
          title="No standardized results yet"
          description="Values appear here once an uploaded report clears the OCR pipeline."
        />
      ) : (
        <table className="w-full table-fixed border-collapse text-left">
          <thead>
            <tr className="text-label-sm uppercase text-ink-3">
              {COLUMNS.map((column) => (
                <th
                  key={column.label}
                  scope="col"
                  className={`py-2.5 font-semibold ${column.width} ${column.className}`}
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {metrics.map((metric) => (
              <MetricRow
                key={metric.standardKey}
                metric={metric}
                patientId={patientId}
                expanded={expandedKey === metric.standardKey}
                onToggle={() =>
                  setExpandedKey((current) => (current === metric.standardKey ? null : metric.standardKey))
                }
              />
            ))}
          </tbody>
        </table>
      )}
    </SectionCard>
  );
}

export default MetricsTable;
