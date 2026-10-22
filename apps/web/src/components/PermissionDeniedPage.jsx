import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert, ArrowLeft } from 'lucide-react';

export default function PermissionDeniedPage({ requiredRole = 'Higher Permission Level' }) {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center">
      <div className="w-16 h-16 rounded-3xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 mb-4 shadow-xs">
        <ShieldAlert className="w-8 h-8" />
      </div>
      <span className="text-xs font-bold uppercase tracking-wider text-amber-600 mb-1">403 Forbidden</span>
      <h1 className="text-2xl font-black text-slate-900 tracking-tight mb-2">Access Restricted</h1>
      <p className="text-xs text-slate-500 max-w-sm mb-6 leading-relaxed">
        Your assigned role in this organization does not have sufficient permissions to view or execute actions on this screen.
      </p>
      <Link
        to="/dashboard"
        className="inline-flex items-center space-x-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Return to Dashboard</span>
      </Link>
    </div>
  );
}
