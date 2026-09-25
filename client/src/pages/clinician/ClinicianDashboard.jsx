import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
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
import { Plus, ArrowLeft, Clock, User, CheckCircle } from 'lucide-react';
import {
  fetchPatients,
  saveConsultancyNotes,
  addActionItem,
  removeActionItem,
  addConsultationItem,
  removeConsultationItem,
  uploadPrescription,
  resolveTriageAlert,
} from '../../services/clinicianService.js';

function isToday(value) {
  return value && new Date(value).toDateString() === new Date().toDateString();
}

/**
 * Clinician command centre.
 *
 * Without a visit selected it shows today's appointments. The open visit
 * lives in the URL (`?appointment=<id>`), so the schedule and patient list can
 * link straight into it and the browser's back button returns to the cards.
 */
export function ClinicianDashboard() {
  const [collapsed, setCollapsed] = useState(false);
  const [appointments, setAppointments] = useState([]);
  const [queueError, setQueueError] = useState(null);
  const [queueLoading, setQueueLoading] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();

  const selectedAppointmentId = searchParams.get('appointment');

  const loadAppointments = useCallback(() => {
    setQueueLoading(true);
    fetchPatients()
      .then(setAppointments)
      .catch(setQueueError)
      .finally(() => setQueueLoading(false));
  }, []);

  useEffect(() => {
    loadAppointments();
  }, [loadAppointments]);

  const todays = useMemo(
    () =>
      appointments
        .filter((a) => isToday(a.scheduledAt) && a.status !== 'cancelled')
        .sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt)),
    [appointments]
  );

  const selected = appointments.find((a) => a.appointmentId === selectedAppointmentId && !a.isPending) ?? null;

  const open = (appointment) => {
    if (!appointment.isPending) setSearchParams({ appointment: appointment.appointmentId });
  };
  const close = () => setSearchParams({});

  const { data, loading, error, patch } = usePatientDashboard(selected?.id, selected?.appointmentId);
  const appointmentId = data?.appointment?.id;

  const handleSaveNotes = useCallback(
    async (text) => {
      await saveConsultancyNotes(appointmentId, text);
      patch(() => ({ notes: { text, updatedAt: new Date().toISOString() } }));
    },
    [appointmentId, patch]
  );

  const handleCheckConsultation = useCallback(
    async (label) => {
      const created = await addConsultationItem(appointmentId, label);
      patch((current) => ({
        consultationItems: [
          ...current.consultationItems.filter((item) => item.label !== label),
          { id: created.id, label },
        ],
      }));
    },
    [appointmentId, patch]
  );

  const handleUncheckConsultation = useCallback(
    async (item) => {
      await removeConsultationItem(item.id);
      patch((current) => ({
        consultationItems: current.consultationItems.filter((entry) => entry.id !== item.id),
      }));
    },
    [patch]
  );

  const handleAddAction = useCallback(
    async (label) => {
      const created = await addActionItem(appointmentId, label);
      patch((current) => ({
        actionItems: [...current.actionItems, { id: created.id, label, doneByPatient: false }],
      }));
    },
    [appointmentId, patch]
  );

  const handleRemoveAction = useCallback(
    async (item) => {
      await removeActionItem(item.id);
      patch((current) => ({
        actionItems: current.actionItems.filter((entry) => entry.id !== item.id),
      }));
    },
    [patch]
  );

  const handleUploadPrescription = useCallback(
    async (file, instructions) => {
      const saved = await uploadPrescription(appointmentId, file, instructions);
      patch((current) => ({ prescriptions: [...current.prescriptions, saved] }));
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

  const renderTodaysCards = () => {
    if (todays.length === 0) {
      return (
        <div className="card flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center">
          <p className="font-display text-head-sm text-ink">No patients scheduled for today</p>
          <p className="max-w-md text-body-md text-ink-2">
            Upcoming visits are on your <Link to="/clinician/schedule" className="text-cypress hover:underline">schedule</Link>.
          </p>
        </div>
      );
    }

    return (
      <div className="flex-1 overflow-y-auto">
        <h2 className="text-xl font-display font-semibold text-ink mb-6">Today's Appointments</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {todays.map((appointment) => {
            const isPending = appointment.isPending;

            return (
              <div
                key={appointment.appointmentId}
                onClick={() => open(appointment)}
                className={`card p-6 flex flex-col gap-4 border transition-all duration-200 ${
                  isPending
                    ? 'border-ink-soft/20 bg-canvas-alt opacity-75 cursor-not-allowed'
                    : 'border-primary/10 hover:border-primary/30 hover:shadow-md cursor-pointer'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary-light text-primary flex items-center justify-center font-bold">
                      {appointment.name?.charAt(0) || <User className="w-5 h-5" />}
                    </div>
                    <div>
                      <h3 className="font-semibold text-ink">{appointment.name}</h3>
                      <p className="text-xs text-ink-soft truncate w-32">
                        {isPending ? 'Invited patient' : 'Registered patient'}
                      </p>
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
                    {new Date(appointment.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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

  const renderBody = () => {
    if (queueLoading) {
      return (
        <div className="flex flex-1 items-center justify-center gap-3 text-ink-3">
          <Spinner /> Loading appointments…
        </div>
      );
    }
    if (queueError) {
      return (
        <div className="card flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center">
          <p className="font-display text-head-sm text-terracotta">Could not reach the clinic API</p>
          <p className="max-w-md text-body-md text-ink-2">{queueError.message}</p>
        </div>
      );
    }
    if (selectedAppointmentId && !selected) {
      return (
        <div className="card flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center">
          <p className="font-display text-head-sm text-ink">This visit can't be opened</p>
          <p className="max-w-md text-body-md text-ink-2">
            It isn't one of your appointments, or the patient hasn't accepted their invite yet.
          </p>
          <button onClick={close} className="mt-4 text-primary font-medium">
            Back to Dashboard
          </button>
        </div>
      );
    }
    if (!selected) return renderTodaysCards();
    if (loading && !data) {
      return (
        <div className="flex flex-1 items-center justify-center gap-3 text-ink-3">
          <Spinner /> Loading patient record…
        </div>
      );
    }
    if (error) {
      return (
        <div className="card flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center">
          <p className="font-display text-head-sm text-terracotta">Error loading patient details</p>
          <p className="max-w-md text-body-md text-ink-2">{error.message}</p>
          <button onClick={close} className="mt-4 text-primary font-medium">
            Back to Dashboard
          </button>
        </div>
      );
    }
    if (!data) return null;

    return (
      <div className="flex-1 flex flex-col min-h-0">
        <div className="flex items-center gap-4 mb-4">
          <button onClick={close} aria-label="Back to dashboard" className="p-2 hover:bg-canvas-alt rounded-full transition-colors">
            <ArrowLeft className="w-5 h-5 text-ink-soft" />
          </button>
          <h1 className="text-xl font-display font-semibold text-ink">Report Analysis</h1>
        </div>

        <PatientHeaderCard patient={data.patient} />
        {data.questionnaire.answers.length > 0 && <PreVisitQuestionnairePanel questionnaire={data.questionnaire} />}

        {/* Two work columns, each with its own scroll context. */}
        <div className="grid min-h-0 flex-1 gap-4 mt-4 lg:grid-cols-[minmax(0,1.55fr)_minmax(340px,1fr)]">
          <div className="scroll-column min-h-0 space-y-4 pr-1">
            <OcrTriageAlert alerts={data.triageAlerts} onResolve={handleResolveAlert} />
            <MetricsTable metrics={data.metrics} patientId={data.patient.id} />
          </div>

          <div className="scroll-column min-h-0 space-y-4 pr-1">
            <ConsultancyNotes
              notes={data.notes}
              onSave={handleSaveNotes}
              templates={data.consultationTemplates}
              checkedItems={data.consultationItems}
              onCheckItem={handleCheckConsultation}
              onUncheckItem={handleUncheckConsultation}
            />
            <ActionChecklist
              templates={data.actionTemplates}
              items={data.actionItems}
              onAdd={handleAddAction}
              onRemove={handleRemoveAction}
            />
            <PrescriptionUpload prescriptions={data.prescriptions} onUpload={handleUploadPrescription} />
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex h-screen overflow-hidden bg-canvas">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((value) => !value)} />

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar patients={todays} onSelectPatient={open} notifications={data?.notifications ?? []} />

        <main className="flex min-h-0 flex-1 flex-col gap-4 px-6 py-5">{renderBody()}</main>
      </div>

      <Link
        to="/clinician/appointments/new"
        className="fixed bottom-8 right-8 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-white shadow-lg transition-transform hover:scale-105 hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 z-40"
        aria-label="New visit"
        title="New visit"
      >
        <Plus className="h-6 w-6" />
      </Link>
    </div>
  );
}

export default ClinicianDashboard;
