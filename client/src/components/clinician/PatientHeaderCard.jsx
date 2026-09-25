import { Avatar } from '../common/Avatar.jsx';
import { MetaChip } from '../common/Chip.jsx';
import { formatHeaderDate } from '../../utils/format.js';

const STATUS_LABEL = {
  invited: 'Invite pending',
  active: 'Scheduled',
  checked_in: 'Checked in',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

/**
 * Who the clinician is looking at, and which visit. Only facts on file are
 * shown — a detail the patient has not filled in is left out, not faked.
 */
export function PatientHeaderCard({ patient }) {
  if (!patient) return null;

  const facts = [
    patient.age != null && `${patient.age} yrs`,
    patient.bloodType && `Blood type ${patient.bloodType}`,
    patient.phone,
    patient.email,
  ].filter(Boolean);

  return (
    <section className="card flex flex-wrap items-center gap-x-5 gap-y-4 px-5 py-4">
      <Avatar name={patient.name} size="lg" />

      <div className="min-w-[240px] flex-1">
        <div className="flex flex-wrap items-center gap-2.5">
          <h1 className="font-display text-head-lg text-ink">{patient.name}</h1>
          {patient.visitStatus && <MetaChip>{STATUS_LABEL[patient.visitStatus] ?? patient.visitStatus}</MetaChip>}
        </div>

        {facts.length > 0 && (
          <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-body-sm text-ink-2">
            {facts.map((fact, index) => (
              <span key={fact} className="flex items-center gap-2">
                {index > 0 && <span className="text-ink-3">•</span>}
                <span className="tabular">{fact}</span>
              </span>
            ))}
          </p>
        )}
      </div>

      {patient.visitAt && (
        <dl className="shrink-0 rounded-xl border border-line bg-subcanvas px-4 py-2">
          <dt className="text-label-sm uppercase text-ink-3">This visit</dt>
          <dd className="mt-0.5 font-display text-label-lg text-ink tabular">{formatHeaderDate(patient.visitAt)}</dd>
        </dl>
      )}
    </section>
  );
}

export default PatientHeaderCard;
