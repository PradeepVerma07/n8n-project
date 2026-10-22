import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import {
  LayoutDashboard,
  Calendar,
  Image as ImageIcon,
  FileSpreadsheet,
  RefreshCw,
  BarChart3,
  Settings,
  Send,
  Workflow,
  Users,
  LogOut,
  ShieldCheck,
  Clock,
  X,
} from 'lucide-react';

const NAV_ITEMS = [
  { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { name: 'Schedule a Post', path: '/composer', icon: Calendar, badge: 'Auto' },
  { name: 'Content Calendar', path: '/calendar', icon: Clock },
  { name: 'Media Library', path: '/media', icon: ImageIcon },
  { name: 'Bulk Upload', path: '/bulk-import', icon: FileSpreadsheet },
  { name: 'n8n Workflows', path: '/workflows', icon: Workflow },
  { name: 'Google Sheets Sync', path: '/sheets-sync', icon: RefreshCw },
  { name: 'Team & Roles', path: '/team', icon: Users, badge: 'RBAC' },
  { name: 'Reports & Analytics', path: '/reports', icon: BarChart3 },
  { name: 'Settings', path: '/settings', icon: Settings },
];

export default function Sidebar({ mobileOpen = false, setMobileOpen = () => {} }) {
  const { user, activeOrg, logout } = useAuth();
  const navigate = useNavigate();

  const userRole = user?.memberships?.[0]?.role || activeOrg?.role || 'AGENCY_ADMIN';
  const roleDisplay = userRole.replace('_', ' ');

  const handleLogout = async () => {
    setMobileOpen(false);
    await logout();
    navigate('/login');
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-40 lg:hidden transition-opacity"
        />
      )}

      {/* Sidebar Drawer */}
      <aside
        className={`fixed lg:sticky top-0 left-0 h-screen w-64 bg-slate-900 text-slate-300 flex flex-col shrink-0 border-r border-slate-800 z-50 select-none transition-transform duration-300 ease-in-out ${
          mobileOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 flex items-center justify-between px-5 border-b border-slate-800 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/30">
              <Send className="w-4 h-4 -rotate-12 translate-x-0.5" />
            </div>
            <div>
              <span className="font-black text-base text-white tracking-tight">PostPilot</span>
              <span className="ml-1.5 px-1.5 py-0.5 text-[9px] uppercase font-bold tracking-wider bg-indigo-500/20 text-indigo-400 rounded">
                SaaS
              </span>
            </div>
          </div>

          {/* Close button on mobile */}
          <button
            onClick={() => setMobileOpen(false)}
            className="lg:hidden p-1.5 text-slate-400 hover:text-white rounded-lg transition"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-3 py-3.5 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  `flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/20 font-bold'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
                  }`
                }
              >
                <div className="flex items-center space-x-2.5 min-w-0">
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="truncate">{item.name}</span>
                </div>
                {item.badge && (
                  <span className="px-1.5 py-0.5 rounded text-[8px] font-black tracking-wider uppercase bg-indigo-500/30 text-indigo-200">
                    {item.badge}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* User Role & Profile Footer */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/60 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-indigo-500 to-indigo-700 text-white font-black flex items-center justify-center text-xs shrink-0 shadow-xs">
                {(user?.firstName?.[0] || 'U').toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-white truncate leading-tight">
                  {user ? `${user.firstName} ${user.lastName}` : 'Administrator'}
                </div>
                <div className="flex items-center space-x-1 text-[9px] text-indigo-400 font-semibold tracking-wide uppercase">
                  <ShieldCheck className="w-2.5 h-2.5 text-indigo-400 shrink-0" />
                  <span className="truncate">{roleDisplay}</span>
                </div>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg transition shrink-0"
              title="Log out of PostPilot"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="mt-2 pt-1.5 border-t border-slate-800/60 flex items-center justify-between text-[9px] text-slate-500">
            <span>Enterprise v1.0</span>
            <span className="text-emerald-500 flex items-center space-x-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Connected</span>
            </span>
          </div>
        </div>
      </aside>
    </>
  );
}
