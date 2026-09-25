import { useState } from 'react';
import { Icon } from '../common/Icon.jsx';
import { Chip } from '../common/Chip.jsx';
import { countRedFlags, isRedFlag } from '../../utils/clinical.js';
import { formatDate } from '../../utils/format.js';

/**
 * Pre-visit questionnaire answers, collapsible to a single summary line.
 * Red-flag "Yes" answers are surfaced first and tinted terracotta so the
 * clinician reads risk before reading the rest.
 */
export function PreVisitQuestionnairePanel({ questionnaire }) {
  const [open, setOpen] = useState(true);
  const answers = questionnaire?.answers ?? [];
  const flagged = countRedFlags(answers);

  // Red flags first, then everything else in original order.
  const ordered = [...answers].sort((a, b) => Number(isRedFlag(b)) - Number(isRedFlag(a)));

  return (
    <section className="card shrink-0 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 px-5 py-3.5 text-left transition-colors hover:bg-subcanvas/60"
      >
        <Icon
          name="chevronDown"
          size={18}
          className={`shrink-0 text-ink-3 transition-transform duration-250 ${open ? '' : '-rotate-90'}`}
        />
        <h2 className="font-display text-head-sm text-ink">Pre-Visit Questionnaire</h2>

        {flagged > 0 ? (
          <Chip status="elevated" withDot>
            {flagged} red flag{flagged > 1 ? 's' : ''}
          </Chip>
        ) : (
          <Chip status="optimal" withDot>
            No red flags
          </Chip>
        )}

        <span className="ml-auto hidden text-body-sm text-ink-3 sm:block">
          Submitted {formatDate(questionnaire?.submittedAt)} · {answers.length} answers
        </span>
      </button>

      {open && (
        // Capped and scrolled on its own, so a long questionnaire never
        // squeezes the work columns below it off the screen.
        <div className="scroll-column grid max-h-[28vh] gap-3 border-t border-line px-5 py-4 sm:grid-cols-2 xl:grid-cols-3">
          {ordered.map((answer) => {
            const flag = isRedFlag(answer);
            return (
              <article
                key={answer.id}
                className={`rounded-xl border p-3 ${
                  flag ? 'border-terracotta-border bg-terracotta-surface' : 'border-line bg-subcanvas'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <h3
                    className={`font-display text-label-md uppercase ${flag ? 'text-terracotta' : 'text-ink-2'}`}
                  >
                    {answer.shortLabel}
                  </h3>
                  {answer.responseType !== 'text' && (
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-label-sm uppercase ${
                        flag ? 'bg-terracotta text-white' : 'bg-line/70 text-ink-2'
                      }`}
                    >
                      {answer.answer ? 'Yes' : 'No'}
                    </span>
                  )}
                </div>
                {answer.responseType === 'text' && (
                  <p className="mt-1.5 whitespace-pre-wrap text-body-md text-ink">{answer.answerText}</p>
                )}
                {answer.detail && (
                  <p className={`mt-1.5 text-body-sm ${flag ? 'text-terracotta-deep' : 'text-ink-2'}`}>
                    {answer.detail}
                  </p>
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

export default PreVisitQuestionnairePanel;
