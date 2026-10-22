import React, { useEffect, useRef } from 'react';
import { NavLink } from 'react-router-dom';
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
  Clock,
  X,
  PlusCircle,
  FolderOpen,
} from 'lucide-react';

const NAVIGATION_GROUPS = [
  {
    groupTitle: 'Overview',
    items: [
      { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, minRoles: ['CLIENT_VIEWER', 'CONTENT_CREATOR', 'BRAND_MANAGER', 'AGENCY_ADMIN', 'SUPER_ADMIN'] },
    ],
  },
  {
    groupTitle: 'Create and Plan',
    items: [
      { name: 'Post Composer', path: '/composer', icon: PlusCircle, minRoles: ['CONTENT_CREATOR', 'BRAND_MANAGER', 'AGENCY_ADMIN', 'SUPER_ADMIN'] },
      { name: 'Content Calendar', path: '/calendar', icon: Clock, minRoles: ['CLIENT_VIEWER', 'CONTENT_CREATOR', 'BRAND_MANAGER', 'AGENCY_ADMIN', 'SUPER_ADMIN'] },
    ],
  },
  {
    groupTitle: 'Assets',
    items: [
      { name: 'Media Library', path: '/media', icon: ImageIcon, minRoles: ['CONTENT_CREATOR', 'BRAND_MANAGER', 'AGENCY_ADMIN', 'SUPER_ADMIN'] },
    ],
  },
  {
    groupTitle: 'Automation',
    items: [
      { name: 'n8n Workflows', path: '/workflows', icon: Workflow, minRoles: ['AGENCY_ADMIN', 'SUPER_ADMIN'] },
      { name: 'Google Sheets Sync', path: '/sheets-sync', icon: RefreshCw, minRoles: ['BRAND_MANAGER', 'AGENCY_ADMIN', 'SUPER_ADMIN'] },
      { name: 'Bulk Import', path: '/bulk-import', icon: FileSpreadsheet, minRoles: ['BRAND_MANAGER', 'AGENCY_ADMIN', 'SUPER_ADMIN'] },
    ],
  },
  {
    groupTitle: 'Analytics',
    items: [
      { name: 'Reports & Analytics', path: '/reports', icon: BarChart3, minRoles: ['CLIENT_VIEWER', 'CONTENT_CREATOR', 'BRAND_MANAGER', 'AGENCY_ADMIN', 'SUPER_ADMIN'] },
    ],
  },
  {
    groupTitle: 'Administration',
    items: [
      { name: 'Team & Access', path: '/team', icon: Users, minRoles: ['AGENCY_ADMIN', 'SUPER_ADMIN'] },
      { name: 'Settings', path: '/settings', icon: Settings, minRoles: ['BRAND_MANAGER', 'AGENCY_ADMIN', 'SUPER_ADMIN'] },
    ],
  },
];

export default function Sidebar({ mobileOpen = false, setMobileOpen = () => {} }) {
  const { currentRole } = useAuth();
  const drawerRef = useRef(null);

  // Accessible mobile drawer keyboard handling & scroll lock
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden';

      const handleKeyDown = (e) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          setMobileOpen(false);
        }
      };

      window.addEventListener('keydown', handleKeyDown);
      return () => {
        window.removeEventListener('keydown', handleKeyDown);
        document.body.style.overflow = '';
      };
    }
  }, [mobileOpen, setMobileOpen]);

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-40 lg:hidden transition-opacity"
          aria-hidden="true"
        />
      )}

      {/* Sidebar Navigation */}
      <aside
        ref={drawerRef}
        role="navigation"
        aria-label="Main Navigation"
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
              <span className="font-extrabold text-base text-white tracking-tight">PostPilot</span>
              <span className="ml-1.5 px-1.5 py-0.5 text-[9px] uppercase font-bold tracking-wider bg-indigo-500/20 text-indigo-400 rounded">
                SaaS
              </span>
            </div>
          </div>

          {/* Close button on mobile */}
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="lg:hidden p-1.5 text-slate-400 hover:text-white rounded-lg transition"
            aria-label="Close navigation menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Grouped Navigation Links */}
        <nav className="flex-1 px-3 py-4 space-y-6 overflow-y-auto">
          {NAVIGATION_GROUPS.map((group) => {
            const filteredItems = group.items.filter((item) =>
              item.minRoles.includes(currentRole)
            );

            if (filteredItems.length === 0) return null;

            return (
              <div key={group.groupTitle} className="space-y-1">
                <span className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  {group.groupTitle}
                </span>
                <div className="space-y-0.5 pt-1">
                  {filteredItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <NavLink
                        key={item.path}
                        to={item.path}
                        onClick={() => setMobileOpen(false)}
                        className={({ isActive }) =>
                          `flex items-center space-x-3 px-3 py-2 rounded-xl text-xs font-semibold transition ${
                            isActive
                              ? 'bg-indigo-600 text-white shadow-xs font-bold'
                              : 'text-slate-400 hover:text-white hover:bg-slate-800/70'
                          }`
                        }
                      >
                        <Icon className="w-4 h-4 shrink-0" />
                        <span>{item.name}</span>
                      </NavLink>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>

        {/* Footer info */}
        <div className="p-3 border-t border-slate-800 text-[11px] text-slate-400 text-center">
          Role: <span className="font-bold text-slate-300">{currentRole.replace('_', ' ')}</span>
        </div>
      </aside>
    </>
  );
}
