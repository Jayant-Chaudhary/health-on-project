import { usePatientContext } from '../../context/PatientContext';
import { cn } from '../../utils/cn';

export default function DevStateSwitcher() {
  const { appointment, updateStatus } = usePatientContext();

  // Only render in dev mode
  if (import.meta.env.PROD) return null;
  if (!appointment) return null;

  const states = [
    'SCHEDULED',
    'CHECKIN_IN_PROGRESS',
    'CHECKIN_COMPLETE',
    'VISIT_COMPLETED'
  ];

  return (
    <div className="fixed bottom-24 right-4 z-50 bg-ink text-white p-3 rounded-card shadow-2xl opacity-80 hover:opacity-100 transition-opacity">
      <div className="text-[10px] font-bold uppercase tracking-wider mb-2 text-ink-soft">Dev State Switcher</div>
      <div className="flex flex-col gap-2">
        {states.map(s => (
          <button
            key={s}
            onClick={() => updateStatus(s)}
            className={cn(
              "text-xs px-3 py-2 rounded-control text-left transition-colors",
              appointment.status === s ? "bg-primary font-bold text-white" : "bg-white/10 hover:bg-white/20"
            )}
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}
