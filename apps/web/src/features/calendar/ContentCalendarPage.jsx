import React, { useState, useEffect } from 'react';
import apiClient from '../../api/client.js';
import { useBrand } from '../../context/BrandContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../components/Toast.jsx';
import Modal from '../../components/Modal.jsx';
import { DateTime } from 'luxon';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  Globe,
  Filter,
  CheckCircle2,
  XCircle,
  Copy,
  Trash2,
  Send,
  Eye,
} from 'lucide-react';

export default function ContentCalendarPage() {
  const { selectedBrand } = useBrand();
  const { user } = useAuth();

  const [currentDate, setCurrentDate] = useState(DateTime.now());
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [useBrandTimezone, setUseBrandTimezone] = useState(true);

  // Selected post for modal
  const [activePost, setActivePost] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchCalendarPosts = async () => {
    setLoading(true);
    try {
      const startUtc = currentDate.startOf('month').minus({ days: 7 }).toUTC().toISO();
      const endUtc = currentDate.endOf('month').plus({ days: 7 }).toUTC().toISO();

      const params = { startUtc, endUtc };
      if (selectedBrand) params.brandId = selectedBrand.id;

      const { data } = await apiClient.get('/posts/calendar', { params });
      setPosts(data.data || []);
    } catch (err) {
      console.warn('Failed to load calendar posts:', err.message);
      setPosts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCalendarPosts();
  }, [currentDate, selectedBrand]);

  const { addToast } = useToast();

  const handleApprove = async (postId) => {
    setActionLoading(true);
    try {
      await apiClient.post(`/posts/${postId}/approve`);
      addToast('Post approved successfully!', 'success');
      setActivePost(null);
      fetchCalendarPosts();
    } catch (err) {
      addToast(err.response?.data?.message || 'Approval failed', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (postId) => {
    setActionLoading(true);
    try {
      await apiClient.post(`/posts/${postId}/reject`, { rejectionReason: 'Revision requested by reviewer' });
      addToast('Post rejected and returned for revision.', 'info');
      setActivePost(null);
      fetchCalendarPosts();
    } catch (err) {
      addToast(err.response?.data?.message || 'Rejection failed', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handlePublishNow = async (post) => {
    if (!selectedBrand?.id && !post.brandId) {
      addToast('No brand selected for publication', 'error');
      return;
    }
    setActionLoading(true);
    try {
      await apiClient.post('/publish/enqueue', {
        brandId: post.brandId || post.brand?.id || selectedBrand?.id,
        isImmediate: true,
        rows: [
          {
            postId: post.customId,
            topic: post.topic,
            caption: post.caption,
            platforms: (post.platforms || []).map((pl) => pl.platform || pl),
            scheduledDate: DateTime.now().toFormat('yyyy-MM-dd'),
            scheduledTime: DateTime.now().toFormat('HH:mm'),
            timezone: post.timezone || selectedBrand?.defaultTimezone || 'Asia/Kolkata',
            mediaUrls: post.mediaUrls || [],
            isImmediate: true,
          },
        ],
      });
      await apiClient.post('/publish/trigger-n8n-sync').catch(() => {});
      addToast('Post enqueued for delivery to social networks!', 'success');
      setPosts((prev) =>
        prev.map((p) =>
          p.id === post.id || p.customId === post.customId
            ? { ...p, status: 'QUEUED' }
            : p
        )
      );
      setActivePost(null);
      await fetchCalendarPosts();
    } catch (err) {
      addToast(err.response?.data?.message || 'Publishing failed', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Generate calendar days for current month view
  const startOfMonth = currentDate.startOf('month');
  const endOfMonth = currentDate.endOf('month');
  const startDayOfWeek = startOfMonth.weekday; // 1 = Monday, 7 = Sunday

  const days = [];
  // Pad previous month days
  for (let i = startDayOfWeek - 1; i >= 1; i--) {
    days.push({
      date: startOfMonth.minus({ days: i }),
      isCurrentMonth: false,
    });
  }
  // Current month days
  for (let i = 0; i < endOfMonth.day; i++) {
    days.push({
      date: startOfMonth.plus({ days: i }),
      isCurrentMonth: true,
    });
  }
  // Pad next month days to complete 35 or 42 grid cells
  const remaining = 35 - days.length > 0 ? 35 - days.length : 42 - days.length;
  for (let i = 1; i <= remaining; i++) {
    days.push({
      date: endOfMonth.plus({ days: i }),
      isCurrentMonth: false,
    });
  }

  const getStatusBadge = (status) => {
    switch (status) {
      case 'PUBLISHED':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'SCHEDULED':
        return 'bg-indigo-100 text-indigo-800 border-indigo-200';
      case 'QUEUED':
      case 'PUBLISHING':
        return 'bg-amber-100 text-amber-800 border-amber-200 animate-pulse';
      case 'FAILED':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'PENDING_APPROVAL':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const canApprove = ['SUPER_ADMIN', 'AGENCY_ADMIN', 'BRAND_MANAGER', 'CLIENT_VIEWER'].includes(user?.role);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-5 sm:space-y-6 animate-fade-in">
      {/* Calendar Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Content Calendar</h1>
          <p className="text-slate-500 text-xs sm:text-sm mt-1">
            Visual schedule of posts across all connected networks and timezones.
          </p>
        </div>

        {/* Controls */}
        <div className="flex items-center space-x-3">
          {/* Timezone Toggle */}
          <div className="flex items-center bg-white p-1 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 shadow-sm">
            <button
              onClick={() => setUseBrandTimezone(true)}
              className={`px-3 py-1.5 rounded-lg transition ${
                useBrandTimezone ? 'bg-indigo-600 text-white shadow-sm' : 'hover:text-slate-900'
              }`}
            >
              Brand Time ({selectedBrand?.defaultTimezone || 'IST'})
            </button>
            <button
              onClick={() => setUseBrandTimezone(false)}
              className={`px-3 py-1.5 rounded-lg transition ${
                !useBrandTimezone ? 'bg-indigo-600 text-white shadow-sm' : 'hover:text-slate-900'
              }`}
            >
              My Local Time
            </button>
          </div>

          {/* Month Navigation */}
          <div className="flex items-center space-x-1 bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
            <button
              onClick={() => setCurrentDate(currentDate.minus({ months: 1 }))}
              className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 transition"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 text-xs font-bold text-slate-800">
              {currentDate.toFormat('MMMM yyyy')}
            </span>
            <button
              onClick={() => setCurrentDate(currentDate.plus({ months: 1 }))}
              className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 transition"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Weekday Columns Header */}
      <div className="grid grid-cols-7 gap-px bg-slate-200 rounded-2xl overflow-hidden border border-slate-200 shadow-sm text-center text-xs font-bold text-slate-600">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
          <div key={day} className="bg-slate-50 py-3 uppercase tracking-wider text-[11px]">
            {day}
          </div>
        ))}

        {/* Calendar Grid Cells */}
        {days.map((d, index) => {
          const dateStr = d.date.toFormat('yyyy-MM-dd');
          const dayPosts = posts.filter((p) => {
            const postDate = useBrandTimezone
              ? DateTime.fromISO(p.scheduledUtc).setZone(p.timezone || selectedBrand?.defaultTimezone).toFormat('yyyy-MM-dd')
              : DateTime.fromISO(p.scheduledUtc).toLocal().toFormat('yyyy-MM-dd');
            return postDate === dateStr;
          });

          const isToday = d.date.toFormat('yyyy-MM-dd') === DateTime.now().toFormat('yyyy-MM-dd');

          return (
            <div
              key={index}
              className={`bg-white min-h-[120px] p-2 flex flex-col justify-between transition ${
                !d.isCurrentMonth ? 'bg-slate-50/60 text-slate-400' : 'text-slate-800'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span
                  className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full ${
                    isToday ? 'bg-indigo-600 text-white' : ''
                  }`}
                >
                  {d.date.day}
                </span>

                {dayPosts.length > 0 && (
                  <span className="text-[10px] text-slate-400 font-semibold">{dayPosts.length} posts</span>
                )}
              </div>

              {/* Day Posts List */}
              <div className="space-y-1 flex-1 overflow-y-auto max-h-[85px]">
                {dayPosts.map((post) => {
                  const displayTime = useBrandTimezone
                    ? DateTime.fromISO(post.scheduledUtc).setZone(post.timezone || selectedBrand?.defaultTimezone).toFormat('HH:mm')
                    : DateTime.fromISO(post.scheduledUtc).toLocal().toFormat('HH:mm');

                  return (
                    <div
                      key={post.id}
                      onClick={() => setActivePost(post)}
                      className="cursor-pointer p-1.5 rounded-lg border text-[11px] leading-tight hover:shadow-md transition truncate space-y-0.5 bg-indigo-50/40 border-indigo-200"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-indigo-900">{displayTime}</span>
                        <span className={`text-[9px] px-1 py-0.2 rounded font-bold uppercase ${getStatusBadge(post.status)}`}>
                          {post.status.replace('_', ' ')}
                        </span>
                      </div>
                      <p className="truncate text-slate-700 font-medium">{post.topic || post.caption}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Post Details & Approval Modal */}
      <Modal
        isOpen={!!activePost}
        onClose={() => setActivePost(null)}
        title={activePost ? `Post Details (${activePost.customId})` : 'Post Details'}
        maxWidth="max-w-xl"
      >
        {activePost && (
          <div className="space-y-5 text-xs">
            {/* Status & Timing */}
            <div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-200">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Status</span>
                <span className={`font-bold px-2 py-0.5 rounded text-[11px] uppercase ${getStatusBadge(activePost.status)}`}>
                  {activePost.status.replace('_', ' ')}
                </span>
              </div>

              <div className="text-right">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Scheduled UTC</span>
                <span className="font-semibold text-slate-800">
                  {DateTime.fromISO(activePost.scheduledUtc).toFormat('dd MMM yyyy, HH:mm')} UTC
                </span>
              </div>
            </div>

            {/* Caption */}
            <div>
              <span className="text-slate-500 font-bold block mb-1">Caption</span>
              <p className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-800 whitespace-pre-line leading-relaxed">
                {activePost.caption}
              </p>
            </div>

            {/* Media Attachment */}
            {activePost.mediaUrls?.length > 0 && (
              <div>
                <span className="text-slate-500 font-bold block mb-1">Media</span>
                <img
                  src={activePost.mediaUrls[0]}
                  alt=""
                  className="rounded-xl w-full max-h-48 object-cover border border-slate-200"
                />
              </div>
            )}

            {/* Target Networks */}
            <div>
              <span className="text-slate-500 font-bold block mb-1">Target Networks</span>
              <div className="flex flex-wrap gap-1.5">
                {activePost.platforms?.map((p) => (
                  <span
                    key={p.platform}
                    className="px-2.5 py-1 bg-slate-100 text-slate-700 font-semibold rounded-lg text-[10px] uppercase"
                  >
                    {p.platform}
                  </span>
                ))}
              </div>
            </div>

            {/* Approval Actions */}
            {activePost.status === 'PENDING_APPROVAL' && canApprove && (
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end space-x-2">
                <button
                  onClick={() => handleReject(activePost.id)}
                  disabled={actionLoading}
                  className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-700 font-bold rounded-xl transition"
                >
                  Reject with Reason
                </button>
                <button
                  onClick={() => handleApprove(activePost.id)}
                  disabled={actionLoading}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-sm transition"
                >
                  Approve & Schedule
                </button>
              </div>
            )}

            {/* Scheduled Post Quick Action */}
            {activePost.status === 'SCHEDULED' && (
              <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[11px] text-slate-500 font-medium">
                  Automated by n8n or publish instantly:
                </span>
                <button
                  onClick={() => handlePublishNow(activePost)}
                  disabled={actionLoading}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-sm transition flex items-center space-x-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Publish Now</span>
                </button>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
