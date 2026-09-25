import { useState } from 'react';
import { AlertTriangle, ChevronDown, ExternalLink } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { cn } from '../../utils/cn';

const ENGINE_LABEL = {
  digital: 'Read from the PDF text',
  ocr: 'Read by scanning the image',
  none: 'Could not be read',
};

function percent(value) {
  return typeof value === 'number' ? `${Math.round(value * 100)}%` : '—';
}

/**
 * What the OCR pipeline read from one uploaded report, so the patient can
 * check it before their doctor relies on it.
 *
 * `raw_ocr_payload` is the pipeline's envelope (text, engine, confidence,
 * warnings), or `{ error }` when extraction failed. The metric rows are the
 * standardized values actually saved.
 */
export default function OcrPreviewModal({ report, isOpen, onClose }) {
  const [textOpen, setTextOpen] = useState(false);
  if (!report) return null;

  const raw = report.raw_ocr_payload ?? {};
  const metrics = report.lab_report_metrics ?? [];
  const warnings = Array.isArray(raw.warnings) ? raw.warnings : [];
  const text = typeof raw.text === 'string' ? raw.text.trim() : '';
  const flagged = metrics.filter((m) => m.needs_review).length;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="What we read from your report" className="max-w-2xl">
      <div className="space-y-5">
        <div className="flex flex-wrap gap-2 text-xs">
          {raw.engine && (
            <span className="px-2.5 py-1 rounded-full bg-canvas border border-ink-soft/15 text-ink">
              {ENGINE_LABEL[raw.engine] ?? raw.engine}
            </span>
          )}
          {typeof raw.confidence === 'number' && (
            <span className="px-2.5 py-1 rounded-full bg-canvas border border-ink-soft/15 text-ink">
              Overall confidence {percent(raw.confidence)}
            </span>
          )}
          {flagged > 0 && (
            <span className="px-2.5 py-1 rounded-full bg-attention-light text-attention font-medium">
              {flagged} value{flagged === 1 ? '' : 's'} for your doctor to check
            </span>
          )}
        </div>

        {raw.error && (
          <p className="flex items-start gap-2 rounded-lg bg-attention-light p-3 text-sm text-ink">
            <AlertTriangle size={16} className="mt-0.5 shrink-0 text-attention" />
            We could not read this document automatically. Your doctor will review the original file.
          </p>
        )}

        {warnings.length > 0 && (
          <ul className="space-y-1 rounded-lg bg-attention-light/60 p-3 text-sm text-ink">
            {warnings.map((warning) => (
              <li key={warning} className="flex items-start gap-2">
                <AlertTriangle size={14} className="mt-0.5 shrink-0 text-attention" />
                {warning}
              </li>
            ))}
          </ul>
        )}

        <section>
          <h3 className="text-sm font-bold text-ink mb-2">Values found ({metrics.length})</h3>
          {metrics.length === 0 ? (
            <p className="text-sm text-ink-soft">No test values were recognized in this document.</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-ink-soft/15">
              <table className="w-full text-sm">
                <thead className="bg-canvas text-left text-xs text-ink-soft">
                  <tr>
                    <th className="px-3 py-2 font-medium">Test</th>
                    <th className="px-3 py-2 font-medium">Value</th>
                    <th className="px-3 py-2 font-medium">Unit</th>
                    <th className="px-3 py-2 font-medium text-right">Confidence</th>
                  </tr>
                </thead>
                <tbody>
                  {metrics.map((m) => (
                    <tr key={m.id} className={cn('border-t border-ink-soft/10', m.needs_review && 'bg-attention-light/40')}>
                      <td className="px-3 py-2 text-ink">
                        {m.metric_dictionary?.display_name ?? m.raw_key}
                        {m.metric_dictionary?.display_name && m.raw_key !== m.metric_dictionary.display_name && (
                          <span className="block text-[11px] text-ink-soft">as printed: {m.raw_key}</span>
                        )}
                      </td>
                      <td className="px-3 py-2 font-medium text-ink tabular-nums">
                        {m.reviewed_value ?? m.parsed_value ?? m.raw_value ?? '—'}
                      </td>
                      <td className="px-3 py-2 text-ink-soft">{m.unit_standard ?? m.unit_raw ?? ''}</td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        <span className={m.needs_review ? 'text-attention font-medium' : 'text-ink-soft'}>
                          {percent(m.confidence_score)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {text && (
          <section>
            <button
              type="button"
              onClick={() => setTextOpen((open) => !open)}
              aria-expanded={textOpen}
              className="flex w-full items-center justify-between text-sm font-bold text-ink"
            >
              Full extracted text
              <ChevronDown size={16} className={cn('transition-transform', textOpen && 'rotate-180')} />
            </button>
            {textOpen && (
              <pre className="mt-2 max-h-72 overflow-auto whitespace-pre-wrap rounded-lg bg-canvas p-3 text-xs text-ink">
                {text}
              </pre>
            )}
          </section>
        )}

        {report.signed_url && (
          <a
            href={report.signed_url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
          >
            <ExternalLink size={14} /> Compare with the original file
          </a>
        )}
      </div>
    </Modal>
  );
}
