import React, { useState, useRef } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useNavigate, useLocation } from 'react-router-dom';
import { Send, Lock, Mail, Eye, EyeOff, AlertCircle, CheckCircle2, Shield, ArrowRight } from 'lucide-react';
import AccessibleDialog from '../../components/AccessibleDialog.jsx';
import apiClient from '../../api/client.js';

export default function LoginPage() {
  const { login, sessionExpired, clearSessionExpired } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Forgot Password modal state
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSuccessMessage, setForgotSuccessMessage] = useState(null);

  const errorSummaryRef = useRef(null);

  const from = location.state?.from?.pathname || '/dashboard';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setError('Please enter a valid business email address.');
      errorSummaryRef.current?.focus();
      return;
    }

    if (!password) {
      setError('Please enter your account password.');
      errorSummaryRef.current?.focus();
      return;
    }

    setLoading(true);
    try {
      await login(cleanEmail, password, rememberMe);
      navigate(from, { replace: true });
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        'Authentication failed. Please verify your credentials and try again.';
      setError(msg);
      // Move keyboard focus to error summary for screen readers
      setTimeout(() => {
        errorSummaryRef.current?.focus();
      }, 50);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPasswordSubmit = async (e) => {
    e.preventDefault();
    setForgotLoading(true);
    try {
      const { data } = await apiClient.post('/auth/forgot-password', { email: forgotEmail.trim().toLowerCase() });
      setForgotSuccessMessage(data.message || 'If an account exists, a reset link has been dispatched.');
    } catch (err) {
      setForgotSuccessMessage('If an account exists, a reset link has been dispatched.');
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex">
      {/* Left Pane: Enterprise Branding Banner (Hidden on mobile) */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-12 flex-col justify-between relative overflow-hidden border-r border-slate-800">
        <div className="relative z-10">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-600/40">
              <Send className="w-5 h-5 -rotate-12 translate-x-0.5" />
            </div>
            <span className="text-xl font-black text-white tracking-tight">PostPilot</span>
            <span className="px-2 py-0.5 text-[10px] uppercase font-bold tracking-wider bg-indigo-500/20 text-indigo-300 rounded border border-indigo-500/30">
              Enterprise
            </span>
          </div>
        </div>

        <div className="relative z-10 max-w-lg space-y-6">
          <h1 className="text-3xl lg:text-4xl font-extrabold text-white tracking-tight leading-tight">
            Multi-Brand Social Media Automation & Orchestration
          </h1>
          <p className="text-slate-400 text-sm leading-relaxed">
            Enterprise scheduling, multi-tier approval workflows, and automated multichannel publishing with verified Graph API synchronization.
          </p>

          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-800">
            <div className="flex items-start space-x-3">
              <Shield className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
              <div>
                <h2 className="text-xs font-bold text-white">RBAC Tenant Security</h2>
                <p className="text-[11px] text-slate-400">Strict isolation across organizations and roles.</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <h2 className="text-xs font-bold text-white">Real-Time Sync</h2>
                <p className="text-[11px] text-slate-400">Continuous scheduler with idempotency guarantees.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="relative z-10 text-xs text-slate-500">
          © {new Date().getFullYear()} PostPilot Inc. All rights reserved. SOC2 Type II Certified.
        </div>
      </div>

      {/* Right Pane: Authentication Form */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12 bg-white">
        <div className="w-full max-w-md space-y-6">
          {/* Header */}
          <div className="space-y-1.5">
            <div className="flex items-center space-x-2 lg:hidden mb-4">
              <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center text-white">
                <Send className="w-4 h-4 -rotate-12" />
              </div>
              <span className="text-lg font-black text-slate-900">PostPilot</span>
            </div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">Sign in to your workspace</h2>
            <p className="text-xs text-slate-500">
              Enter your corporate credentials to access multi-channel publishing pipelines.
            </p>
          </div>

          {/* Session Expired Banner */}
          {sessionExpired && (
            <div
              role="alert"
              className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start space-x-2.5"
            >
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <span className="font-bold">Session expired:</span> Your previous authorization has lapsed. Please sign in again to continue your work.
              </div>
            </div>
          )}

          {/* Error Summary Banner with ARIA Live */}
          {error && (
            <div
              ref={errorSummaryRef}
              tabIndex={-1}
              role="alert"
              aria-live="assertive"
              className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-900 text-xs flex items-start space-x-2.5 outline-none focus:ring-2 focus:ring-red-500"
            >
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <div className="flex-1 font-medium">{error}</div>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            <div>
              <label htmlFor="login-email" className="block text-xs font-bold text-slate-700 mb-1">
                Work Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="login-email"
                  name="email"
                  type="email"
                  autoComplete="username"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full text-xs pl-10 pr-3.5 py-2.5 bg-slate-50 hover:bg-slate-100/70 focus:bg-white rounded-xl border border-slate-300 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20 focus:outline-none transition"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="login-password" className="block text-xs font-bold text-slate-700">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setForgotSuccessMessage(null);
                    setForgotEmail(email);
                    setForgotOpen(true);
                  }}
                  className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold transition"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="login-password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full text-xs pl-10 pr-10 py-2.5 bg-slate-50 hover:bg-slate-100/70 focus:bg-white rounded-xl border border-slate-300 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20 focus:outline-none transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded transition"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center space-x-2 text-xs text-slate-600 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                />
                <span>Remember me on this device</span>
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md shadow-indigo-600/30 transition disabled:opacity-50 flex items-center justify-center space-x-2"
            >
              <span>{loading ? 'Authenticating...' : 'Sign In'}</span>
              {!loading && <ArrowRight className="w-4 h-4" />}
            </button>
          </form>

          {/* Development-Only Demo Switcher (Forbidden from Production bundle) */}
          {import.meta.env.DEV && (
            <div className="pt-4 border-t border-slate-200 space-y-2">
              <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider text-center">
                Development Role Quick-Login:
              </span>
              <div className="grid grid-cols-2 gap-2 text-left">
                <button
                  type="button"
                  onClick={() => {
                    setEmail('admin@apexmedia.com');
                    setPassword('ApexAdmin123!');
                  }}
                  className="p-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-[11px] text-slate-700 font-semibold"
                >
                  Agency Admin
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEmail('creator@apexmedia.com');
                    setPassword('ApexCreator123!');
                  }}
                  className="p-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-[11px] text-slate-700 font-semibold"
                >
                  Content Creator
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEmail('manager@apexmedia.com');
                    setPassword('ApexManager123!');
                  }}
                  className="p-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-[11px] text-slate-700 font-semibold"
                >
                  Brand Manager
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEmail('client@apexmedia.com');
                    setPassword('ApexClient123!');
                  }}
                  className="p-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-[11px] text-slate-700 font-semibold"
                >
                  Client Viewer
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Forgot Password Modal */}
      <AccessibleDialog
        isOpen={forgotOpen}
        onClose={() => setForgotOpen(false)}
        title="Reset your password"
        description="Enter your corporate email address to receive password reset instructions."
      >
        {forgotSuccessMessage ? (
          <div className="space-y-4">
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl text-xs flex items-start space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>{forgotSuccessMessage}</span>
            </div>
            <button
              type="button"
              onClick={() => setForgotOpen(false)}
              className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl transition"
            >
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={handleForgotPasswordSubmit} className="space-y-4">
            <div>
              <label htmlFor="forgot-email" className="block text-xs font-bold text-slate-700 mb-1">
                Work Email Address
              </label>
              <input
                id="forgot-email"
                type="email"
                required
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                placeholder="name@company.com"
                className="w-full text-xs px-3.5 py-2.5 bg-slate-50 rounded-xl border border-slate-300 focus:border-indigo-600 focus:outline-none transition"
              />
            </div>
            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setForgotOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={forgotLoading}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition disabled:opacity-50"
              >
                {forgotLoading ? 'Sending...' : 'Send Reset Link'}
              </button>
            </div>
          </form>
        )}
      </AccessibleDialog>
    </div>
  );
}
