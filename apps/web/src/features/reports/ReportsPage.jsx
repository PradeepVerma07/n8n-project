import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  Download,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Clock,
  TrendingUp,
  Share2,
  ExternalLink,
  Search,
  Filter,
  RefreshCw,
  FileSpreadsheet,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { useBrand } from '../../context/BrandContext.jsx';
import { useToast } from '../../components/Toast.jsx';
import api from '../../api/client.js';

const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

export default function ReportsPage() {
  const { currentBrand } = useBrand();
  const { addToast } = useToast();

  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [metrics, setMetrics] = useState(null);

  // Logs table state
  const [logs, setLogs] = useState([]);
  const [logMeta, setLogMeta] = useState({ total: 0, page: 1, limit: 10, pages: 1 });
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    fetchData();
  }, [currentBrand, days]);

  useEffect(() => {
    fetchLogs(1);
  }, [currentBrand, statusFilter]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const params = { days };
      if (currentBrand?.id) params.brandId = currentBrand.id;

      const res = await api.get('/reports/metrics', { params });
      setMetrics(res.data?.data || null);
    } catch (err) {
      console.warn('Failed to load real metrics:', err.message);
      setMetrics(null);
    } finally {
      setLoading(false);
    }
  };

  const fetchLogs = async (page = 1) => {
    try {
      const params = { page, limit: 10 };
      if (currentBrand?.id) params.brandId = currentBrand.id;
      if (statusFilter) params.status = statusFilter;
      if (searchTerm) params.search = searchTerm;

      const res = await api.get('/reports/logs', { params });
      setLogs(res.data?.data || []);
      setLogMeta(res.data?.meta || { total: 0, page: 1, limit: 10, pages: 1 });
    } catch (err) {
      console.warn('Failed to load real audit logs:', err.message);
      setLogs([]);
      setLogMeta({ total: 0, page: 1, limit: 10, pages: 1 });
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchData(), fetchLogs(logMeta.page)]);
    setRefreshing(false);
  };

  const handleExportCsv = async () => {
    try {
      setExporting(true);
      const params = currentBrand?.id ? { brandId: currentBrand.id } : {};
      const res = await api.get('/reports/export.csv', {
        params,
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `postpilot-report-${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      addToast(err.response?.data?.message || 'CSV export failed.', 'error');
    } finally {
      setExporting(false);
    }
  };

  const handleExportXlsx = async () => {
    try {
      setExporting(true);
      const params = currentBrand?.id ? { brandId: currentBrand.id } : {};
      const res = await api.get('/reports/export.xlsx', {
        params,
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `postpilot-report-${new Date().toISOString().split('T')[0]}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      addToast(err.response?.data?.message || 'Excel export failed.', 'error');
    } finally {
      setExporting(false);
    }
  };

  const kpis = metrics?.kpis || {
    totalPublications: 0,
    successCount: 0,
    failedCount: 0,
    successRate: 100,
    avgLatencySeconds: 0,
    activePlatformsCount: 0,
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-600/20 shrink-0">
              <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Reports & Analytics</h1>
              <p className="text-xs sm:text-sm text-slate-500">
                Performance telemetry, success rate analytics, and audit logs for{' '}
                <span className="font-semibold text-slate-700">{currentBrand?.name || 'All Brands'}</span>
              </p>
            </div>
          </div>
        </div>

        {/* Filter Controls & Exports */}
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value={7}>Last 7 Days</option>
            <option value={14}>Last 14 Days</option>
            <option value={30}>Last 30 Days</option>
            <option value={90}>Last 90 Days</option>
          </select>

          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-2 bg-white border border-slate-300 rounded-lg text-slate-600 hover:text-slate-900 shadow-sm transition disabled:opacity-50"
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>

          <div className="h-6 w-[1px] bg-slate-300" />

          <button
            onClick={handleExportCsv}
            disabled={exporting}
            className="flex items-center space-x-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-semibold transition shadow-sm"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>CSV Export</span>
          </button>

          <button
            onClick={handleExportXlsx}
            disabled={exporting}
            className="flex items-center space-x-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition shadow-sm"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Excel (.xlsx) Export</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Total Publications</span>
            <Share2 className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-3xl font-black text-slate-900">{kpis.totalPublications}</div>
          <div className="text-xs text-slate-500 flex items-center space-x-2">
            <span className="text-emerald-600 font-semibold">{kpis.successCount} Success</span>
            <span>•</span>
            <span className="text-rose-600 font-semibold">{kpis.failedCount} Failed</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Success Rate</span>
            <TrendingUp className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-3xl font-black text-slate-900">{kpis.successRate}%</div>
          <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-emerald-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(kpis.successRate, 100)}%` }}
            />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Average Latency</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-3xl font-black text-slate-900">{kpis.avgLatencySeconds}s</div>
          <p className="text-xs text-slate-500">Per network publish round-trip</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Active Networks</span>
            <CheckCircle2 className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-3xl font-black text-slate-900">{kpis.activePlatformsCount || 8}</div>
          <p className="text-xs text-slate-500">Facebook, IG, LinkedIn, X & more</p>
        </div>
      </div>

      {/* Main Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Daily Volume Trend (Area Chart) */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900">Publishing Volume Trend</h3>
              <p className="text-xs text-slate-500">Daily success vs failure volume across lookback period</p>
            </div>
          </div>

          <div className="h-72 w-full pt-4">
            {metrics?.timeSeries?.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={metrics.timeSeries}>
                  <defs>
                    <linearGradient id="colorSuccess" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorFailed" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      borderRadius: '8px',
                      color: '#fff',
                      border: 'none',
                    }}
                  />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="success"
                    name="Success"
                    stroke="#10b981"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorSuccess)"
                  />
                  <Area
                    type="monotone"
                    dataKey="failed"
                    name="Failed"
                    stroke="#ef4444"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorFailed)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 text-sm space-y-2">
                <BarChart3 className="w-8 h-8 opacity-40" />
                <p>No publication history recorded in this date range.</p>
              </div>
            )}
          </div>
        </div>

        {/* Platform Breakdown (Bar Chart) */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div>
            <h3 className="text-base font-bold text-slate-900">Platform Distribution</h3>
            <p className="text-xs text-slate-500">Total posts published per social network</p>
          </div>

          <div className="h-72 w-full pt-4">
            {metrics?.platformBreakdown?.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={metrics.platformBreakdown}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="platform" tick={{ fontSize: 10, fill: '#64748b' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      borderRadius: '8px',
                      color: '#fff',
                      border: 'none',
                    }}
                  />
                  <Bar dataKey="total" name="Posts" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 text-sm space-y-2">
                <Share2 className="w-8 h-8 opacity-40" />
                <p>No platform distribution data available.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Execution Logs Section (Report Sheet Mirror) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Execution Audit Logs</h3>
            <p className="text-xs text-slate-500">
              Live record of all platform publish attempts matching the Google Sheets Report Sheet contract
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search post ID or topic..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchLogs(1)}
                className="pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 w-56"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">All Statuses</option>
              <option value="SUCCESS">Success</option>
              <option value="FAILED">Failed</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border border-slate-200 rounded-xl overflow-hidden">
            <thead className="bg-slate-50 text-slate-700 uppercase tracking-wider font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Post ID</th>
                <th className="py-3 px-4">Client / Brand</th>
                <th className="py-3 px-4">Topic</th>
                <th className="py-3 px-4">Platform</th>
                <th className="py-3 px-4">Scheduled (Local)</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Latency</th>
                <th className="py-3 px-4 text-right">Permalink</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-600">
              {logs.length > 0 ? (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50 transition">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">{log.customId}</td>
                    <td className="py-3 px-4 font-medium text-slate-800">{log.clientName}</td>
                    <td className="py-3 px-4 truncate max-w-[150px]">{log.topic || '—'}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded font-bold text-[10px] uppercase bg-slate-100 text-slate-800">
                        {log.platform}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {log.scheduledLocal ? new Date(log.scheduledLocal).toLocaleString() : '—'}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold ${
                          log.status === 'SUCCESS'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {log.status === 'SUCCESS' ? (
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                        ) : (
                          <AlertTriangle className="w-3 h-3 mr-1" />
                        )}
                        {log.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-500">
                      {log.latencySeconds ? `${log.latencySeconds}s` : '—'}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {log.platformPostUrl ? (
                        <a
                          href={log.platformPostUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center space-x-1 text-indigo-600 hover:text-indigo-800 font-semibold"
                        >
                          <span>View</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    No execution log records found. Run a publishing job to populate this report.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {logMeta.pages > 1 && (
          <div className="flex items-center justify-between text-xs text-slate-500 pt-2">
            <span>
              Showing {logs.length} of {logMeta.total} entries
            </span>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => fetchLogs(logMeta.page - 1)}
                disabled={logMeta.page <= 1}
                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 rounded disabled:opacity-40"
              >
                Previous
              </button>
              <span>
                Page {logMeta.page} of {logMeta.pages}
              </span>
              <button
                onClick={() => fetchLogs(logMeta.page + 1)}
                disabled={logMeta.page >= logMeta.pages}
                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 rounded disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
