import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Plus,
  ArrowRight,
  Send,
  ShieldAlert,
  ChevronRight,
  TrendingUp,
  Share2,
  FileCheck,
  Globe,
  Sliders,
  Check,
} from 'lucide-react';
import { DateTime } from 'luxon';
import { useBrand } from '../../context/BrandContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import apiClient from '../../api/client.js';
import { CardSkeleton, TableRowSkeleton } from '../../components/Skeleton.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import AccessibleDialog from '../../components/AccessibleDialog.jsx';
import { useToast } from '../../components/Toast.jsx';

const PLATFORM_ICONS = {
  FACEBOOK: 'FB',
  INSTAGRAM: 'IG',
  LINKEDIN: 'LI',
  TWITTER: 'X',
  YOUTUBE: 'YT',
  TIKTOK: 'TT',
  PINTEREST: 'PIN',
};

export default function DashboardPage() {
  const navigate = useNavigate();
  const { selectedBrand } = useBrand();
  const { currentRole } = useAuth();
  const { addToast } = useToast();

  const [timeRange, setTimeRange] = useState('30d');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState(new Date());

  // Real API State
  const [metrics, setMetrics] = useState(null);
  const [attention, setAttention] = useState(null);
  const [upcoming, setUpcoming] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [healthData, setHealthData] = useState([]);

  // Quick Composer State
  const [quickCaption, setQuickCaption] = useState('');
  const [quickPlatforms, setQuickPlatforms] = useState(['FACEBOOK', 'INSTAGRAM']);
  const [quickScheduleTime, setQuickScheduleTime] = useState('OPTIMAL');
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [publishingQuick, setPublishingQuick] = useState(false);

  const isClientViewer = currentRole === 'CLIENT_VIEWER';

  const fetchDashboard = useCallback(async () => {
    try {
      const brandId = selectedBrand?.id;
      const [mRes, aRes, uRes, rRes, hRes] = await Promise.all([
        apiClient.get('/dashboard/metrics', { params: { brandId, timeRange } }),
        apiClient.get('/dashboard/attention-summary', { params: { brandId } }),
        apiClient.get('/dashboard/upcoming', { params: { brandId, limit: 6 } }),
        apiClient.get('/dashboard/recent-activity', { params: { brandId, limit: 6 } }),
        apiClient.get('/dashboard/connections-health', { params: { brandId } }),
      ]);

      setMetrics(mRes.data?.data || null);
      setAttention(aRes.data?.data || null);
      setUpcoming(uRes.data?.data || []);
      setRecentActivity(rRes.data?.data || []);
      setHealthData(hRes.data?.data?.channels || []);
      setLastRefreshed(new Date());
    } catch (err) {
      console.warn('Dashboard fetch failure:', err.message);
      addToast('Failed to load recent dashboard metrics. Retrying in background.', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedBrand?.id, timeRange, addToast]);

  useEffect(() => {
    setLoading(true);
    fetchDashboard();
  }, [fetchDashboard]);

  const handleManualRefresh = () => {
    setRefreshing(true);
    fetchDashboard();
  };

  const handlePlatformToggle = (platform) => {
    setQuickPlatforms((prev) =>
      prev.includes(platform) ? prev.filter((p) => p !== platform) : [...prev, platform]
    );
  };

  const handleQuickSubmit = async () => {
    if (!quickCaption.trim()) {
      addToast('Please enter a caption for your post.', 'error');
      return;
    }
    if (quickPlatforms.length === 0) {
      addToast('Please select at least one publishing destination.', 'error');
      return;
    }

    setPublishingQuick(true);
    try {
      const scheduledDate = DateTime.now().toFormat('yyyy-MM-dd');
      const scheduledTime =
        quickScheduleTime === 'NOW'
          ? DateTime.now().plus({ minutes: 2 }).toFormat('HH:mm')
          : '18:30';

      const payload = {
        brandId: selectedBrand?.id,
        topic: 'Quick Post',
        caption: quickCaption.trim(),
        postType: 'IMAGE',
        mediaUrls: [
          'https://images.unsplash.com/photo-1501004318641-b39e6451bec6?auto=format&fit=crop&w=1200&q=80',
        ],
        scheduledDate,
        scheduledTime,
        timezone: selectedBrand?.defaultTimezone || 'Asia/Kolkata',
        platforms: quickPlatforms.map((p) => ({ platform: p })),
        status: quickScheduleTime === 'NOW' ? 'QUEUED' : 'SCHEDULED',
      };

      await apiClient.post('/posts', payload);
      addToast(
        quickScheduleTime === 'NOW'
          ? 'Post enqueued for immediate delivery!'
          : `Post scheduled for ${scheduledDate} at ${scheduledTime}`,
        'success'
      );
      setQuickCaption('');
      setConfirmModalOpen(false);
      fetchDashboard();
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to submit post.', 'error');
    } finally {
      setPublishingQuick(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* 1. Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Publishing Overview
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time pipeline orchestration, approval queue, and connected social channels.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Time Range Selector */}
          <div className="flex items-center bg-white border border-slate-200 rounded-xl p-0.5 shadow-2xs">
            {['7d', '30d', '90d'].map((range) => (
              <button
                key={range}
                type="button"
                onClick={() => setTimeRange(range)}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition ${
                  timeRange === range
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {range.toUpperCase()}
              </button>
            ))}
          </div>

          {/* Last Refreshed & Manual Refresh */}
          <button
            type="button"
            onClick={handleManualRefresh}
            disabled={refreshing}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl shadow-2xs transition disabled:opacity-50"
            title={`Last updated ${DateTime.fromJSDate(lastRefreshed).toFormat('HH:mm:ss')}`}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-indigo-600' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          {!isClientViewer && (
            <button
              type="button"
              onClick={() => navigate('/composer')}
              className="flex items-center space-x-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Post</span>
            </button>
          )}

          <Link
            to="/calendar"
            className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl transition"
          >
            View Calendar
          </Link>
        </div>
      </div>

      {/* 2. Attention Summary Banner */}
      {attention?.hasIssues && (
        <div
          role="region"
          aria-label="Attention Required"
          className="bg-amber-50 border border-amber-200 rounded-2xl p-4 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3 animate-in fade-in"
        >
          <div className="flex items-start space-x-3">
            <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <h2 className="text-xs font-bold text-amber-900 uppercase tracking-wider">
                Action Required
              </h2>
              <p className="text-xs text-amber-800 mt-0.5">
                {attention.failedPosts.length > 0 &&
                  `${attention.failedPosts.length} post(s) failed delivery. `}
                {attention.awaitingApproval.length > 0 &&
                  `${attention.awaitingApproval.length} draft(s) awaiting your team approval. `}
                {attention.expiringAccounts.length > 0 &&
                  `${attention.expiringAccounts.length} channel(s) require reconnection.`}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            {attention.failedPosts.length > 0 && (
              <Link
                to="/reports"
                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl transition"
              >
                Inspect Failures
              </Link>
            )}
            {attention.awaitingApproval.length > 0 && (
              <Link
                to="/calendar"
                className="px-3 py-1.5 bg-white border border-amber-300 text-amber-900 text-xs font-bold rounded-xl hover:bg-amber-100 transition"
              >
                Review Approval Queue
              </Link>
            )}
          </div>
        </div>
      )}

      {/* 3. Authoritative KPI Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        {loading ? (
          <CardSkeleton count={6} />
        ) : (
          <>
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                Scheduled
              </span>
              <p className="text-2xl font-black text-slate-900">
                {metrics?.scheduled ?? '—'}
              </p>
              <span className="text-[10px] text-slate-400 mt-1 block">Due in pipeline</span>
            </div>

            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                Published
              </span>
              <p className="text-2xl font-black text-emerald-600">
                {metrics?.published ?? '—'}
              </p>
              <span className="text-[10px] text-slate-400 mt-1 block">{metrics?.period}</span>
            </div>

            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                Failed
              </span>
              <p className={`text-2xl font-black ${metrics?.failed > 0 ? 'text-red-600' : 'text-slate-900'}`}>
                {metrics?.failed ?? '—'}
              </p>
              <span className="text-[10px] text-slate-400 mt-1 block">Requires retry</span>
            </div>

            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                Approval Queue
              </span>
              <p className="text-2xl font-black text-indigo-600">
                {metrics?.pendingApproval ?? '—'}
              </p>
              <span className="text-[10px] text-slate-400 mt-1 block">Draft reviews</span>
            </div>

            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                Success Rate
              </span>
              <p className="text-2xl font-black text-slate-900">
                {metrics?.publishSuccessRate != null ? `${metrics.publishSuccessRate}%` : '100%'}
              </p>
              <span className="text-[10px] text-emerald-600 font-semibold mt-1 block">Delivery ratio</span>
            </div>

            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                Channels
              </span>
              <p className="text-2xl font-black text-slate-900">
                {metrics?.connectedChannels ?? '—'}
              </p>
              <span className="text-[10px] text-slate-400 mt-1 block">Active destinations</span>
            </div>
          </>
        )}
      </div>

      {/* 4. Split Section: Upcoming Content & Quick Scheduler */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Upcoming Content */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-2xs p-5 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Upcoming Content Queue</h2>
              <p className="text-xs text-slate-500">Authoritative publishing queue sorted by execution time.</p>
            </div>
            <Link
              to="/calendar"
              className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center space-x-1"
            >
              <span>View Full Calendar</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {upcoming.length === 0 ? (
            <EmptyState
              title="No upcoming posts scheduled"
              description="Your scheduling queue is currently clear for this brand."
              actionLabel="Schedule First Post"
              onAction={() => navigate('/composer')}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100">
                    <th className="py-2.5 px-3">Post ID / Topic</th>
                    <th className="py-2.5 px-3">Caption Preview</th>
                    <th className="py-2.5 px-3">Channels</th>
                    <th className="py-2.5 px-3">Scheduled Time</th>
                    <th className="py-2.5 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {upcoming.map((p) => (
                    <tr key={p.id || p.customId} className="hover:bg-slate-50/70 transition">
                      <td className="py-3 px-3 font-semibold text-slate-900">
                        <div>{p.topic || 'Botanical Care'}</div>
                        <span className="text-[10px] text-slate-400 font-normal">{p.customId}</span>
                      </td>
                      <td className="py-3 px-3 text-slate-600 max-w-xs truncate">
                        {p.caption}
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex items-center space-x-1">
                          {(p.platforms || ['FACEBOOK', 'INSTAGRAM']).map((pl) => {
                            const name = pl.platform || pl;
                            return (
                              <span
                                key={name}
                                className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-slate-100 text-slate-700"
                              >
                                {PLATFORM_ICONS[name] || name}
                              </span>
                            );
                          })}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-slate-700 whitespace-nowrap">
                        <div className="font-semibold">{p.scheduledTime || '18:30'}</div>
                        <div className="text-[10px] text-slate-400">{p.scheduledDate || 'Today'}</div>
                      </td>
                      <td className="py-3 px-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                          {p.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right 1 Col: Quick Post Composer */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-5 space-y-4">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Quick Post Composer</h2>
            <p className="text-xs text-slate-500">Draft or enqueue a post with validation checks.</p>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              setConfirmModalOpen(true);
            }}
            className="space-y-3"
          >
            <div>
              <label htmlFor="quick-caption" className="block text-xs font-bold text-slate-700 mb-1">
                Post Caption
              </label>
              <textarea
                id="quick-caption"
                rows={4}
                required
                disabled={isClientViewer}
                value={quickCaption}
                onChange={(e) => setQuickCaption(e.target.value)}
                placeholder="Share botanical insights, tips, or promotions..."
                className="w-full text-xs p-3 bg-slate-50 hover:bg-slate-100/50 focus:bg-white rounded-xl border border-slate-300 focus:border-indigo-600 focus:outline-none transition resize-none"
              />
              <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1">
                <span>{quickCaption.length} characters</span>
                <span>Max: 2,200 (IG) / 63,206 (FB)</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Publishing Channels</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'FACEBOOK', label: 'Facebook Page' },
                  { id: 'INSTAGRAM', label: 'Instagram Business' },
                ].map((channel) => (
                  <button
                    key={channel.id}
                    type="button"
                    disabled={isClientViewer}
                    onClick={() => handlePlatformToggle(channel.id)}
                    className={`flex items-center justify-between p-2 rounded-xl text-xs font-semibold border transition ${
                      quickPlatforms.includes(channel.id)
                        ? 'bg-indigo-50 border-indigo-300 text-indigo-900'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <span>{channel.label}</span>
                    {quickPlatforms.includes(channel.id) && (
                      <Check className="w-3.5 h-3.5 text-indigo-600" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Schedule Strategy</label>
              <select
                value={quickScheduleTime}
                onChange={(e) => setQuickScheduleTime(e.target.value)}
                disabled={isClientViewer}
                className="w-full text-xs px-3 py-2 bg-slate-50 rounded-xl border border-slate-300 focus:border-indigo-600 focus:outline-none"
              >
                <option value="OPTIMAL">Optimal Peak Engagement (18:30)</option>
                <option value="NOW">Immediate Queue Dispatch (Now)</option>
              </select>
              <p className="text-[10px] text-slate-400 mt-1">
                Optimal time uses your brand's historical follower activity in {selectedBrand?.defaultTimezone || 'Asia/Kolkata'}.
              </p>
            </div>

            <button
              type="submit"
              disabled={isClientViewer || !quickCaption.trim()}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition disabled:opacity-50"
            >
              Review & Schedule
            </button>
          </form>
        </div>
      </div>

      {/* 5. Connection Health Probes (No Ports, No Internal URLs) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-5 space-y-4">
        <div>
          <h2 className="text-sm font-bold text-slate-900">Integration Health Probes</h2>
          <p className="text-xs text-slate-500">Live operational status across verified channel adapters.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {healthData.map((item) => {
            const isHealthy = item.status === 'HEALTHY';
            const isDegraded = item.status === 'DEGRADED';
            const isPaused = item.status === 'PAUSED';

            return (
              <div
                key={item.name}
                className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col justify-between space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900">{item.name}</span>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      isHealthy
                        ? 'bg-emerald-100 text-emerald-800'
                        : isPaused
                        ? 'bg-amber-100 text-amber-800'
                        : isDegraded
                        ? 'bg-red-100 text-red-800'
                        : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {item.status}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">{item.details}</p>
                <div className="text-[9px] text-slate-400 pt-1 border-t border-slate-200/60">
                  Adapter: {item.service}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Confirmation Modal for Quick Post */}
      <AccessibleDialog
        isOpen={confirmModalOpen}
        onClose={() => setConfirmModalOpen(false)}
        title="Confirm Post Publication"
        description="Verify publishing parameters before queueing."
      >
        <div className="space-y-4 text-xs">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
            <div>
              <span className="text-slate-400 font-semibold block">Brand Scope:</span>
              <span className="text-slate-800 font-bold">{selectedBrand?.name || 'Flower plant'}</span>
            </div>
            <div>
              <span className="text-slate-400 font-semibold block">Destinations:</span>
              <span className="text-slate-800 font-bold">{quickPlatforms.join(', ')}</span>
            </div>
            <div>
              <span className="text-slate-400 font-semibold block">Timing:</span>
              <span className="text-slate-800 font-bold">
                {quickScheduleTime === 'NOW' ? 'Immediate Enqueue (Within 2 mins)' : 'Today at 18:30'} ({selectedBrand?.defaultTimezone || 'Asia/Kolkata'})
              </span>
            </div>
            <div>
              <span className="text-slate-400 font-semibold block">Caption:</span>
              <p className="text-slate-700 italic mt-0.5 line-clamp-3">"{quickCaption}"</p>
            </div>
          </div>

          <div className="flex items-center justify-end space-x-3 pt-2">
            <button
              type="button"
              onClick={() => setConfirmModalOpen(false)}
              className="px-4 py-2 font-semibold text-slate-600 hover:text-slate-800 transition"
            >
              Back to Edit
            </button>
            <button
              type="button"
              disabled={publishingQuick}
              onClick={handleQuickSubmit}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-xs transition disabled:opacity-50"
            >
              {publishingQuick ? 'Enqueueing...' : 'Confirm & Schedule'}
            </button>
          </div>
        </div>
      </AccessibleDialog>
    </div>
  );
}
