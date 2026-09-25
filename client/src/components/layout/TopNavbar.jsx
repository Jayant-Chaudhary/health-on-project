import { NavLink, useNavigate } from 'react-router-dom';
import { Home, FileText, ClipboardList, User } from 'lucide-react';
import { cn } from '../../utils/cn';
import { usePatientContext } from '../../context/PatientContext';
import { useAuth } from '../../hooks/useAuth';

export default function TopNavbar() {
  const { activeAppointment, profile } = usePatientContext();
  const { logout } = useAuth();
  const navigate = useNavigate();
  
  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };
  
  // Nudge the patient while a selected visit still needs checking in.
  const showBadge = activeAppointment?.status === 'invited' || activeAppointment?.status === 'active';

  const navItems = [
    { to: "/", icon: Home, label: "Dashboard", badge: showBadge },
    { to: "/reports", icon: FileText, label: "Lab Reports" },
    { 
      to: "/summary", 
      icon: ClipboardList, 
      label: "Visit Summary"
    }
  ];

  return (
    <nav className="w-full bg-white border-b border-ink-soft/10 shadow-sm sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          
          {/* Logo / Brand */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white font-bold">
              M
            </div>
            <span className="font-bold text-xl text-ink hidden sm:block">MedBrief</span>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex space-x-8">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) => cn(
                    "relative flex items-center gap-2 h-16 transition-colors duration-200 border-b-2",
                    isActive ? "border-primary text-primary font-bold" : "border-transparent text-ink-soft hover:text-ink hover:border-ink/20 font-medium"
                  )}
                >
                  <Icon size={18} strokeWidth={2.5} />
                  <span>{item.label}</span>
                  {item.badge && (
                    <span className="absolute top-4 -right-3 flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-attention opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-attention"></span>
                    </span>
                  )}
                </NavLink>
              );
            })}
          </div>

          {/* User Profile */}
          <div className="flex items-center gap-3 relative group">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-bold text-ink leading-tight">{profile?.fullName}</p>
              <p className="text-xs text-ink-soft">Patient Portal</p>
            </div>
            <div className="w-10 h-10 bg-canvas rounded-full border border-ink-soft/20 flex items-center justify-center text-primary cursor-pointer hover:bg-primary-light transition-colors peer">
              <User size={20} />
            </div>
            
            {/* Dropdown */}
            <div className="absolute right-0 top-12 mt-2 w-48 bg-white rounded-card shadow-card border border-ink-soft/10 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
              <div className="py-2">
                <NavLink to="/profile" className="block px-4 py-2 text-sm text-ink font-medium hover:bg-canvas transition-colors">
                  Personal Details
                </NavLink>
                <div className="border-t border-ink-soft/10 my-1"></div>
                <button 
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-2 text-sm text-attention font-medium hover:bg-attention-light transition-colors"
                >
                  Log out
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Navigation (Scrollable row for smaller screens if needed) */}
      <div className="md:hidden border-t border-ink-soft/5 overflow-x-auto no-scrollbar">
        <div className="flex px-4 py-2 space-x-6">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => cn(
                  "relative flex items-center gap-2 py-2 whitespace-nowrap transition-colors duration-200",
                  isActive ? "text-primary font-bold" : "text-ink-soft hover:text-ink font-medium"
                )}
              >
                <Icon size={16} strokeWidth={2.5} />
                <span className="text-sm">{item.label}</span>
                {item.badge && (
                  <span className="relative flex h-2 w-2 ml-1">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-attention opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-attention"></span>
                  </span>
                )}
              </NavLink>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
