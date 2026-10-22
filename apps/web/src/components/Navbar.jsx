import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useNavigate } from 'react-router-dom';
import {
  Building2,
  LogOut,
  Plus,
  Workflow,
  Menu,
  Zap,
  X,
} from 'lucide-react';
import PipelineTriggersCard from './PipelineTriggersCard.jsx';

export default function Navbar({ onToggleMobileMenu }) {
  const { user, activeOrg, logout } = useAuth();
  const navigate = useNavigate();
  const [showTriggersModal, setShowTriggersModal] = useState(false);

  const userRole = user?.memberships?.[0]?.role || activeOrg?.role || 'AGENCY_ADMIN';
  const roleDisplay = userRole.replace('_', ' ');

  return (
    <header className="h-14 sm:h-16 bg-white border-b border-slate-200 px-3 sm:px-6 flex items-center justify-between sticky top-0 z-20 select-none shadow-xs">
      {/* Left: Mobile Menu Toggle & Organization Branding */}
      <div className="flex items-center space-x-2 sm:space-x-3 min-w-0">
        <button
          type="button"
          onClick={onToggleMobileMenu}
          className="lg:hidden p-1.5 -ml-1 text-slate-600 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition"
          aria-label="Toggle Navigation Menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center space-x-2 min-w-0">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600 shrink-0">
            <Building2 className="w-4 h-4" />
          </div>
          <div className="flex items-center space-x-2 min-w-0">
            <span className="font-extrabold text-xs sm:text-sm text-slate-900 truncate">
              {activeOrg?.orgName || 'Apex Media Agency'}
            </span>
            <span className="hidden sm:inline-flex px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600 border border-slate-200">
              Enterprise
            </span>
          </div>
        </div>

        {/* Live Automation Engine status badge & Trigger Launcher */}
        <div className="hidden sm:flex items-center space-x-1.5 pl-3 border-l border-slate-200">
          <button
            type="button"
            onClick={() => setShowTriggersModal(true)}
            className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 transition shadow-xs group"
            title="Open n8n Master Pipeline Triggers"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>Pipeline Triggers (3 Active)</span>
            <Zap className="w-3 h-3 text-orange-500 fill-orange-500 group-hover:scale-110 transition" />
          </button>
        </div>
      </div>

      {/* Right: Quick Actions & Profile */}
      <div className="flex items-center space-x-2 sm:space-x-3">
        <button
          onClick={() => navigate('/composer')}
          className="px-2.5 sm:px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center space-x-1 shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Schedule Post</span>
          <span className="sm:hidden">Post</span>
        </button>

        <button
          onClick={() => navigate('/workflows')}
          title="n8n Workflows"
          className="hidden lg:flex p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded-xl transition"
        >
          <Workflow className="w-4 h-4" />
        </button>

        <div className="h-5 w-px bg-slate-200 hidden sm:block" />

        {/* User profile & actions */}
        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-2 min-w-0">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-800 text-white font-extrabold flex items-center justify-center text-xs shadow-xs shrink-0">
              {(user?.firstName?.[0] || 'A').toUpperCase()}
            </div>
            <div className="hidden md:block text-left text-xs min-w-0">
              <p className="font-bold text-slate-800 truncate leading-tight text-[11px]">
                {user ? `${user.firstName} ${user.lastName}` : 'PostPilot Admin'}
              </p>
              <p className="text-[9px] font-bold text-indigo-600 uppercase tracking-wider">
                {roleDisplay}
              </p>
            </div>
          </div>

          <button
            onClick={logout}
            title="Sign out of PostPilot"
            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition shrink-0"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Modal Overlay for Global Pipeline Triggers */}
      {showTriggersModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl">
            <button
              onClick={() => setShowTriggersModal(false)}
              className="absolute top-4 right-4 z-20 w-8 h-8 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition border border-slate-700"
              title="Close Triggers Window"
            >
              <X className="w-4 h-4" />
            </button>
            <PipelineTriggersCard />
          </div>
        </div>
      )}
    </header>
  );
}
