import { useCallback, useEffect, useState } from 'react';
import { Sidebar } from '../../components/layout/Sidebar.jsx';
import { Topbar } from '../../components/layout/Topbar.jsx';
import { PatientHeaderCard } from '../../components/clinician/PatientHeaderCard.jsx';
import { PreVisitQuestionnairePanel } from '../../components/clinician/PreVisitQuestionnairePanel.jsx';
import { OcrTriageAlert } from '../../components/clinician/OcrTriageAlert.jsx';
import { MetricsTable } from '../../components/clinician/MetricsTable.jsx';
import { ConsultancyNotes } from '../../components/clinician/ConsultancyNotes.jsx';
import { ActionChecklist } from '../../components/clinician/ActionChecklist.jsx';
import { PrescriptionUpload } from '../../components/clinician/PrescriptionUpload.jsx';
import { Spinner } from '../../components/common/Spinner.jsx';
import { usePatientDashboard } from '../../hooks/usePatientDashboard.js';
import { InvitePatientModal } from '../../components/clinician/InvitePatientModal.jsx';
import { Plus, ArrowLeft, Clock, User, CheckCircle } from 'lucide-react';
import {
  fetchPatients,
  saveConsultancyNotes,
  toggleActionItem,
  addActionItem,
  resolveTriageAlert,
} from '../../services/clinicianService.js';

/**
 * Clinician command centre.
 *
 * Fixed page frame: rail + top bar, then patient context that stays put while
 * the two work columns below it scroll independently — the doctor never loses
 * the patient's identity or red flags while digging through history.
 */
export function ClinicianDashboard() {
  const [collapsed, setCollapsed] = useState(false);
  const [patients, setPatients] = useState([]);
  const [selected, setSelected] = useState(null);
  const [queueError, setQueueError] = useState(null);
  const [queueLoading, setQueueLoading] = useState(true);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);

  const loadPatients = useCallback(() => {
    setQueueLoading(true);
    fetchPatients()
      .then((list) => {
        const todayStr = new Date().toLocaleDateString('en-CA');
        const todaysList = list.filter(p => {
          if (!p.scheduledAt) return false;
          const d = new Date(p.scheduledAt);
          return d.toLocaleDateString('en-CA') === todayStr;
        });
        setPatients(todaysList);
        // We no longer auto-select the first patient here.
        // We want to show the Dashboard cards by default.
      })
      .catch(setQueueError)
      .finally(() => setQueueLoading(false));
  }, []);

  useEffect(() => {
    loadPatients();
  }, [loadPatients]);

  const { data, loading, error, patch } = usePatientDashboard(selected?.id, selected?.appointmentId);
  const appointmentId = data?.appointment?.id;

  const handleSaveNotes = useCallback(
    async (text) => {
      await saveConsultancyNotes(appointmentId, text);
      patch(() => ({ notes: { text, updatedAt: new Date().toISOString() } }));
    },
    [appointmentId, patch]
  );

  const handleToggleItem = useCallback(
    async (item, isCompleted) => {
      // Optimistic — a checkbox that lags feels broken mid-consult.
      patch((current) => ({
        checklist: current.checklist.map((entry) =>
          entry.id === item.id ? { ...entry, isCompleted } : entry
        ),
      }));
      try {
        await toggleActionItem(item.id, isCompleted);
      } catch {
        patch((current) => ({
          checklist: current.checklist.map((entry) =>
            entry.id === item.id ? { ...entry, isCompleted: !isCompleted } : entry
          ),
        }));
      }
    },
    [patch]
  );

  const handleAddItem = useCallback(
    async (label) => {
      const created = await addActionItem(appointmentId, label);
      patch((current) => ({
        checklist: [...current.checklist, { id: created.id, label, isCompleted: false }],
      }));
    },
    [appointmentId, patch]
  );

  const handleResolveAlert = useCallback(
    async (alert, rawValue) => {
      const value = Number(rawValue);
      if (!Number.isFinite(value)) throw new Error('Enter the reading as a number.');

      await resolveTriageAlert(alert.metricId, {
        standardKey: alert.standardKey,
        reviewedValue: value,
      });
      patch((current) => ({
        triageAlerts: current.triageAlerts.filter((entry) => entry.id !== alert.id),
        metrics: current.metrics.map((metric) =>
          metric.standardKey === alert.standardKey
            ? { ...metric, value: String(value), needsReview: false }
            : metric
        ),
      }));
    },
    [patch]
  );

  const renderDashboardCards = () => {
    if (patients.length === 0) {
      return (
        <div className="card flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center">
          <p className="font-display text-head-sm text-ink">No patients scheduled for today</p>
          <p className="max-w-md text-body-md text-ink-2">
            Appointments appear here once the clinic has issued invites or scheduled patients.
          </p>
        </div>
      );
    }

    return (
      <div className="flex-1 overflow-y-auto">
        <h2 className="text-xl font-display font-semibold text-ink mb-6">Today's Appointments</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {patients.map(patient => {
            const isPending = patient.isPending;

            return (
              <div 
                key={patient.appointmentId || patient.id}
                onClick={() => !isPending && setSelected(patient)}
                className={`card p-6 flex flex-col gap-4 border transition-all duration-200 ${
                  isPending 
                    ? 'border-ink-soft/20 bg-canvas-alt opacity-75 cursor-not-allowed' 
                    : 'border-primary/10 hover:border-primary/30 hover:shadow-md cursor-pointer'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary-light text-primary flex items-center justify-center font-bold">
                      {patient.name?.charAt(0) || <User className="w-5 h-5" />}
                    </div>
                    <div>
                      <h3 className="font-semibold text-ink">{patient.name || 'Unknown'}</h3>
                      <p className="text-xs text-ink-soft truncate w-32">{isPending ? 'Invited Patient' : 'Registered Patient'}</p>
                    </div>
                  </div>
                  {isPending ? (
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-attention-light text-attention-dark text-xs font-medium">
                      <Clock className="w-3 h-3" /> Pending
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-success-light text-success-dark text-xs font-medium">
                      <CheckCircle className="w-3 h-3" /> Accepted
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 text-sm text-ink-2">
                  <Clock className="w-4 h-4" />
                  <span>
                    {new Date(patient.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                
                {isPending && (
                  <p className="text-xs text-attention mt-2">
                    Patient has not accepted their invite yet. Report Analysis will be available once they accept.
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="flex h-screen overflow-hidden bg-canvas">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((value) => !value)} />

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar
          patients={patients}
          onSelectPatient={(p) => {
            if (!p.isPending) setSelected(p);
          }}
          notifications={data?.notifications ?? []}
        />

        <main className="flex min-h-0 flex-1 flex-col gap-4 px-6 py-5">
          {queueLoading ? (
            <div className="flex flex-1 items-center justify-center gap-3 text-ink-3">
              <Spinner /> Loading appointments…
            </div>
          ) : queueError ? (
            <div className="card flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center">
              <p className="font-display text-head-sm text-terracotta">Could not reach the clinic API</p>
              <p className="max-w-md text-body-md text-ink-2">{queueError.message}</p>
            </div>
          ) : !selected ? (
            renderDashboardCards()
          ) : loading && !data ? (
            <div className="flex flex-1 items-center justify-center gap-3 text-ink-3">
              <Spinner /> Loading patient record…
            </div>
          ) : error ? (
            <div className="card flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center">
              <p className="font-display text-head-sm text-terracotta">Error loading patient details</p>
              <p className="max-w-md text-body-md text-ink-2">{error.message}</p>
              <button onClick={() => setSelected(null)} className="mt-4 text-primary font-medium">
                Back to Dashboard
              </button>
            </div>
          ) : (
            data && (
              <div className="flex-1 flex flex-col min-h-0">
                <div className="flex items-center gap-4 mb-4">
                  <button 
                    onClick={() => setSelected(null)}
                    className="p-2 hover:bg-canvas-alt rounded-full transition-colors"
                  >
                    <ArrowLeft className="w-5 h-5 text-ink-soft" />
                  </button>
                  <h1 className="text-xl font-display font-semibold text-ink">Report Analysis</h1>
                </div>
                
                <PatientHeaderCard patient={data.patient} />
                <PreVisitQuestionnairePanel questionnaire={data.questionnaire} />

                {/* Two work columns, each with its own scroll context. */}
                <div className="grid min-h-0 flex-1 gap-4 mt-4 lg:grid-cols-[minmax(0,1.55fr)_minmax(340px,1fr)]">
                  <div className="scroll-column min-h-0 space-y-4 pr-1">
                    <OcrTriageAlert alerts={data.triageAlerts} onResolve={handleResolveAlert} />
                    <MetricsTable metrics={data.metrics} patientId={data.patient.id} />
                  </div>

                  <div className="scroll-column min-h-0 space-y-4 pr-1">
                    <ConsultancyNotes notes={data.notes} onSave={handleSaveNotes} />
                    <ActionChecklist
                      items={data.checklist}
                      onToggle={handleToggleItem}
                      onAdd={handleAddItem}
                    />
                    <PrescriptionUpload />
                  </div>
                </div>
              </div>
            )
          )}
        </main>
      </div>

      <button
        onClick={() => setIsInviteModalOpen(true)}
        className="fixed bottom-8 right-8 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-white shadow-lg transition-transform hover:scale-105 hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 z-40"
        aria-label="Invite Patient"
      >
        <Plus className="h-6 w-6" />
      </button>

      <InvitePatientModal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        onInviteSent={() => {
          loadPatients();
        }}
      />
    </div>
  );
}

export default ClinicianDashboard;
