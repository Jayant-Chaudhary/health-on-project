import { Outlet } from 'react-router-dom';
import TopNavbar from '../components/layout/TopNavbar';

export default function AppShell() {
  return (
    <div className="min-h-screen bg-canvas flex flex-col relative shadow-xl overflow-hidden">
      <TopNavbar />
      <main className="flex-1 overflow-y-auto overflow-x-hidden pb-12 pt-6 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8">
        <Outlet />
      </main>
    </div>
  );
}
