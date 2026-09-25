import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Sidebar } from '../../components/layout/Sidebar.jsx';
import { EmptyState } from '../../components/common/EmptyState.jsx';

/** Placeholder for the rail's not-yet-built destinations. */
export function ComingSoon({ title, icon = 'calendar' }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-canvas">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((value) => !value)} />
      <main className="flex flex-1 items-center justify-center p-8">
        <div className="card px-6 py-4">
          <EmptyState icon={icon} title={`${title} is not part of this milestone`} description="The dashboard is the focus for now." />
          <p className="pb-4 text-center">
            <Link to="/clinician" className="text-label-md text-cypress hover:underline">
              Back to dashboard
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}

export default ComingSoon;
