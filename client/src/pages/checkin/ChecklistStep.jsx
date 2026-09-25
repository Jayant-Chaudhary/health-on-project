import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { checkinService } from '../../services/checkinService';
import { usePatientContext } from '../../context/PatientContext';
import { useToast } from '../../context/ToastContext';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Checkbox } from '../../components/ui/Checkbox';
import { Skeleton } from '../../components/ui/Skeleton';
import { Sparkles } from 'lucide-react';

export default function ChecklistStep() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();
  const { activeAppointment, loading: contextLoading, updateStatus } = usePatientContext();
  const { showToast } = useToast();

  const appointmentId = activeAppointment?.id;

  useEffect(() => {
    if (contextLoading) return undefined;
    if (!appointmentId) {
      setLoading(false);
      return undefined;
    }

    let cancelled = false;
    setLoading(true);

    checkinService
      .getChecklist(appointmentId)
      .then((data) => !cancelled && setItems(data))
      .catch((err) => !cancelled && showToast(err.message || 'Could not load your checklist.', 'error'))
      .finally(() => !cancelled && setLoading(false));

    return () => {
      cancelled = true;
    };
  }, [appointmentId, contextLoading, showToast]);

  /** Optimistic, then saved — rolled back if the save fails. */
  const handleToggle = async (item) => {
    const next = !item.is_completed;
    const setDone = (value) =>
      setItems((current) => current.map((i) => (i.id === item.id ? { ...i, is_completed: value } : i)));

    setDone(next);
    try {
      await checkinService.toggleChecklistItem(item.id, next);
    } catch (err) {
      setDone(!next);
      showToast(err.message || 'Could not update that item.', 'error');
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      // Through the context, so the dashboard banner reflects the check-in.
      await updateStatus('checked_in', appointmentId);
      navigate('/checkin/done');
    } catch (err) {
      showToast(err.message || 'Could not submit your check-in.', 'error');
      setSubmitting(false);
    }
  };

  const clinicItems = items.filter((i) => i.source !== 'ai_generated');
  const aiItems = items.filter((i) => i.source === 'ai_generated');

  if (loading || contextLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-64 w-full rounded-card" />
      </div>
    );
  }

  if (!appointmentId) {
    return (
      <Card className="p-8 text-center">
        <h2 className="font-bold text-lg text-ink mb-2">No appointment selected</h2>
        <p className="text-ink-soft mb-4">Choose the visit you are checking in for on your dashboard.</p>
        <Link to="/" className="text-primary font-bold hover:underline">
          Go to dashboard
        </Link>
      </Card>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-300 pb-24">
      <div>
        <h2 className="text-2xl font-bold text-ink mb-2">Pre-Visit Checklist</h2>
        <p className="text-ink-soft">Please ensure you have these ready for your consultation today.</p>
      </div>

      <div className="space-y-6">

        {aiItems.length > 0 && (
          <Card className="p-5 border-attention/30 bg-attention/5">
            <div className="flex items-center gap-2 mb-4 text-attention-dark">
              <Sparkles size={20} />
              <h3 className="font-bold text-lg leading-tight">Just for you</h3>
            </div>
            <div className="space-y-4">
              {aiItems.map(item => (
                <Checkbox
                  key={item.id}
                  id={item.id}
                  label={item.label}
                  checked={item.is_completed}
                  onChange={() => handleToggle(item)}
                />
              ))}
            </div>
          </Card>
        )}

        <Card className="p-5">
          <h3 className="font-bold text-lg text-ink mb-4 leading-tight">Standard requirements</h3>
          {clinicItems.length === 0 ? (
            <p className="text-sm text-ink-soft">Nothing to prepare for this visit.</p>
          ) : (
            <div className="space-y-4">
              {clinicItems.map(item => (
                <Checkbox
                  key={item.id}
                  id={item.id}
                  label={item.label}
                  checked={item.is_completed}
                  onChange={() => handleToggle(item)}
                />
              ))}
            </div>
          )}
        </Card>
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-raised border-t border-ink-soft/10 p-4 z-40 max-w-3xl mx-auto">
        <Button
          className="w-full"
          onClick={handleSubmit}
          disabled={submitting}
        >
          {submitting ? 'Submitting Check-in...' : 'Submit Check-in'}
        </Button>
      </div>
    </div>
  );
}
