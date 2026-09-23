import { createContext, useContext, useState, useEffect } from 'react';
import { patientService } from '../services/patientService';

const PatientContext = createContext(null);

export function PatientProvider({ children }) {
  const [patient, setPatient] = useState(null);
  const [appointment, setAppointment] = useState(null);
  const [vitals, setVitals] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [pat, appt, v] = await Promise.all([
          patientService.getProfile(),
          patientService.getAppointment(),
          patientService.getLatestVitals()
        ]);
        setPatient(pat);
        setAppointment(appt);
        setVitals(v);
      } catch (err) {
        console.error("Failed to load patient data", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const updateStatus = async (newStatus) => {
    const updated = await patientService.updateAppointmentStatus(newStatus);
    setAppointment({ ...updated });
  };

  return (
    <PatientContext.Provider value={{ patient, appointment, vitals, loading, updateStatus }}>
      {children}
    </PatientContext.Provider>
  );
}

export const usePatientContext = () => useContext(PatientContext);
