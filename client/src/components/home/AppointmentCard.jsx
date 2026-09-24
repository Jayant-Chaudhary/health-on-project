import { format, differenceInCalendarDays } from 'date-fns';
import { Calendar, Stethoscope, FileText } from 'lucide-react';
import { cn } from '../../utils/cn';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';

/** Wording for each appointment status the database can hold. */
const STATUS_LABEL = {
  invited: 'Invited',
  active: 'Scheduled',
  checked_in: 'Checked in',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

function whenLabel(date) {
  const days = differenceInCalendarDays(date, new Date());
  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  if (days > 1) return `In ${days} days`;
  if (days === -1) return 'Yesterday';
  return `${Math.abs(days)} days ago`;
}

/**
 * One appointment in the patient's list. Selecting it makes it the
 * appointment that check-in and report sharing act on.
 */
export default function AppointmentCard({ appointment, isSelected, onSelect, sharedCount }) {
  const date = new Date(appointment.scheduled_at);
  const isPast = appointment.status === 'completed' || appointment.status === 'cancelled';

  return (
    <Card
      role="button"
      tabIndex={0}
      onClick={() => onSelect?.(appointment.id)}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), onSelect?.(appointment.id))}
      className={cn(
        'p-5 cursor-pointer transition-all',
        isSelected ? 'ring-2 ring-primary border-primary' : 'hover:border-primary/50'
      )}
    >
      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="min-w-0">
          <p className="font-bold text-ink">{format(date, 'EEEE, MMM d, yyyy')}</p>
          <p className="text-sm text-ink-soft">{format(date, 'h:mm a')} · {whenLabel(date)}</p>
        </div>
        <Badge
          className={
            isPast
              ? 'border-ink-soft/20 bg-canvas text-ink-soft'
              : 'border-primary/20 bg-primary-light text-primary-dark'
          }
        >
          {STATUS_LABEL[appointment.status] ?? appointment.status}
        </Badge>
      </div>

      <div className="space-y-2 pt-3 border-t border-ink-soft/10 text-sm">
        <p className="flex items-center gap-2 text-ink">
          <Stethoscope size={16} className="text-primary shrink-0" />
          {appointment.clinician?.full_name ?? 'Your clinician'}
        </p>
        <p className="flex items-center gap-2 text-ink-soft">
          <FileText size={16} className="text-primary shrink-0" />
          {sharedCount === undefined
            ? 'Reports shared with this visit'
            : `${sharedCount} report${sharedCount === 1 ? '' : 's'} shared`}
        </p>
      </div>

      {isSelected && (
        <p className="mt-3 flex items-center gap-1.5 text-xs font-bold text-primary uppercase tracking-wide">
          <Calendar size={13} /> Selected
        </p>
      )}
    </Card>
  );
}
