import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { addDays, format, isSameDay, startOfDay } from 'date-fns';
import { Sidebar } from '../../components/layout/Sidebar.jsx';
import { Icon } from '../../components/common/Icon.jsx';
import { Spinner } from '../../components/common/Spinner.jsx';
import { fetchPatients } from '../../services/clinicianService.js';

/** At least two weeks are always shown, so an empty diary still reads as a calendar. */
const MIN_DAYS = 14;

const STATUS_STYLE = {
  invited: { label: 'Invite pending', className: 'border-olive-border bg-olive-surface text-olive' },
  active: { label: 'Scheduled', className: 'border-line bg-subcanvas text-ink-2' },
  checked_in: { label: 'Checked in', className: 'border-sage-border bg-sage-surface text-sage-ink' },
  completed: { label: 'Completed', className: 'border-line bg-subcanvas text-ink-3' },
  cancelled: { label: 'Cancelled', className: 'border-line bg-subcanvas text-ink-3 line-through' },
};

/**
 * Upcoming appointments as a calendar: a scrollable strip of days across the
 * top, each with its count, and the chosen day's appointments below.
 */
export function ClinicianSchedule() {
  const [collapsed, setCollapsed] = useState(false);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedDay, setSelectedDay] = useState(() => startOfDay(new Date()));
  const stripRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchPatients()
      .then(setAppointments)
      .catch(setError)
      .finally(() => setLoading(false));
  }, []);

  // Fixed for the life of the page, so the memos below have a stable input.
  const today = useMemo(() => startOfDay(new Date()), []);

  const upcoming = useMemo(
    () =>
      appointments
        .filter((a) => a.scheduledAt && new Date(a.scheduledAt) >= today)
        .sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt)),
    [appointments, today]
  );

  /** Today through the last booked day (or two weeks, whichever is later). */
  const days = useMemo(() => {
    const last = upcoming.at(-1);
    const span = last ? Math.round((startOfDay(new Date(last.scheduledAt)) - today) / 86_400_000) + 1 : 0;
    return Array.from({ length: Math.max(MIN_DAYS, span) }, (_, i) => addDays(today, i));
  }, [upcoming, today]);

  const countFor = (day) =>
    upcoming.filter((a) => a.status !== 'cancelled' && isSameDay(new Date(a.scheduledAt), day)).length;

  const dayAppointments = upcoming.filter((a) => isSameDay(new Date(a.scheduledAt), selectedDay));

  function scrollStrip(direction) {
    stripRef.current?.scrollBy({ left: direction * 320, behavior: 'smooth' });
  }

  return (
    <div className="flex h-screen overflow-hidden bg-canvas">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((value) => !value)} />

      <main className="flex min-w-0 flex-1 flex-col overflow-hidden px-6 py-5">
        <header className="mb-4 flex items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-head-lg text-ink">Schedule</h1>
            <p className="text-body-md text-ink-2">
              {upcoming.length === 0
                ? 'No upcoming appointments.'
                : `${upcoming.filter((a) => a.status !== 'cancelled').length} upcoming appointments`}
            </p>
          </div>
          <Link
            to="/clinician/appointments/new"
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-cypress px-4 font-display text-label-lg text-surface hover:bg-cypress-deep"
          >
            <Icon name="plus" size={16} /> New visit
          </Link>
        </header>

        {loading ? (
          <div className="flex flex-1 items-center justify-center gap-3 text-ink-3">
            <Spinner /> Loading schedule…
          </div>
        ) : error ? (
          <div className="card p-8 text-center text-body-md text-terracotta">{error.message}</div>
        ) : (
          <>
            {/* Day strip */}
            <div className="card mb-4 flex items-center gap-2 p-2">
              <button
                type="button"
                onClick={() => scrollStrip(-1)}
                aria-label="Earlier days"
                className="shrink-0 rounded-lg p-2 text-ink-3 hover:bg-subcanvas hover:text-ink"
              >
                <Icon name="chevronLeft" size={18} />
              </button>

              <div ref={stripRef} className="flex min-w-0 flex-1 gap-2 overflow-x-auto scroll-smooth pb-1">
                {days.map((day) => {
                  const count = countFor(day);
                  const active = isSameDay(day, selectedDay);
                  return (
                    <button
                      key={day.toISOString()}
                      type="button"
                      onClick={() => setSelectedDay(day)}
                      aria-pressed={active}
                      className={`flex w-[76px] shrink-0 flex-col items-center rounded-xl border px-2 py-2 transition-colors
                                  ${active ? 'border-cypress bg-cypress text-surface' : 'border-line bg-raised text-ink hover:border-line-strong'}`}
                    >
                      <span className={`text-label-sm uppercase ${active ? 'text-surface/80' : 'text-ink-3'}`}>
                        {isSameDay(day, today) ? 'Today' : format(day, 'EEE')}
                      </span>
                      <span className="font-display text-head-sm tabular">{format(day, 'd')}</span>
                      <span className={`text-body-sm ${active ? 'text-surface/80' : 'text-ink-3'}`}>{format(day, 'MMM')}</span>
                      <span
                        className={`mt-1 min-w-[22px] rounded-full px-1.5 text-label-sm tabular
                                    ${count === 0 ? 'opacity-0' : active ? 'bg-surface text-cypress' : 'bg-sage-surface text-sage-ink'}`}
                      >
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={() => scrollStrip(1)}
                aria-label="Later days"
                className="shrink-0 rounded-lg p-2 text-ink-3 hover:bg-subcanvas hover:text-ink"
              >
                <Icon name="chevronRight" size={18} />
              </button>
            </div>

            {/* The chosen day */}
            <section className="card min-h-0 flex-1 overflow-y-auto">
              <h2 className="border-b border-line px-5 py-3 font-display text-head-sm text-ink">
                {format(selectedDay, 'EEEE, MMMM d')}
              </h2>

              {dayAppointments.length === 0 ? (
                <p className="px-5 py-10 text-center text-body-md text-ink-3">No appointments on this day.</p>
              ) : (
                <ul className="divide-y divide-line">
                  {dayAppointments.map((appointment) => {
                    const style = STATUS_STYLE[appointment.status] ?? STATUS_STYLE.active;
                    const openable = !appointment.isPending && appointment.status !== 'cancelled';
                    return (
                      <li key={appointment.appointmentId}>
                        <button
                          type="button"
                          disabled={!openable}
                          onClick={() => navigate(`/clinician?appointment=${appointment.appointmentId}`)}
                          className="flex w-full items-center gap-4 px-5 py-3 text-left transition-colors enabled:hover:bg-subcanvas disabled:cursor-default"
                        >
                          <span className="w-16 shrink-0 font-display text-label-lg tabular text-ink">
                            {format(new Date(appointment.scheduledAt), 'h:mm a')}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-body-md text-ink">{appointment.name}</span>
                            {appointment.email && (
                              <span className="block truncate text-body-sm text-ink-3">{appointment.email}</span>
                            )}
                          </span>
                          <span className={`pill shrink-0 ${style.className}`}>{style.label}</span>
                          {openable && <Icon name="chevronRight" size={16} className="shrink-0 text-ink-3" />}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}

export default ClinicianSchedule;
