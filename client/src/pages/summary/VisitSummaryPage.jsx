import { useState, useEffect, useMemo } from 'react';
import { patientService } from '../../services/patientService';
import { usePatientContext } from '../../context/PatientContext';
import { useToast } from '../../context/ToastContext';
import { Card } from '../../components/ui/Card';
import { Skeleton } from '../../components/ui/Skeleton';
import { Checkbox } from '../../components/ui/Checkbox';
import { FileText, ClipboardList, Calendar, ChevronRight, Stethoscope, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';

/**
 * A visit's summary is shared when the doctor ends the visit, which marks it
 * completed; until then the server returns nothing for it.
 */
function isVisited(appointment) {
  return appointment.status === 'completed';
}

export default function VisitSummaryPage() {
  const { appointments, loading: contextLoading } = usePatientContext();
  const { showToast } = useToast();

  // Newest first — appointments.all is already sorted that way.
  const visits = useMemo(() => appointments.all.filter(isVisited), [appointments.all]);

  const [selectedId, setSelectedId] = useState(null);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!selectedId && visits.length > 0) setSelectedId(visits[0].id);
  }, [visits, selectedId]);

  useEffect(() => {
    if (!selectedId) return undefined;

    let cancelled = false;
    setLoading(true);
    setSummary(null);

    patientService
      .getVisitSummary(selectedId)
      .then((data) => !cancelled && setSummary(data))
      .catch((err) => !cancelled && showToast(err.message || 'Could not load this visit.', 'error'))
      .finally(() => !cancelled && setLoading(false));

    return () => {
      cancelled = true;
    };
  }, [selectedId, showToast]);

  /** Optimistic, rolled back if the save fails. */
  const handleToggle = async (itemId, isCompleted) => {
    const setDone = (value) =>
      setSummary((current) => ({
        ...current,
        actionItems: current.actionItems.map((item) =>
          item.id === itemId ? { ...item, is_completed: value } : item
        ),
      }));

    setDone(isCompleted);
    try {
      await patientService.toggleNextStep(itemId, isCompleted);
    } catch (err) {
      setDone(!isCompleted);
      showToast(err.message || 'Could not update that step.', 'error');
    }
  };

  if (contextLoading) {
    return (
      <div className="py-8 space-y-6">
        <Skeleton className="h-40 w-full rounded-card" />
        <Skeleton className="h-64 w-full rounded-card" />
      </div>
    );
  }

  if (visits.length === 0) {
    return (
      <div className="py-8 text-center">
        <p className="text-ink-soft">No visit summaries yet. Your doctor shares one when they end your visit.</p>
      </div>
    );
  }

  const notes = summary?.notes?.notes_text;
  const prescriptions = summary?.prescriptions ?? [];
  const nextSteps = summary?.actionItems ?? [];
  const covered = summary?.consultationChecklist ?? [];

  return (
    <div className="py-8 animate-in fade-in duration-300 max-w-6xl mx-auto">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-ink mb-2">Visit History</h1>
        <p className="text-ink-soft">Review past doctor's notes and manage your next steps.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

        {/* Left: History Timeline / List */}
        <div className="lg:col-span-4 space-y-4">
          <h3 className="font-bold text-lg text-ink mb-4">Past Appointments</h3>

          <div className="space-y-3">
            {visits.map(visit => (
              <div
                key={visit.id}
                onClick={() => setSelectedId(visit.id)}
                className={`p-4 rounded-card border cursor-pointer transition-all ${
                  selectedId === visit.id
                    ? 'bg-primary-light border-primary/50 shadow-sm'
                    : 'bg-raised border-ink-soft/20 hover:border-primary/40 hover:shadow-sm'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${selectedId === visit.id ? 'bg-primary text-white' : 'bg-canvas text-primary'}`}>
                      <Calendar size={18} />
                    </div>
                    <div>
                      <p className={`font-bold ${selectedId === visit.id ? 'text-primary-dark' : 'text-ink'}`}>
                        {format(new Date(visit.scheduled_at), 'MMMM d, yyyy')}
                      </p>
                      <p className="text-xs text-ink-soft">{visit.clinician?.full_name ?? 'Your clinician'}</p>
                    </div>
                  </div>
                  <ChevronRight size={20} className={selectedId === visit.id ? 'text-primary' : 'text-ink-soft/50'} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Selected Summary Details */}
        <div className="lg:col-span-8">
          {loading || !summary ? (
            <Skeleton className="h-64 w-full rounded-card" />
          ) : (
            <div className="animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                {/* Notes & Prescriptions */}
                <div className="space-y-6">
                  <Card className="p-6">
                    <div className="flex items-center gap-2 mb-4 text-ink">
                      <FileText size={20} className="text-primary" />
                      <h3 className="font-bold text-lg">Doctor's Notes</h3>
                    </div>
                    <div className="bg-canvas p-4 rounded-lg text-ink font-medium leading-relaxed whitespace-pre-wrap">
                      {notes || <span className="text-ink-soft font-normal">No notes were added for this visit.</span>}
                    </div>
                  </Card>

                  {covered.length > 0 && (
                    <Card className="p-6">
                      <div className="flex items-center gap-2 mb-4 text-ink">
                        <Stethoscope size={20} className="text-primary" />
                        <h3 className="font-bold text-lg">Covered in your visit</h3>
                      </div>
                      <ul className="space-y-2">
                        {covered.map((item) => (
                          <li key={item.id} className="flex items-start gap-2 text-ink">
                            <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-success" />
                            <span>{item.label}</span>
                          </li>
                        ))}
                      </ul>
                    </Card>
                  )}

                  {prescriptions.map((prescription) => (
                    <Card key={prescription.id} className="p-6">
                      <h3 className="font-bold text-lg text-ink mb-4">Prescription</h3>
                      {prescription.typed_instructions && (
                        <p className="text-sm text-ink mb-4 whitespace-pre-wrap">{prescription.typed_instructions}</p>
                      )}
                      {prescription.signed_url && /\.pdf$/i.test(prescription.storage_path ?? '') && (
                        <a
                          href={prescription.signed_url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-2 text-primary font-medium hover:underline"
                        >
                          <FileText size={16} /> Open prescription (PDF)
                        </a>
                      )}
                      {prescription.signed_url && !/\.pdf$/i.test(prescription.storage_path ?? '') && (
                        <a href={prescription.signed_url} target="_blank" rel="noreferrer">
                          <div className="rounded-lg overflow-hidden border border-ink-soft/20 bg-canvas">
                            <img
                              src={prescription.signed_url}
                              alt="Prescription"
                              className="w-full h-auto object-cover"
                            />
                          </div>
                        </a>
                      )}
                    </Card>
                  ))}
                </div>

                {/* Next Steps Checklist */}
                <div>
                  <Card className="p-6 sticky top-24">
                    <div className="flex items-center gap-2 mb-6 text-ink">
                      <ClipboardList size={20} className="text-accent" />
                      <h3 className="font-bold text-lg">Your Next Steps</h3>
                    </div>

                    {nextSteps.length > 0 ? (
                      <div className="space-y-2">
                        {nextSteps.map(step => (
                          <div key={step.id} className="px-3 rounded-lg hover:bg-canvas transition-colors">
                            <Checkbox
                              id={step.id}
                              checked={step.is_completed}
                              onChange={(e) => handleToggle(step.id, e.target.checked)}
                              label={
                                <span className={step.is_completed ? 'text-ink-soft line-through' : 'text-ink font-bold'}>
                                  {step.label}
                                </span>
                              }
                            />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-ink-soft">No next steps assigned for this visit.</p>
                    )}
                  </Card>
                </div>

              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
