import { Avatar } from '../common/Avatar.jsx';
import { Chip, MetaChip } from '../common/Chip.jsx';
import { formatDate, formatGestationalAge, trimesterOf } from '../../utils/format.js';

/** Basic patient information banner — identity, parity and gestational anchors. */
export function PatientHeaderCard({ patient }) {
  if (!patient) return null;

  return (
    <section className="card flex flex-wrap items-center gap-x-5 gap-y-4 px-5 py-4">
      <Avatar name={patient.name} size="lg" />

      <div className="min-w-[240px] flex-1">
        <div className="flex flex-wrap items-center gap-2.5">
          <h1 className="font-display text-head-lg text-ink">{patient.name}</h1>
          <Chip status={patient.acuity} withDot>
            {patient.acuityLabel ?? 'Triage priority'}
          </Chip>
          <MetaChip className="tabular">{patient.mrn}</MetaChip>
        </div>

        <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-body-sm text-ink-2">
          <span className="tabular">{patient.age} yrs</span>
          <span className="text-ink-3">•</span>
          <span>
            Gravida {patient.gravida} · Para {patient.para}
          </span>
          <span className="text-ink-3">•</span>
          <span>Blood type {patient.bloodType}</span>
          {patient.midwife && (
            <>
              <span className="text-ink-3">•</span>
              <span>{patient.midwife} (primary midwife)</span>
            </>
          )}
        </p>
      </div>

      <dl className="flex shrink-0 divide-x divide-line rounded-xl border border-line bg-subcanvas">
        <div className="px-4 py-2">
          <dt className="text-label-sm uppercase text-ink-3">Gestational age</dt>
          <dd className="mt-0.5 font-display text-label-lg text-ink tabular">
            {formatGestationalAge(patient.gestationalDays)}{' '}
            <span className="font-sans text-body-sm font-normal text-ink-3">
              ({trimesterOf(patient.gestationalDays)})
            </span>
          </dd>
        </div>
        <div className="px-4 py-2">
          <dt className="text-label-sm uppercase text-ink-3">Est. due date</dt>
          <dd className="mt-0.5 font-display text-label-lg text-ink tabular">{formatDate(patient.dueDate)}</dd>
        </div>
      </dl>
    </section>
  );
}

export default PatientHeaderCard;
