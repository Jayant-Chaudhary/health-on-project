import { usePatientContext } from '../../context/PatientContext';
import VitalsCard from '../../components/home/VitalsCard';
import { Card } from '../../components/ui/Card';
import { Skeleton } from '../../components/ui/Skeleton';
import { User, Phone, MapPin } from 'lucide-react';

export default function ProfilePage() {
  const { patient, loading } = usePatientContext();

  if (loading) {
    return (
      <div className="py-8 space-y-6">
        <Skeleton className="h-40 w-full rounded-card" />
        <Skeleton className="h-64 w-full rounded-card" />
      </div>
    );
  }

  return (
    <div className="py-8 animate-in fade-in duration-300 max-w-4xl mx-auto">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-ink mb-2">My Profile</h1>
        <p className="text-ink-soft">Manage your personal details and track your vitals.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Left Column: Personal Details */}
        <div className="space-y-6">
          <Card className="p-6">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 bg-primary text-white rounded-full flex items-center justify-center font-bold text-2xl shadow-sm">
                {patient?.name.charAt(0)}
              </div>
              <div>
                <h3 className="font-bold text-xl text-ink">{patient?.name}</h3>
                <p className="text-sm text-ink-soft">Patient ID: #MC-82910</p>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <User className="text-ink-soft w-5 h-5" />
                <div>
                  <p className="text-xs text-ink-soft font-bold uppercase tracking-wider">Pregnancy Status</p>
                  <p className="text-sm font-medium text-ink">{patient?.gestationWeeks} weeks (Trimester {patient?.trimester})</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="text-ink-soft w-5 h-5" />
                <div>
                  <p className="text-xs text-ink-soft font-bold uppercase tracking-wider">Contact</p>
                  <p className="text-sm font-medium text-ink">+91 98765 43210</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <MapPin className="text-ink-soft w-5 h-5" />
                <div>
                  <p className="text-xs text-ink-soft font-bold uppercase tracking-wider">Address</p>
                  <p className="text-sm font-medium text-ink">123 Sunrise Avenue, Block 4</p>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Right Column: Vitals Updater (moved from Home) */}
        <div>
          <VitalsCard />
        </div>
      </div>
    </div>
  );
}
