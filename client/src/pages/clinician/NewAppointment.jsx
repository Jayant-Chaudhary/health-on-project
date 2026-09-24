import { useState } from 'react';
import { CalendarPlus, Copy, Check } from 'lucide-react';
import { createAppointment } from '../../services/clinicianService';
import { useToast } from '../../context/ToastContext';
import { Sidebar } from '../../components/layout/Sidebar.jsx';
import { SectionCard } from '../../components/common/SectionCard.jsx';
import { Button } from '../../components/common/Button.jsx';

/**
 * Schedule a visit and invite the patient to it.
 *
 * The invite link is shown after creating the appointment because SMTP is
 * best-effort: if the email does not go out, the clinic still needs a link it
 * can hand over.
 */
export default function NewAppointment() {
  const [collapsed, setCollapsed] = useState(false);
  const [form, setForm] = useState({ patientFullName: '', patientEmail: '', scheduledAt: '' });
  const [result, setResult] = useState(null);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const { showToast } = useToast();

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setResult(null);

    try {
      const created = await createAppointment({
        patientFullName: form.patientFullName,
        patientEmail: form.patientEmail,
        scheduledAt: new Date(form.scheduledAt).toISOString(),
      });

      setResult(created);
      setForm({ patientFullName: '', patientEmail: '', scheduledAt: '' });
      showToast(
        created.isReturningPatient
          ? 'Appointment added to the existing patient record.'
          : 'Appointment created and invite sent.'
      );
    } catch (err) {
      showToast(err.message || 'Could not create the appointment.', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function copyLink() {
    await navigator.clipboard.writeText(result.inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex h-screen overflow-hidden bg-canvas">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((v) => !v)} />

      <main className="flex-1 overflow-y-auto px-8 py-6">
        <div className="mx-auto max-w-2xl space-y-4">
          <form onSubmit={handleSubmit}>
            <SectionCard
              icon="calendar"
              title="New appointment"
              subtitle="Schedules the visit and invites the patient to their portal"
              bodyClassName="p-5"
            >
              <div className="space-y-4">
                <div>
                  <label htmlFor="patient-name" className="mb-1.5 block text-label-md text-ink-2">
                    Patient name
                  </label>
                  <input
                    id="patient-name"
                    value={form.patientFullName}
                    onChange={set('patientFullName')}
                    className="field h-10"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="patient-email" className="mb-1.5 block text-label-md text-ink-2">
                    Patient email
                  </label>
                  <input
                    id="patient-email"
                    type="email"
                    value={form.patientEmail}
                    onChange={set('patientEmail')}
                    className="field h-10"
                    required
                  />
                  <p className="mt-1 text-body-sm text-ink-3">
                    If this patient already has an account, the visit is added to it — their existing
                    password keeps working.
                  </p>
                </div>

                <div>
                  <label htmlFor="scheduled-at" className="mb-1.5 block text-label-md text-ink-2">
                    Date and time
                  </label>
                  <input
                    id="scheduled-at"
                    type="datetime-local"
                    value={form.scheduledAt}
                    onChange={set('scheduledAt')}
                    className="field h-10"
                    required
                  />
                </div>

                <Button type="submit" disabled={saving} className="w-full">
                  <CalendarPlus size={16} />
                  {saving ? 'Creating…' : 'Create and invite'}
                </Button>
              </div>
            </SectionCard>
          </form>

          {result?.inviteLink && (
            <SectionCard icon="check" title="Invite link" bodyClassName="p-5">
              <p className="mb-3 text-body-md text-ink-2">
                Emailed to the patient. Copy it here if you need to send it another way.
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 truncate rounded-xl border border-line bg-subcanvas px-3 py-2 text-body-sm text-ink">
                  {result.inviteLink}
                </code>
                <Button type="button" variant="secondary" onClick={copyLink}>
                  {copied ? <Check size={16} /> : <Copy size={16} />}
                  {copied ? 'Copied' : 'Copy'}
                </Button>
              </div>
            </SectionCard>
          )}
        </div>
      </main>
    </div>
  );
}
