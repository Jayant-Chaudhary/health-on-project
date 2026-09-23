
import { Outlet } from 'react-router-dom';

export default function AuthLayout() {
  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-slate-50 text-slate-900">
      {/* Mobile header (only header is green on mobile) */}
      <div className="lg:hidden flex items-center gap-3 px-6 py-4 bg-green-800 text-slate-100 shadow-sm">
        <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center text-green-800 font-bold text-base shadow-sm">
          H
        </div>
        <span className="text-xl font-bold tracking-tight text-slate-100">HealthOn</span>
      </div>

      {/* Left side: branding/imagery (desktop web view) */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 bg-green-800 p-12 text-slate-100 overflow-hidden relative">
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-12">
            <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center text-green-800 font-bold text-xl shadow-sm">
              H
            </div>
            <span className="text-2xl font-bold tracking-tight text-slate-100">HealthOn</span>
          </div>
          <h1 className="text-5xl font-bold leading-tight mb-6 text-slate-100">
            Modern way of Counsltancy,<br />unified.
          </h1>
          <p className="text-slate-200 text-lg max-w-md">
            Assist the doctor and patient by pre-visit lists,Unified dashboard 
          </p>
        </div>
        
        {/* Decorative background elements */}
        <div className="absolute -bottom-32 -right-32 w-[500px] h-[500px] rounded-full bg-green-700/40 blur-3xl" />
        <div className="absolute top-1/4 -left-32 w-[400px] h-[400px] rounded-full bg-green-900/50 blur-3xl" />
      </div>

      {/* Right side: form area (kept like web view for both mobile and desktop) */}
      <div className="flex flex-col justify-center flex-1 px-6 py-10 sm:px-12 lg:px-24 bg-slate-50 text-slate-900">
        <div className="w-full max-w-md mx-auto">
          <Outlet />
        </div>
      </div>
    </div>
  );
}

