import { mockPatient } from './mockPatient';
import { addDays, set } from 'date-fns';

const today = new Date();
const appointmentDate = set(addDays(today, 3), { hours: 10, minutes: 30, seconds: 0, milliseconds: 0 });

export const mockAppointment = {
  id: "appt_1",
  status: "SCHEDULED", // 'INVITED'|'SCHEDULED'|'CHECKIN_IN_PROGRESS'|'CHECKIN_COMPLETE'|'VISIT_COMPLETED'
  startsAt: appointmentDate.toISOString(),
  doctor: {
    name: "Dr. Anita Rao",
    photoUrl: null
  },
  clinic: {
    name: "Sunrise Maternity Clinic",
    address: "123 Sunrise Way, City Center",
    phone: "+1 800 123 4567",
    mapsUrl: "https://maps.google.com/?q=123+Sunrise+Way",
    logoUrl: null
  }
};
