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
import {
  fetchPatients,
  saveConsultancyNotes,
  toggleChecklistItem,
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

  useEffect(() => {
    fetchPatients()
      .then((list) => {
        setPatients(list);
        setSelected((current) => current ?? list[0] ?? null);
      })
      .catch((error) => console.error('Failed to load patient queue:', error));
  }, []);

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
        await toggleChecklistItem(item.id, isCompleted);
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
    async (alert, value) => {
      await resolveTriageAlert(alert.metricId, {
        standardKey: alert.standardKey,
        reviewedValue: value,
      });
      patch((current) => ({
        triageAlerts: current.triageAlerts.filter((entry) => entry.id !== alert.id),
        metrics: current.metrics.map((metric) =>
          metric.standardKey === alert.standardKey
            ? { ...metric, value, status: 'optimal', needsReview: false }
            : metric
        ),
      }));
    },
    [patch]
  );

  return (
    <div className="flex h-screen overflow-hidden bg-canvas">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((value) => !value)} />

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar
          patients={patients}
          onSelectPatient={setSelected}
          notifications={data?.notifications ?? []}
        />

        <main className="flex min-h-0 flex-1 flex-col gap-4 px-6 py-5">
          {loading && !data ? (
            <div className="flex flex-1 items-center justify-center gap-3 text-ink-3">
              <Spinner /> Loading patient record…
            </div>
          ) : error ? (
            <div className="card flex flex-1 items-center justify-center p-8 text-center text-terracotta">
              {error.message}
            </div>
          ) : (
            data && (
              <>
                <PatientHeaderCard patient={data.patient} />
                <PreVisitQuestionnairePanel questionnaire={data.questionnaire} />

                {/* Two work columns, each with its own scroll context. */}
                <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[minmax(0,1.55fr)_minmax(340px,1fr)]">
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
              </>
            )
          )}
        </main>
      </div>
    </div>
  );
}

export default ClinicianDashboard;
