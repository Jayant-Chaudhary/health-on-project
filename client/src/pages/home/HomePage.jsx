import { Link } from 'react-router-dom';
import { usePatientContext } from '../../context/PatientContext';
import ActionBanner from '../../components/home/ActionBanner';
import VitalsCard from '../../components/home/VitalsCard';
import AppointmentCard from '../../components/home/AppointmentCard';
import { Card } from '../../components/ui/Card';
import { Skeleton } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import { CalendarPlus } from 'lucide-react';

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

function gestationLabel(days) {
  if (days == null) return null;
  const weeks = Math.floor(days / 7);
  const trimester = days < 98 ? 1 : days < 189 ? 2 : 3;
  return `${weeks} weeks · Trimester ${trimester}`;
}

export default function HomePage() {
  const { profile, appointments, activeAppointment, selectAppointment, loading, error } =
    usePatientContext();

  if (loading) {
    return (
      <div className="p-5 space-y-6">
        <Skeleton className="h-12 w-3/4 rounded-lg" />
        <Skeleton className="h-40 w-full rounded-card" />
        <Skeleton className="h-48 w-full rounded-card" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-8">
        <Card className="p-8 text-center">
          <h2 className="font-bold text-lg text-ink mb-2">Could not load your details</h2>
          <p className="text-ink-soft">{error.message}</p>
        </Card>
      </div>
    );
  }

  const firstName = profile?.fullName?.split(' ')[0] ?? 'there';
  const gestation = gestationLabel(profile?.gestationalDays);

  return (
    <div className="py-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <header className="mb-8 flex justify-between items-center gap-4">
        <div className="min-w-0">
          <h1 className="text-3xl font-bold text-ink mb-2">
            {greeting()}, {firstName}
          </h1>
          {gestation ? (
            <div className="inline-flex items-center px-3 py-1 bg-primary-light text-primary-dark text-sm font-bold rounded-full">
              {gestation}
            </div>
          ) : (
            <Link to="/profile" className="text-sm font-medium text-primary hover:underline">
              Add your due date to track your pregnancy →
            </Link>
          )}
        </div>
        <div className="w-16 h-16 shrink-0 bg-primary text-white rounded-full flex items-center justify-center font-bold text-2xl shadow-sm">
          {firstName.charAt(0).toUpperCase()}
        </div>
      </header>

      <ActionBanner />

      <section className="mt-8">
        <h2 className="text-lg font-bold text-ink mb-1">Upcoming appointments</h2>
        <p className="text-sm text-ink-soft mb-4">
          Select one to check in for it, or to choose which reports it can see.
        </p>

        {appointments.upcoming.length === 0 ? (
          <EmptyState
            icon={<CalendarPlus size={22} />}
            title="No upcoming appointments"
            description="When your clinic schedules a visit, it will appear here."
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {appointments.upcoming.map((appointment) => (
              <AppointmentCard
                key={appointment.id}
                appointment={appointment}
                isSelected={appointment.id === activeAppointment?.id}
                onSelect={selectAppointment}
              />
            ))}
          </div>
        )}
      </section>

      {appointments.past.length > 0 && (
        <section className="mt-8">
          <h2 className="text-lg font-bold text-ink mb-4">Past visits</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {appointments.past.map((appointment) => (
              <AppointmentCard
                key={appointment.id}
                appointment={appointment}
                isSelected={appointment.id === activeAppointment?.id}
                onSelect={selectAppointment}
              />
            ))}
          </div>
        </section>
      )}

      <section className="mt-8">
        <VitalsCard />
      </section>
    </div>
  );
}
