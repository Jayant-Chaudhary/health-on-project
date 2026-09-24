import { usePatientContext } from '../../context/PatientContext';
import { format, differenceInDays } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { Button } from '../ui/Button';

export default function ActionBanner() {
  const { appointment } = usePatientContext();
  const navigate = useNavigate();

  if (!appointment) return null;

  const status = appointment.status;
  const appointmentDate = new Date(appointment.scheduled_at || appointment.startsAt || new Date());
  const daysUntil = differenceInDays(appointmentDate, new Date());
  
  const doctorName = appointment.clinician?.full_name || appointment.doctor?.name || 'Your Doctor';
  const clinicName = appointment.clinic?.name || 'Maternal Care Clinic';
  
  const getBannerContent = () => {
    switch (status) {
      case 'invited':
        return {
          bg: 'bg-primary-light',
          title: `You have an upcoming appointment in ${daysUntil} days`,
          subtitle: "Please complete your pre-visit questionnaire",
          btnText: "Start pre-visit check-in",
          btnAction: () => navigate('/checkin/symptoms')
        };
      case 'active':
        return {
          bg: 'bg-primary-light',
          title: `Your appointment is in ${daysUntil} days`,
          subtitle: "Check-in in progress",
          btnText: "Continue check-in",
          btnAction: () => navigate('/checkin/symptoms')
        };
      case 'checked_in':
        return {
          bg: 'bg-success-light',
          title: "You're all set for your visit",
          subtitle: "Check-in complete",
          btnText: "Add to calendar",
          btnAction: () => alert('Calendar download mock')
        };
      case 'completed':
        return {
          bg: 'bg-canvas',
          border: 'border border-primary',
          title: "Your visit summary is ready",
          subtitle: "Doctor notes and next steps available",
          btnText: "View summary",
          btnAction: () => navigate('/summary'),
          secondaryBtnText: "Add Lab Reports",
          secondaryBtnAction: () => navigate('/reports')
        };
      default:
        return null;
    }
  };

  const content = getBannerContent();
  if (!content) return null;

  return (
    <div className={`rounded-card p-5 ${content.bg} ${content.border || ''} shadow-sm mb-6`}>
      <div className="flex justify-between items-start mb-4">
        <div>
          <h2 className="text-lg font-bold text-ink mb-1">{content.title}</h2>
          <p className="text-sm font-medium text-primary">{content.subtitle}</p>
        </div>
      </div>
      
      <div className="bg-white/60 rounded-lg p-3 mb-4 space-y-1">
        <p className="text-sm font-bold text-ink">{format(appointmentDate, 'MMM d, yyyy · h:mm a')}</p>
        <p className="text-xs text-ink-soft">{doctorName} · {clinicName}</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <Button onClick={content.btnAction} className="w-full">
          {content.btnText}
        </Button>
        {content.secondaryBtnText && (
          <Button onClick={content.secondaryBtnAction} variant="secondary" className="w-full bg-white">
            {content.secondaryBtnText}
          </Button>
        )}
      </div>
    </div>
  );
}
