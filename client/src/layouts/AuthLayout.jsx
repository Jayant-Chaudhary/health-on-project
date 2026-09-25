
import { Outlet } from 'react-router-dom';

export default function AuthLayout() {
  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-canvas text-ink">
      {/* Mobile header (only header is green on mobile) */}
      <div className="lg:hidden flex items-center gap-3 px-6 py-4 bg-green-800 text-slate-100 shadow-sm">
        {/* A light tile keeps the teal/blue mark readable on the green header. */}
        <div className="w-9 h-9 bg-slate-100 rounded-lg flex items-center justify-center p-1 shadow-sm">
          <img src="/logo-mark.png" alt="" className="h-full w-full object-contain" />
        </div>
        <span className="text-xl font-bold tracking-tight text-slate-100">MedBrief</span>
      </div>

      {/* Left side: branding/imagery (desktop web view) */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 bg-green-800 p-12 text-slate-100 overflow-hidden relative">
        <div className="relative z-10">
          <div className="mb-12 inline-flex rounded-2xl bg-slate-100 px-6 py-4 shadow-sm">
            <img src="/logo.png" alt="MedBrief" className="h-24 w-auto object-contain" />
          </div>
          <h1 className="text-5xl font-bold leading-tight mb-6 text-slate-100">
            Modern way of consultancy,<br />unified.
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
      <div className="flex flex-col justify-center flex-1 px-6 py-10 sm:px-12 lg:px-24 bg-canvas text-ink">
        <div className="w-full max-w-md mx-auto">
          <Outlet />
        </div>
      </div>
    </div>
  );
}

