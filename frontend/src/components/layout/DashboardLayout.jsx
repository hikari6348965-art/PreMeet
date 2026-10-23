import { NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import {
  LayoutDashboard, CalendarClock, Users, Plug, Settings as SettingsIcon,
  ShieldCheck, LogOut, FileText, Menu, X, CreditCard,
} from "lucide-react";
import { useState } from "react";
import { Logo } from "../Logo";

const nav = [
  { to: "/app", icon: LayoutDashboard, label: "Dashboard", end: true, testid: "nav-dashboard" },
  { to: "/app/meetings", icon: CalendarClock, label: "Meetings", testid: "nav-meetings" },
  { to: "/app/clients", icon: Users, label: "Client Memory", testid: "nav-clients" },
  { to: "/app/integrations", icon: Plug, label: "Integrations", testid: "nav-integrations" },
  { to: "/app/billing", icon: CreditCard, label: "Billing", testid: "nav-billing" },
  { to: "/app/settings", icon: SettingsIcon, label: "Settings", testid: "nav-settings" },
];

export default function DashboardLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);

  const handleLogout = async () => { await logout(); navigate("/login"); };

  const navContent = (
    <>
      <div className="flex items-center gap-2 px-5 py-5 border-b border-white/10">
        <Logo tone="white" className="h-7" />
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1">
        {nav.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            data-testid={item.testid}
            onClick={() => setOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                isActive ? "bg-white text-ink shadow-none" : "text-white/60 hover:bg-white/10 hover:text-white"
              }`
            }
          >
            <item.icon className="h-[18px] w-[18px]" />
            {item.label}
          </NavLink>
        ))}
        {user?.role === "admin" && (
          <NavLink
            to="/app/admin"
            data-testid="nav-admin"
            onClick={() => setOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                isActive ? "bg-white text-ink shadow-none" : "text-white/60 hover:bg-white/10 hover:text-white"
              }`
            }
          >
            <ShieldCheck className="h-[18px] w-[18px]" />
            Admin
          </NavLink>
        )}
      </nav>
      <div className="px-3 py-4 border-t border-white/10">
        <div className="flex items-center gap-3 px-2 py-2">
          <div className="h-9 w-9 rounded-full bg-signal flex items-center justify-center text-ink font-bold text-sm">
            {(user?.name || "U").charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate text-white" data-testid="sidebar-user-name">{user?.name}</p>
            <p className="text-xs text-white/50 truncate">{user?.email}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          data-testid="logout-button"
          className="mt-2 w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-white/60 hover:bg-white/10 hover:text-white transition-colors"
        >
          <LogOut className="h-[18px] w-[18px]" /> Sign out
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen flex bg-background">
      <aside className="hidden lg:flex w-64 flex-col bg-ink fixed inset-y-0 z-30">
        {navContent}
      </aside>

      {open && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-black/30" onClick={() => setOpen(false)} />
          <aside className="relative w-64 flex flex-col bg-ink">{navContent}</aside>
        </div>
      )}

      <div className="flex-1 lg:ml-64 flex flex-col min-w-0">
        <header className="lg:hidden sticky top-0 z-20 flex items-center justify-between px-4 h-14 border-b border-border bg-card/80 backdrop-blur">
          <div className="flex items-center gap-2">
            <Logo tone="ink" className="h-6" testid="mobile-header-logo" />
          </div>
          <button onClick={() => setOpen(!open)} data-testid="mobile-menu-toggle" className="p-2">
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </header>
        <main className="flex-1 p-5 sm:p-8 max-w-7xl w-full mx-auto">
          <div key={location.pathname} className="bc-fade"><Outlet /></div>
        </main>
      </div>
    </div>
  );
}
