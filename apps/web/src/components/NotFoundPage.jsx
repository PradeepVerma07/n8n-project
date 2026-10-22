import React from 'react';
import { Link } from 'react-router-dom';
import { FileQuestion, ArrowLeft } from 'lucide-react';

export default function NotFoundPage() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center">
      <div className="w-16 h-16 rounded-3xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 mb-4 shadow-xs">
        <FileQuestion className="w-8 h-8" />
      </div>
      <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 mb-1">404 Error</span>
      <h1 className="text-2xl font-black text-slate-900 tracking-tight mb-2">Page Not Found</h1>
      <p className="text-xs text-slate-500 max-w-sm mb-6 leading-relaxed">
        The requested screen does not exist or may have been relocated within the PostPilot workspace.
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
