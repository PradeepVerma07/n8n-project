import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useNavigate } from 'react-router-dom';
import { Send, Lock, Mail, AlertCircle } from 'lucide-react';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await login(email, password);
      navigate('/media');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl p-8 shadow-2xl space-y-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white mx-auto shadow-lg shadow-indigo-600/30">
            <Send className="w-6 h-6 -rotate-12 translate-x-0.5" />
          </div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Welcome to PostPilot</h2>
          <p className="text-xs text-slate-500">Sign in to manage your multi-brand social media pipelines</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-3.5 rounded-xl text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@agency.com"
                className="w-full text-xs pl-10 pr-3.5 py-2.5 bg-slate-50 hover:bg-slate-100/70 focus:bg-white rounded-xl border border-slate-200 focus:border-indigo-600 focus:outline-none transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full text-xs pl-10 pr-3.5 py-2.5 bg-slate-50 hover:bg-slate-100/70 focus:bg-white rounded-xl border border-slate-200 focus:border-indigo-600 focus:outline-none transition"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-lg shadow-indigo-600/30 transition disabled:opacity-50"
          >
            {loading ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>

        {/* Quick Employee Login Switcher */}
        <div className="pt-4 border-t border-slate-100 space-y-2.5">
          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider text-center">
            Or Sign In as Employee Role:
          </p>
          <div className="grid grid-cols-2 gap-2 text-left">
            <button
              type="button"
              onClick={() => {
                setEmail('admin@apexmedia.com');
                setPassword('ApexAdmin123!');
              }}
              className="p-2 bg-slate-50 hover:bg-purple-50 hover:border-purple-200 border border-slate-200 rounded-xl transition text-[11px]"
            >
              <span className="font-bold text-purple-700 block">Agency Admin</span>
              <span className="text-slate-500 truncate block text-[10px]">admin@apexmedia.com</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setEmail('manager@apexmedia.com');
                setPassword('ApexAdmin123!');
              }}
              className="p-2 bg-slate-50 hover:bg-indigo-50 hover:border-indigo-200 border border-slate-200 rounded-xl transition text-[11px]"
            >
              <span className="font-bold text-indigo-700 block">Brand Manager</span>
              <span className="text-slate-500 truncate block text-[10px]">manager@apexmedia.com</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setEmail('creator@apexmedia.com');
                setPassword('ApexAdmin123!');
              }}
              className="p-2 bg-slate-50 hover:bg-blue-50 hover:border-blue-200 border border-slate-200 rounded-xl transition text-[11px]"
            >
              <span className="font-bold text-blue-700 block">Content Creator</span>
              <span className="text-slate-500 truncate block text-[10px]">creator@apexmedia.com</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setEmail('client@apexmedia.com');
                setPassword('ApexAdmin123!');
              }}
              className="p-2 bg-slate-50 hover:bg-slate-100 hover:border-slate-300 border border-slate-200 rounded-xl transition text-[11px]"
            >
              <span className="font-bold text-slate-700 block">Client Viewer</span>
              <span className="text-slate-500 truncate block text-[10px]">client@apexmedia.com</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
