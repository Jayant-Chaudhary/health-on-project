import { useState, useEffect } from 'react';
import { Sidebar } from '../../components/layout/Sidebar.jsx';
import { fetchPatients } from '../../services/clinicianService.js';
import { Spinner } from '../../components/common/Spinner.jsx';
import { format } from 'date-fns';

export function ClinicianSchedule() {
  const [collapsed, setCollapsed] = useState(false);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPatients().then(list => {
      // Sort by scheduled date
      const sorted = list.sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt));
      setAppointments(sorted);
      setLoading(false);
    });
  }, []);

  return (
    <div className="flex h-screen overflow-hidden bg-canvas">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((value) => !value)} />
      <main className="flex-1 overflow-y-auto p-8">
        <div className="max-w-4xl mx-auto space-y-6">
          <header className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-pine-900">Schedule</h1>
              <p className="text-pine-600">All upcoming patient appointments.</p>
            </div>
          </header>
          
          <div className="bg-white rounded-xl shadow-sm border border-pine-100 overflow-hidden">
            {loading ? (
              <div className="p-12 flex justify-center text-pine-500">
                <Spinner />
              </div>
            ) : appointments.length === 0 ? (
              <div className="p-12 text-center text-pine-600">
                No appointments scheduled yet.
              </div>
            ) : (
              <div className="divide-y divide-pine-100">
                {appointments.map(app => (
                  <div key={app.appointmentId} className="p-4 flex items-center justify-between hover:bg-pine-50/50 transition-colors">
                    <div>
                      <h3 className="font-semibold text-pine-900">{app.name}</h3>
                      <p className="text-sm text-pine-600">Status: {app.status}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-pine-900">
                        {app.scheduledAt ? format(new Date(app.scheduledAt), 'MMM d, yyyy') : 'No Date'}
                      </p>
                      <p className="text-sm text-pine-600">
                        {app.scheduledAt ? format(new Date(app.scheduledAt), 'h:mm a') : ''}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default ClinicianSchedule;
