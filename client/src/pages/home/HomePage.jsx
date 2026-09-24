import { usePatientContext } from '../../context/PatientContext';
import ActionBanner from '../../components/home/ActionBanner';
import VitalsCard from '../../components/home/VitalsCard';
import { Card } from '../../components/ui/Card';
import { MapPin, Phone } from 'lucide-react';
import { Skeleton } from '../../components/ui/Skeleton';

export default function HomePage() {
  const { patient, appointment, loading } = usePatientContext();

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const doctorName = appointment?.clinician?.full_name || appointment?.doctor?.name || 'Assigned Clinician';
  const clinicName = appointment?.clinic?.name || 'Maternal Care Clinic';

  if (loading) {
    return (
      <div className="p-5 space-y-6">
        <Skeleton className="h-12 w-3/4 rounded-lg" />
        <Skeleton className="h-40 w-full rounded-card" />
        <Skeleton className="h-48 w-full rounded-card" />
      </div>
    );
  }

  return (
    <div className="py-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
      {/* Header */}
      <header className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-ink mb-2">
            {getGreeting()}, {patient?.name ? patient.name.split(' ')[0] : 'there'}
          </h1>
          {patient?.gestationWeeks != null && (
            <div className="inline-flex items-center px-3 py-1 bg-primary-light text-primary-dark text-sm font-bold rounded-full">
              {patient.gestationWeeks} weeks · Trimester {patient.trimester ?? 1}
            </div>
          )}
        </div>
        <div className="w-16 h-16 bg-primary text-white rounded-full flex items-center justify-center font-bold text-2xl shadow-sm">
          {patient?.name ? patient.name.charAt(0) : 'U'}
        </div>
      </header>

      <ActionBanner />
      
      <div className="mt-6">
        {/* Clinic Card */}
        <Card className="mb-6">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-14 h-14 bg-canvas rounded-full flex items-center justify-center border border-ink-soft/20">
            <span className="text-xl">🏥</span>
          </div>
          <div>
            <h3 className="font-bold text-ink">{doctorName}</h3>
            <p className="text-sm text-ink-soft">{clinicName}</p>
          </div>
        </div>
        
        <div className="space-y-3 pt-4 border-t border-ink-soft/10">
          {appointment?.clinic?.mapsUrl && (
            <a href={appointment.clinic.mapsUrl} target="_blank" rel="noreferrer" className="flex items-center gap-3 text-sm text-ink font-medium hover:text-primary transition-colors">
              <MapPin className="text-primary" size={18} />
              <span>Get directions</span>
            </a>
          )}
          {appointment?.clinic?.phone && (
            <a href={`tel:${appointment.clinic.phone}`} className="flex items-center gap-3 text-sm text-ink font-medium hover:text-primary transition-colors">
              <Phone className="text-primary" size={18} />
              <span>Call clinic</span>
            </a>
          )}
        </div>
      </Card>
      </div>
    </div>
  );
}
