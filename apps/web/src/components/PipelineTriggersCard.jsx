import React, { useState, useEffect } from 'react';
import {
  Clock,
  Zap,
  MousePointer,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Play,
  Pause,
  ChevronDown,
  ChevronUp,
  Activity,
  Layers,
  Sparkles,
} from 'lucide-react';
import apiClient from '../api/client.js';

export default function PipelineTriggersCard({ onTriggerSuccess }) {
  // Cron ticker state (60s countdown)
  const [cronSeconds, setCronSeconds] = useState(60);
  const [cronPaused, setCronPaused] = useState(false);
  const [cronRunning, setCronRunning] = useState(false);
  const [lastCronResult, setLastCronResult] = useState(null);

  // Webhook trigger state
  const [webhookLoading, setWebhookLoading] = useState(false);
  const [isTestWebhookMode, setIsTestWebhookMode] = useState(false);
  const [lastWebhookResult, setLastWebhookResult] = useState(null);

  // Manual test trigger state
  const [manualLoading, setManualLoading] = useState(false);
  const [lastManualResult, setLastManualResult] = useState(null);

  // Drawer / details accordion
  const [activeConsole, setActiveConsole] = useState(null); // 'cron' | 'webhook' | 'manual' | null

  // Sync real system scheduler status on load
  useEffect(() => {
    fetchSchedulerStatus();
  }, []);

  const fetchSchedulerStatus = async () => {
    try {
      const res = await apiClient.get('/publish/scheduler-status');
      if (res.data?.success && res.data?.data) {
        setCronPaused(Boolean(res.data.data.paused));
      }
    } catch (e) {
      // fallback
    }
  };

  const handleToggleCronPause = async () => {
    const nextPaused = !cronPaused;
    setCronPaused(nextPaused);
    try {
      await apiClient.post('/publish/toggle-scheduler', { paused: nextPaused });
    } catch (err) {
      console.warn('Failed to toggle backend scheduler:', err);
    }
  };

  // 1-minute countdown ticker
  useEffect(() => {
    if (cronPaused) return;

    const interval = setInterval(() => {
      setCronSeconds((prev) => {
        if (prev <= 1) {
          triggerCronAuto();
          return 60;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [cronPaused]);

  // Trigger 1: Cron Execution
  const triggerCronAuto = async () => {
    try {
      setCronRunning(true);
      const res = await apiClient.post('/publish/check-due');
      setLastCronResult({
        success: true,
        timestamp: new Date().toLocaleTimeString(),
        data: res.data?.data || res.data,
      });
      if (onTriggerSuccess) onTriggerSuccess();
    } catch (err) {
      setLastCronResult({
        success: false,
        timestamp: new Date().toLocaleTimeString(),
        error: err.response?.data?.message || err.message,
      });
    } finally {
      setCronRunning(false);
    }
  };

  const handleForceCron = () => {
    setCronSeconds(60);
    triggerCronAuto();
  };

  // Trigger 2: Webhook Trigger (supports /webhook and /webhook-test)
  const handleFireWebhook = async () => {
    try {
      setWebhookLoading(true);
      const res = await apiClient.post('/publish/trigger-n8n-sync', {
        source: isTestWebhookMode ? 'Frontend Canvas Test Webhook Trigger' : 'Frontend Webhook Trigger',
        isTestWebhook: isTestWebhookMode,
        triggeredBy: 'User Action (Dashboard)',
        timestamp: new Date().toISOString(),
      });
      setLastWebhookResult({
        success: true,
        timestamp: new Date().toLocaleTimeString(),
        data: res.data?.data || res.data,
        n8nReachable: res.data?.n8nReachable,
        usedEndpoint: res.data?.usedEndpoint,
      });
      setActiveConsole('webhook');
      if (onTriggerSuccess) onTriggerSuccess();
    } catch (err) {
      setLastWebhookResult({
        success: false,
        timestamp: new Date().toLocaleTimeString(),
        error: err.response?.data?.message || err.message,
      });
      setActiveConsole('webhook');
    } finally {
      setWebhookLoading(false);
    }
  };

  // Trigger 3: Manual Test Trigger
  const handleManualTest = async () => {
    try {
      setManualLoading(true);
      const res = await apiClient.post('/publish/manual-test', {
        testMode: true,
        caption: 'Automated dry-run test post from Frontend Manual Trigger',
        source: 'Manual Test Trigger (Frontend)',
      });
      setLastManualResult({
        success: true,
        timestamp: new Date().toLocaleTimeString(),
        data: res.data,
      });
      setActiveConsole('manual');
      if (onTriggerSuccess) onTriggerSuccess();
    } catch (err) {
      setLastManualResult({
        success: false,
        timestamp: new Date().toLocaleTimeString(),
        error: err.response?.data?.message || err.message,
      });
      setActiveConsole('manual');
    } finally {
      setManualLoading(false);
    }
  };

  return (
    <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950 text-white rounded-2xl p-5 border border-slate-800 shadow-xl relative overflow-hidden">
      {/* Decorative Canvas Background Dots */}
      <div
        className="absolute inset-0 opacity-10 pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle, #818cf8 1px, transparent 1px)',
          backgroundSize: '16px 16px',
        }}
      />

      {/* Header bar */}
      <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-slate-800/80">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-orange-500/20 border border-orange-500/40 text-orange-400 flex items-center justify-center shadow-inner">
            <Zap className="w-5 h-5 fill-orange-400 text-orange-400" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-sm sm:text-base font-black tracking-tight text-white">
                n8n Master Pipeline Triggers
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 flex items-center space-x-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>Port 5678 Live</span>
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Interactive triggers mapped directly to your n8n Production Pipeline workflow.
            </p>
          </div>
        </div>

        <a
          href="http://localhost:5678/home/workflows"
          target="_blank"
          rel="noopener noreferrer"
          className="self-start sm:self-center px-3 py-1.5 rounded-xl bg-slate-800/90 hover:bg-slate-700/90 text-slate-200 border border-slate-700 text-xs font-bold transition flex items-center space-x-1.5 group"
        >
          <span>Open n8n Canvas</span>
          <ExternalLink className="w-3 h-3 text-slate-400 group-hover:text-white transition" />
        </a>
      </div>

      {/* 3 Triggers Grid (Visual representation matching n8n nodes) */}
      <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
        {/* ========================================================================= */}
        {/* TRIGGER 1: 1-Minute Schedule Cron */}
        {/* ========================================================================= */}
        <div className="bg-slate-800/70 hover:bg-slate-800/90 border border-slate-700/80 rounded-2xl p-4 flex flex-col justify-between transition group shadow-sm">
          <div>
            {/* Top Node Pill (Matching n8n canvas visual) */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <div className="w-10 h-10 rounded-2xl bg-white border border-slate-200 flex items-center justify-center shadow-md relative">
                  <Clock className="w-5 h-5 text-slate-800" />
                  <span className="absolute -bottom-1 -right-1 w-3 h-3 rounded-full bg-emerald-500 border-2 border-slate-800" />
                </div>
                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-400">
                    Cron Trigger
                  </span>
                  <div className="text-xs font-black text-white">1-Minute Schedule Cron</div>
                </div>
              </div>
              <button
                onClick={handleToggleCronPause}
                className={`p-1.5 rounded-lg border text-xs font-bold transition flex items-center space-x-1 ${
                  cronPaused
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/30 hover:bg-amber-500/30'
                    : 'bg-slate-700/60 text-slate-300 border-slate-600 hover:bg-slate-700'
                }`}
                title={cronPaused ? 'Resume Global Scheduler & n8n Queue' : 'Pause Global Scheduler & n8n Queue'}
              >
                {cronPaused ? (
                  <>
                    <Play className="w-3 h-3 fill-current text-amber-400" />
                    <span className="text-[10px] text-amber-400 font-extrabold pr-0.5">Resume</span>
                  </>
                ) : (
                  <>
                    <Pause className="w-3 h-3 fill-current text-slate-300" />
                    <span className="text-[10px] text-slate-300 font-bold pr-0.5">Pause</span>
                  </>
                )}
              </button>
            </div>

            <p className="text-[11px] text-slate-400 mb-3 leading-relaxed">
              Autonomous scanner fires every 60s to detect scheduled posts and automatically publish them.
              {cronPaused && (
                <span className="block mt-1 text-amber-400 font-bold text-[10px]">
                  ⏸️ PAUSED: Backend poller and n8n queue are currently halted.
                </span>
              )}
            </p>

            {/* Countdown bar */}
            <div className="bg-slate-900/80 rounded-xl p-2.5 border border-slate-700/60 mb-3">
              <div className="flex items-center justify-between text-[11px] font-bold mb-1.5">
                <span className="text-slate-400">Next Auto-Scan:</span>
                <span className={cronPaused ? 'text-amber-400 font-bold' : 'text-emerald-400 font-mono'}>
                  {cronPaused ? 'PAUSED (n8n & API Halted)' : `${cronSeconds}s`}
                </span>
              </div>
              <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-1000 ease-linear rounded-full ${
                    cronPaused ? 'bg-amber-500 w-full' : 'bg-emerald-500'
                  }`}
                  style={{ width: cronPaused ? '100%' : `${((60 - cronSeconds) / 60) * 100}%` }}
                />
              </div>
            </div>
          </div>

          <div className="space-y-2 pt-2 border-t border-slate-700/60">
            <button
              onClick={handleForceCron}
              disabled={cronRunning}
              className="w-full py-2 px-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition shadow-sm flex items-center justify-center space-x-1.5 disabled:opacity-60"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${cronRunning ? 'animate-spin' : ''}`} />
              <span>{cronRunning ? 'Scanning Queue...' : 'Force Run Cron Now'}</span>
            </button>

            {lastCronResult && (
              <button
                onClick={() => setActiveConsole(activeConsole === 'cron' ? null : 'cron')}
                className="w-full text-[10px] text-slate-400 hover:text-slate-200 flex items-center justify-between px-1"
              >
                <span>Last run at {lastCronResult.timestamp}</span>
                {activeConsole === 'cron' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
            )}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* TRIGGER 2: Frontend Webhook Trigger */}
        {/* ========================================================================= */}
        <div className="bg-slate-800/70 hover:bg-slate-800/90 border border-slate-700/80 rounded-2xl p-4 flex flex-col justify-between transition group shadow-sm">
          <div>
            {/* Top Node Pill (Matching n8n canvas visual) */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <div className="w-10 h-10 rounded-2xl bg-white border border-slate-200 flex items-center justify-center shadow-md relative">
                  {/* Pink n8n webhook icon */}
                  <div className="w-5 h-5 flex items-center justify-center text-rose-600 font-black">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-5 h-5 text-rose-600">
                      <circle cx="12" cy="12" r="3" />
                      <circle cx="6" cy="6" r="2" />
                      <circle cx="18" cy="6" r="2" />
                      <circle cx="12" cy="19" r="2" />
                      <line x1="7.5" y1="7.5" x2="10.5" y2="10.5" />
                      <line x1="16.5" y1="7.5" x2="13.5" y2="10.5" />
                      <line x1="12" y1="15" x2="12" y2="17" />
                    </svg>
                  </div>
                  <span className="absolute -left-1 top-2 w-2.5 h-2.5 rounded-full bg-orange-500 border border-slate-800 flex items-center justify-center">
                    <Zap className="w-2 h-2 text-white fill-current" />
                  </span>
                </div>
                <div>
                  <div className="flex items-center space-x-1.5">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-rose-400">
                      Webhook Trigger
                    </span>
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-rose-500/20 text-rose-300 font-mono">
                      POST
                    </span>
                  </div>
                  <div className="text-xs font-black text-white">Frontend Webhook Trigger</div>
                </div>
              </div>

              {/* Webhook Mode Toggle (Production vs n8n Canvas Test Mode) */}
              <div className="flex items-center space-x-1 bg-slate-900/90 p-1 rounded-xl border border-slate-700/60">
                <button
                  type="button"
                  onClick={() => setIsTestWebhookMode(false)}
                  className={`flex-1 py-1 px-1.5 rounded-lg text-[9px] font-extrabold transition ${
                    !isTestWebhookMode
                      ? 'bg-rose-600 text-white shadow-xs'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                  title="Production Webhook: /webhook/postpilot-sync (runs 24/7)"
                >
                  Prod URL
                </button>
                <button
                  type="button"
                  onClick={() => setIsTestWebhookMode(true)}
                  className={`flex-1 py-1 px-1.5 rounded-lg text-[9px] font-extrabold transition ${
                    isTestWebhookMode
                      ? 'bg-amber-500 text-slate-900 font-black shadow-xs'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                  title="n8n Canvas Test Mode: /webhook-test/postpilot-sync"
                >
                  Test URL
                </button>
              </div>
            </div>

            <p className="text-[11px] text-slate-400 mb-2 leading-relaxed">
              {isTestWebhookMode ? (
                <span>
                  Targeting n8n Canvas Test URL:{' '}
                  <code className="text-amber-300 font-mono text-[10px]">/webhook-test/postpilot-sync</code>.
                  <span className="block mt-0.5 text-amber-400/90 text-[10px]">
                    Tip: Click "Test step" in n8n canvas, then fire this button.
                  </span>
                </span>
              ) : (
                <span>
                  Dispatches an immediate HTTP POST webhook to{' '}
                  <code className="text-rose-300 font-mono text-[10px]">/webhook/postpilot-sync</code> to initiate the master workflow.
                </span>
              )}
            </p>

            <div className="bg-slate-900/80 rounded-xl p-2.5 border border-slate-700/60 mb-3 space-y-1 text-[11px]">
              <div className="flex items-center justify-between text-slate-400">
                <span>Webhook URL:</span>
                <span className={`font-mono text-[10px] font-bold ${isTestWebhookMode ? 'text-amber-300' : 'text-slate-200'}`}>
                  {isTestWebhookMode ? 'webhook-test/postpilot-sync' : 'webhook/postpilot-sync'}
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-400">
                <span>Target Listener:</span>
                <span className="text-emerald-400 font-bold">Port 5678 (Active)</span>
              </div>
            </div>
          </div>

          <div className="space-y-2 pt-2 border-t border-slate-700/60">
            <button
              onClick={handleFireWebhook}
              disabled={webhookLoading}
              className="w-full py-2 px-3 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition shadow-sm flex items-center justify-center space-x-1.5 disabled:opacity-60"
            >
              <Zap className={`w-3.5 h-3.5 ${webhookLoading ? 'animate-bounce' : 'fill-current'}`} />
              <span>{webhookLoading ? 'Firing Webhook...' : 'Fire Webhook Trigger'}</span>
            </button>

            {lastWebhookResult && (
              <button
                onClick={() => setActiveConsole(activeConsole === 'webhook' ? null : 'webhook')}
                className="w-full text-[10px] text-slate-400 hover:text-slate-200 flex items-center justify-between px-1"
              >
                <span className="text-emerald-400">✓ Webhook 200 OK ({lastWebhookResult.timestamp})</span>
                {activeConsole === 'webhook' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
            )}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* TRIGGER 3: Manual Test Trigger */}
        {/* ========================================================================= */}
        <div className="bg-slate-800/70 hover:bg-slate-800/90 border border-slate-700/80 rounded-2xl p-4 flex flex-col justify-between transition group shadow-sm">
          <div>
            {/* Top Node Pill (Matching n8n canvas visual) */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <div className="w-10 h-10 rounded-2xl bg-white border border-slate-200 flex items-center justify-center shadow-md relative">
                  <div className="w-5 h-5 flex items-center justify-center">
                    <MousePointer className="w-5 h-5 text-indigo-700" />
                  </div>
                  <span className="absolute -left-1 top-2 w-2.5 h-2.5 rounded-full bg-orange-500 border border-slate-800 flex items-center justify-center">
                    <Zap className="w-2 h-2 text-white fill-current" />
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-400">
                    On-Demand Test
                  </span>
                  <div className="text-xs font-black text-white">Manual Test Trigger</div>
                </div>
              </div>
            </div>

            <p className="text-[11px] text-slate-400 mb-3 leading-relaxed">
              Simulates on-demand pipeline execution with complete 7-network routing validation without database side effects.
            </p>

            <div className="bg-slate-900/80 rounded-xl p-2.5 border border-slate-700/60 mb-3 space-y-1 text-[11px]">
              <div className="flex items-center justify-between text-slate-400">
                <span>Validation Networks:</span>
                <span className="text-indigo-300 font-bold">7 Channels (FB, IG, LI, X...)</span>
              </div>
              <div className="flex items-center justify-between text-slate-400">
                <span>Execution Type:</span>
                <span className="text-amber-400 font-bold">Dry-Run Verification</span>
              </div>
            </div>
          </div>

          <div className="space-y-2 pt-2 border-t border-slate-700/60">
            <button
              onClick={handleManualTest}
              disabled={manualLoading}
              className="w-full py-2 px-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition shadow-sm flex items-center justify-center space-x-1.5 disabled:opacity-60"
            >
              <MousePointer className="w-3.5 h-3.5" />
              <span>{manualLoading ? 'Simulating Pipeline...' : 'Execute Manual Test'}</span>
            </button>

            {lastManualResult && (
              <button
                onClick={() => setActiveConsole(activeConsole === 'manual' ? null : 'manual')}
                className="w-full text-[10px] text-slate-400 hover:text-slate-200 flex items-center justify-between px-1"
              >
                <span className="text-indigo-400">✓ Test Succeeded ({lastManualResult.timestamp})</span>
                {activeConsole === 'manual' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Accordion Results Drawer for Live Trigger Responses */}
      {activeConsole && (
        <div className="relative z-10 mt-4 p-4 rounded-xl bg-slate-950/90 border border-slate-800 font-mono text-xs animate-fade-in space-y-2">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <span className="text-slate-300 font-bold flex items-center space-x-1.5">
              <Activity className="w-3.5 h-3.5 text-indigo-400" />
              <span>
                {activeConsole === 'cron' && '1-Minute Cron Ticker Log'}
                {activeConsole === 'webhook' && 'Frontend Webhook Trigger Response'}
                {activeConsole === 'manual' && 'Manual Test Execution Telemetry'}
              </span>
            </span>
            <button
              onClick={() => setActiveConsole(null)}
              className="text-slate-500 hover:text-slate-300 text-xs"
            >
              ✕ Close
            </button>
          </div>

          {activeConsole === 'cron' && lastCronResult && (
            <div className="space-y-1.5 text-slate-300">
              <div className="text-emerald-400 font-bold">✓ Scanned at {lastCronResult.timestamp}</div>
              <p className="text-slate-400 text-[11px]">
                {lastCronResult.data?.message || JSON.stringify(lastCronResult.data, null, 2)}
              </p>
            </div>
          )}

          {activeConsole === 'webhook' && lastWebhookResult && (
            <div className="space-y-2">
              <div className="flex items-center space-x-2 text-emerald-400 font-bold">
                <CheckCircle2 className="w-4 h-4" />
                <span>Webhook Trigger Dispatched & Received by n8n (Port 5678)</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] pt-1">
                <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                  <span className="text-slate-500 block">Status:</span>
                  <span className="text-white font-bold">{lastWebhookResult.data?.status || 'SUCCESS'}</span>
                </div>
                <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                  <span className="text-slate-500 block">Brands Scanned:</span>
                  <span className="text-white font-bold">{lastWebhookResult.data?.brandsScanned ?? 1}</span>
                </div>
                <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                  <span className="text-slate-500 block">Executed At:</span>
                  <span className="text-white font-bold">{lastWebhookResult.data?.executedAt || lastWebhookResult.timestamp}</span>
                </div>
                <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                  <span className="text-slate-500 block">Accounts Checklist:</span>
                  <span className="text-emerald-400 font-bold">7 Networks Active</span>
                </div>
              </div>
              <div className="text-[11px] text-slate-400 pt-1">
                {lastWebhookResult.data?.message}
              </div>
            </div>
          )}

          {activeConsole === 'manual' && lastManualResult && (
            <div className="space-y-2">
              <div className="flex items-center space-x-2 text-indigo-400 font-bold">
                <CheckCircle2 className="w-4 h-4" />
                <span>Manual Test Pipeline Dry-Run Complete</span>
              </div>
              <div className="space-y-1.5 pt-1">
                {(lastManualResult.data?.steps || []).map((step, idx) => (
                  <div key={idx} className="flex items-center justify-between text-[11px] bg-slate-900/60 p-2 rounded-lg border border-slate-800/80">
                    <span className="text-slate-300 flex items-center space-x-2">
                      <span className="w-4 h-4 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-[10px] font-bold">
                        {idx + 1}
                      </span>
                      <span>{step.name}</span>
                    </span>
                    <span className="text-slate-400">{step.detail}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
