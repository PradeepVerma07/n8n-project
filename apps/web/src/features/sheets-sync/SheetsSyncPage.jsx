import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  Copy,
  Check,
  ShieldCheck,
  Database,
  ArrowRight,
  Info,
  Clock,
  Send,
  Zap,
} from 'lucide-react';
import { useBrand } from '../../context/BrandContext.jsx';
import api from '../../api/client.js';

export default function SheetsSyncPage() {
  const { currentBrand } = useBrand();

  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [testing, setTesting] = useState(false);
  const [copied, setCopied] = useState(false);

  // Form states
  const [scheduleSpreadsheetId, setScheduleSpreadsheetId] = useState('');
  const [scheduleSheetName, setScheduleSheetName] = useState('Schedule');
  const [reportSpreadsheetId, setReportSpreadsheetId] = useState('');
  const [reportSheetPrefix, setReportSheetPrefix] = useState('Report_');

  // Status & results
  const [sheetConfig, setSheetConfig] = useState(null);
  const [testResult, setTestResult] = useState(null);
  const [syncResult, setSyncResult] = useState(null);
  const [feedback, setFeedback] = useState(null);

  const serviceAccountEmail = 'postpilot-sync-sa@postpilot-prod.iam.gserviceaccount.com';

  const targetBrand = currentBrand || { id: 'brd-demo-apex', name: 'Apex Global Foods' };

  useEffect(() => {
    if (targetBrand) {
      loadConfig();
    }
  }, [targetBrand?.id]);

  const loadConfig = async () => {
    if (!targetBrand?.id) return;
    try {
      setLoading(true);
      const res = await api.get(`/sheets/config/${targetBrand.id}`);
      if (res.data?.data) {
        const cfg = res.data.data;
        setSheetConfig(cfg);
        setScheduleSpreadsheetId(cfg.scheduleSpreadsheetId || '');
        setScheduleSheetName(cfg.scheduleSheetName || 'Schedule');
        setReportSpreadsheetId(cfg.reportSpreadsheetId || '');
        setReportSheetPrefix(cfg.reportSheetPrefix || 'Report_');
      } else {
        setSheetConfig(null);
      }
    } catch (err) {
      console.warn('Failed to load sheet configuration:', err.message);
      setSheetConfig(null);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Helper to parse sheet ID from raw ID or full Google Sheets URL
   */
  const handleSheetUrlChange = (val) => {
    const pubMatch = val.match(/\/spreadsheets\/d\/e\/([a-zA-Z0-9-_]+)/);
    if (pubMatch) {
      setScheduleSpreadsheetId(pubMatch[1]);
      return;
    }
    const match = val.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (match) {
      setScheduleSpreadsheetId(match[1]);
    } else {
      setScheduleSpreadsheetId(val.trim());
    }
  };

  const handleCopyEmail = () => {
    navigator.clipboard.writeText(serviceAccountEmail);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveConfig = async (e) => {
    e.preventDefault();
    if (!scheduleSpreadsheetId) {
      setFeedback({ type: 'error', message: 'Please provide a valid Schedule Spreadsheet ID or URL.' });
      return;
    }

    try {
      setLoading(true);
      const res = await api.post(`/sheets/config/${targetBrand.id}`, {
        scheduleSpreadsheetId,
        scheduleSheetName,
        reportSpreadsheetId: reportSpreadsheetId || undefined,
        reportSheetPrefix,
      });
      setSheetConfig(res.data.data);
      setFeedback({ type: 'success', message: 'Google Sheets configuration saved successfully.' });
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err.response?.data?.message || 'Failed to save Google Sheets configuration.',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTestConnection = async () => {
    if (!scheduleSpreadsheetId) {
      setFeedback({ type: 'error', message: 'Please enter a Spreadsheet ID first.' });
      return;
    }

    try {
      setTesting(true);
      setTestResult(null);
      const res = await api.post('/sheets/test-connection', {
        spreadsheetId: scheduleSpreadsheetId,
      });
      setTestResult(res.data.data);
      setFeedback({
        type: 'success',
        message: `Connected successfully to "${res.data.data.title}"`,
      });
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err.response?.data?.message || 'Failed to connect to Google Sheet. Check sharing permissions and ID.',
      });
    } finally {
      setTesting(false);
    }
  };

  const handleTriggerSync = async () => {
    try {
      setSyncing(true);
      setSyncResult(null);
      const res = await api.post(`/sheets/sync/${targetBrand.id}`);
      setSyncResult(res.data.data);
      loadConfig();
      setFeedback({
        type: 'success',
        message: `Sync complete: ${res.data.data.validRowsCount} valid rows processed (${res.data.data.createdPosts} new, ${res.data.data.updatedPosts} updated).`,
      });
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err.response?.data?.message || 'Bi-directional sync failed.',
      });
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-lg shadow-emerald-600/20">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">Google Sheets Sync</h1>
              <p className="text-sm text-slate-500">
                19-column bi-directional schedule & report synchronization for{' '}
                <span className="font-semibold text-slate-700">{currentBrand?.name}</span>
              </p>
            </div>
          </div>
        </div>

        {/* Sync Status Badge & Action */}
        <div className="flex items-center space-x-3">
          <span
            className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold ${
              sheetConfig?.syncStatus === 'SUCCESS' || sheetConfig?.syncStatus === 'CONFIGURED'
                ? 'bg-emerald-100 text-emerald-800'
                : sheetConfig?.syncStatus === 'IN_PROGRESS'
                ? 'bg-amber-100 text-amber-800 animate-pulse'
                : 'bg-slate-100 text-slate-600'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-current mr-2" />
            Status: {sheetConfig?.syncStatus || 'NOT_CONFIGURED'}
          </span>

          <button
            onClick={handleTriggerSync}
            disabled={syncing || !scheduleSpreadsheetId}
            className="flex items-center space-x-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition font-medium text-sm disabled:opacity-50 shadow-sm"
          >
            <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
            <span>{syncing ? 'Syncing...' : 'Sync Now'}</span>
          </button>
        </div>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`p-4 rounded-xl flex items-center justify-between text-sm ${
            feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
              : 'bg-rose-50 text-rose-900 border border-rose-200'
          }`}
        >
          <div className="flex items-center space-x-2">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="text-xs font-semibold opacity-70 hover:opacity-100 uppercase"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Service Account Setup Callout */}
      <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center space-x-2 text-indigo-400 text-xs font-bold uppercase tracking-wider">
              <ShieldCheck className="w-4 h-4" />
              <span>Step 1: Share Your Google Sheet</span>
            </div>
            <h3 className="text-xl font-bold">Share your spreadsheet with the PostPilot service account</h3>
            <p className="text-slate-300 text-sm">
              In Google Sheets, click the blue <strong>Share</strong> button and grant <strong>Editor</strong>{' '}
              access to this Service Account email:
            </p>
            <div className="flex items-center space-x-2 bg-black/40 border border-white/10 rounded-lg p-2.5 font-mono text-xs text-indigo-200 w-fit">
              <span>{serviceAccountEmail}</span>
              <button
                onClick={handleCopyEmail}
                className="ml-2 px-2 py-1 bg-white/10 hover:bg-white/20 rounded text-white flex items-center space-x-1 transition"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <a
              href="https://sheets.new"
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center space-x-2 px-4 py-2.5 bg-white text-slate-900 rounded-lg hover:bg-slate-100 transition font-semibold text-sm shadow"
            >
              <span>Create New Google Sheet</span>
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </div>
      </div>

      {/* Main Configuration Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Sheet Settings Form */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <h3 className="text-lg font-bold text-slate-900">Spreadsheet Configuration</h3>
            <span className="text-xs text-slate-500 font-medium">Auto-synced by n8n every 60s</span>
          </div>

          <form onSubmit={handleSaveConfig} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Schedule Spreadsheet ID or URL *
              </label>
              <input
                type="text"
                value={scheduleSpreadsheetId}
                onChange={(e) => handleSheetUrlChange(e.target.value)}
                placeholder="https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit or ID"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none transition font-mono"
              />
              <p className="text-xs text-slate-400 mt-1">
                Paste the full URL from your browser address bar or just the alphanumeric sheet ID.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Schedule Tab Name
                </label>
                <input
                  type="text"
                  value={scheduleSheetName}
                  onChange={(e) => setScheduleSheetName(e.target.value)}
                  placeholder="Schedule"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Report Sheet Prefix
                </label>
                <input
                  type="text"
                  value={reportSheetPrefix}
                  onChange={(e) => setReportSheetPrefix(e.target.value)}
                  placeholder="Report_"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none transition"
                />
              </div>
            </div>

            <div className="pt-2 flex items-center space-x-3">
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2.5 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition font-semibold text-sm disabled:opacity-50"
              >
                {loading ? 'Saving...' : 'Save Configuration'}
              </button>

              <button
                type="button"
                onClick={handleTestConnection}
                disabled={testing || !scheduleSpreadsheetId}
                className="px-4 py-2.5 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg font-semibold text-sm transition disabled:opacity-50 flex items-center space-x-2"
              >
                {testing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                <span>{testing ? 'Testing...' : 'Test Connection & Permissions'}</span>
              </button>
            </div>
          </form>

          {/* Test Result Display */}
          {testResult && (
            <div className="mt-4 p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex items-center space-x-2 text-emerald-600 font-bold text-sm">
                <CheckCircle2 className="w-4 h-4" />
                <span>Spreadsheet Verified: {testResult.title}</span>
              </div>
              <div className="text-xs text-slate-600 flex flex-wrap gap-2 pt-1">
                <span className="font-semibold text-slate-700">Available Tabs:</span>
                {testResult.sheets?.map((tab) => (
                  <span key={tab} className="px-2 py-0.5 bg-white border border-slate-200 rounded text-slate-800">
                    {tab}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Sync Telemetry & Loop Prevention */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
              <h3 className="text-lg font-bold text-slate-900">Sync Telemetry</h3>
              <Clock className="w-4 h-4 text-slate-400" />
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-xs text-slate-500 font-medium">Last Synchronized</p>
                <p className="text-sm font-bold text-slate-800 mt-0.5">
                  {sheetConfig?.lastSyncAt
                    ? new Date(sheetConfig.lastSyncAt).toLocaleString()
                    : 'Never synced yet'}
                </p>
              </div>

              <div>
                <p className="text-xs text-slate-500 font-medium">SHA-256 Checksum (Loop Prevention)</p>
                <p className="text-xs font-mono text-slate-700 bg-slate-50 p-2 rounded border border-slate-200 break-all mt-1">
                  {sheetConfig?.lastSyncRowChecksum || 'No checksum calculated yet'}
                </p>
              </div>

              {syncResult && (
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-100 space-y-2 text-xs">
                  <p className="font-bold text-emerald-900">Last Sync Pass Metrics:</p>
                  <div className="grid grid-cols-2 gap-2 text-emerald-800">
                    <div>
                      Total Rows: <strong>{syncResult.totalRows}</strong>
                    </div>
                    <div>
                      Valid: <strong>{syncResult.validRowsCount}</strong>
                    </div>
                    <div>
                      Created: <strong>{syncResult.createdPosts}</strong>
                    </div>
                    <div>
                      Updated: <strong>{syncResult.updatedPosts}</strong>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 text-xs text-slate-500 space-y-1">
            <p className="font-semibold text-slate-700">Quota Safety:</p>
            <p>
              Uses <code>spreadsheets.values.batchGet</code> with exponential backoff on 429/503 limits.
            </p>
          </div>
        </div>
      </div>

      {/* 19-Column Contract Reference Table */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-900">19-Column Schedule Sheet Contract (A to S)</h3>
            <p className="text-xs text-slate-500">
              The exact column format required for automated row validation and publish triggers.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border border-slate-200 rounded-lg">
            <thead className="bg-slate-50 text-slate-700 uppercase tracking-wider font-semibold border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3">Col</th>
                <th className="py-2.5 px-3">Field Name</th>
                <th className="py-2.5 px-3">Type</th>
                <th className="py-2.5 px-3">Example</th>
                <th className="py-2.5 px-3">Description & Validation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-600">
              <tr>
                <td className="py-2 px-3 font-mono font-bold text-slate-900">A</td>
                <td className="py-2 px-3 font-semibold text-slate-800">post_id</td>
                <td className="py-2 px-3">string</td>
                <td className="py-2 px-3 font-mono text-indigo-600">PP-2026-000123</td>
                <td className="py-2 px-3">Auto-generated if empty; unique custom ID</td>
              </tr>
              <tr>
                <td className="py-2 px-3 font-mono font-bold text-slate-900">B</td>
                <td className="py-2 px-3 font-semibold text-slate-800">client_name</td>
                <td className="py-2 px-3">string</td>
                <td className="py-2 px-3">Acme Foods</td>
                <td className="py-2 px-3">Display client name</td>
              </tr>
              <tr>
                <td className="py-2 px-3 font-mono font-bold text-slate-900">C</td>
                <td className="py-2 px-3 font-semibold text-slate-800">brand_id</td>
                <td className="py-2 px-3">string</td>
                <td className="py-2 px-3 font-mono">brand_acme</td>
                <td className="py-2 px-3">Must match PostPilot Brand ID</td>
              </tr>
              <tr>
                <td className="py-2 px-3 font-mono font-bold text-slate-900">D</td>
                <td className="py-2 px-3 font-semibold text-slate-800">topic</td>
                <td className="py-2 px-3">string</td>
                <td className="py-2 px-3">Diwali Offer</td>
                <td className="py-2 px-3">Campaign or internal reference</td>
              </tr>
              <tr>
                <td className="py-2 px-3 font-mono font-bold text-slate-900">E</td>
                <td className="py-2 px-3 font-semibold text-slate-800">caption</td>
                <td className="py-2 px-3">text</td>
                <td className="py-2 px-3">Celebrate with 20% off...</td>
                <td className="py-2 px-3">Main social copy</td>
              </tr>
              <tr>
                <td className="py-2 px-3 font-mono font-bold text-slate-900">F</td>
                <td className="py-2 px-3 font-semibold text-slate-800">hashtags</td>
                <td className="py-2 px-3">string</td>
                <td className="py-2 px-3">#sale #festive</td>
                <td className="py-2 px-3">Appended per platform formatting rules</td>
              </tr>
              <tr>
                <td className="py-2 px-3 font-mono font-bold text-slate-900">G</td>
                <td className="py-2 px-3 font-semibold text-slate-800">platforms</td>
                <td className="py-2 px-3">csv</td>
                <td className="py-2 px-3 font-mono">facebook, instagram</td>
                <td className="py-2 px-3">Comma-separated destination channels</td>
              </tr>
              <tr>
                <td className="py-2 px-3 font-mono font-bold text-slate-900">H</td>
                <td className="py-2 px-3 font-semibold text-slate-800">post_type</td>
                <td className="py-2 px-3">enum</td>
                <td className="py-2 px-3">image / video / carousel / text</td>
                <td className="py-2 px-3">Post format type</td>
              </tr>
              <tr>
                <td className="py-2 px-3 font-mono font-bold text-slate-900">I</td>
                <td className="py-2 px-3 font-semibold text-slate-800">media_urls</td>
                <td className="py-2 px-3">csv urls</td>
                <td className="py-2 px-3 font-mono">https://...jpg</td>
                <td className="py-2 px-3">Publicly accessible image or video URLs</td>
              </tr>
              <tr>
                <td className="py-2 px-3 font-mono font-bold text-slate-900">J</td>
                <td className="py-2 px-3 font-semibold text-slate-800">scheduled_date</td>
                <td className="py-2 px-3">date</td>
                <td className="py-2 px-3 font-mono">2026-11-01</td>
                <td className="py-2 px-3">Local date (YYYY-MM-DD)</td>
              </tr>
              <tr>
                <td className="py-2 px-3 font-mono font-bold text-slate-900">K</td>
                <td className="py-2 px-3 font-semibold text-slate-800">scheduled_time</td>
                <td className="py-2 px-3">time</td>
                <td className="py-2 px-3 font-mono">18:30</td>
                <td className="py-2 px-3">Local 24-hour time (HH:mm)</td>
              </tr>
              <tr>
                <td className="py-2 px-3 font-mono font-bold text-slate-900">L</td>
                <td className="py-2 px-3 font-semibold text-slate-800">timezone</td>
                <td className="py-2 px-3">IANA</td>
                <td className="py-2 px-3 font-mono">Asia/Kolkata</td>
                <td className="py-2 px-3">Overrides brand default timezone</td>
              </tr>
              <tr>
                <td className="py-2 px-3 font-mono font-bold text-slate-900">M</td>
                <td className="py-2 px-3 font-semibold text-slate-800">status</td>
                <td className="py-2 px-3">enum</td>
                <td className="py-2 px-3 font-semibold text-emerald-600">Scheduled</td>
                <td className="py-2 px-3">Only "Scheduled" rows are picked up by scheduler</td>
              </tr>
              <tr>
                <td className="py-2 px-3 font-mono font-bold text-slate-900">N-S</td>
                <td className="py-2 px-3 font-semibold text-slate-800">System Written</td>
                <td className="py-2 px-3">output</td>
                <td className="py-2 px-3">published_at_utc, platform_ids...</td>
                <td className="py-2 px-3">Written back by n8n WF-02 and worker</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
