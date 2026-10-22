import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import apiClient from '../../api/client.js';
import { useBrand } from '../../context/BrandContext.jsx';
import { PLATFORM_SPECS } from '@postpilot/shared';
import { DateTime } from 'luxon';
import {
  Send,
  Calendar,
  Clock,
  Globe,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Eye,
  Layers,
  MessageSquare,
  Link2,
  Hash,
  Share2,
  Plus,
} from 'lucide-react';

const AVAILABLE_PLATFORMS = [
  { key: 'FACEBOOK', name: 'Facebook' },
  { key: 'INSTAGRAM', name: 'Instagram' },
  { key: 'LINKEDIN', name: 'LinkedIn' },
  { key: 'TWITTER', name: 'X' },
  { key: 'YOUTUBE', name: 'YouTube' },
  { key: 'TIKTOK', name: 'TikTok' },
  { key: 'PINTEREST', name: 'Pinterest' },
];

const POST_TYPES = [
  { key: 'IMAGE', label: 'Single Image' },
  { key: 'VIDEO', label: 'Video Post' },
  { key: 'CAROUSEL', label: 'Carousel' },
  { key: 'TEXT', label: 'Text Only' },
  { key: 'REEL', label: 'Instagram Reel' },
  { key: 'SHORT', label: 'YouTube Short' },
];

export default function PostComposerPage() {
  const navigate = useNavigate();
  const { selectedBrand, brands } = useBrand();

  const [selectedBrandIds, setSelectedBrandIds] = useState([]);
  const [selectedPlatforms, setSelectedPlatforms] = useState(['FACEBOOK', 'INSTAGRAM', 'LINKEDIN']);
  const [activeTabPlatform, setActiveTabPlatform] = useState('ALL');
  const [previewPlatform, setPreviewPlatform] = useState('FACEBOOK');

  // Sync selectedBrandIds when brands load
  useEffect(() => {
    if (selectedBrandIds.length === 0) {
      if (selectedBrand) {
        setSelectedBrandIds([selectedBrand.id]);
      } else if (brands.length > 0) {
        setSelectedBrandIds([brands[0].id]);
      }
    }
  }, [selectedBrand, brands]);

  const toggleBrandSelection = (brandId) => {
    if (selectedBrandIds.includes(brandId)) {
      if (selectedBrandIds.length > 1) {
        setSelectedBrandIds(selectedBrandIds.filter((id) => id !== brandId));
      }
    } else {
      setSelectedBrandIds([...selectedBrandIds, brandId]);
    }
  };

  const handleSelectAllBrands = () => {
    if (selectedBrandIds.length === brands.length) {
      setSelectedBrandIds(selectedBrand ? [selectedBrand.id] : [brands[0]?.id]);
    } else {
      setSelectedBrandIds(brands.map((b) => b.id));
    }
  };

  // Form Fields
  const [postType, setPostType] = useState('IMAGE');
  const [topic, setTopic] = useState('');
  const [baseCaption, setBaseCaption] = useState('');
  const [platformOverrides, setPlatformOverrides] = useState({});
  const [hashtags, setHashtags] = useState('');
  const [firstComment, setFirstComment] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [mediaUrls, setMediaUrls] = useState([]);
  const [newMediaInput, setNewMediaInput] = useState('');

  // Schedule Fields
  const [scheduledDate, setScheduledDate] = useState(DateTime.now().plus({ days: 1 }).toFormat('yyyy-MM-dd'));
  const [scheduledTime, setScheduledTime] = useState('18:30');
  const [timezone, setTimezone] = useState(selectedBrand?.defaultTimezone || 'Asia/Kolkata');

  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);

  useEffect(() => {
    if (selectedBrand) {
      setTimezone(selectedBrand.defaultTimezone);
      if (selectedBrand.defaultHashtags && !hashtags) {
        setHashtags(selectedBrand.defaultHashtags);
      }
    }
  }, [selectedBrand]);

  const togglePlatform = (key) => {
    if (selectedPlatforms.includes(key)) {
      if (selectedPlatforms.length > 1) {
        setSelectedPlatforms(selectedPlatforms.filter((p) => p !== key));
        if (activeTabPlatform === key) setActiveTabPlatform('ALL');
        if (previewPlatform === key) setPreviewPlatform(selectedPlatforms[0]);
      }
    } else {
      setSelectedPlatforms([...selectedPlatforms, key]);
    }
  };

  const getEffectiveCaption = (platformKey) => {
    if (platformKey && platformOverrides[platformKey]) {
      return platformOverrides[platformKey];
    }
    return baseCaption;
  };

  // Timezone calculation
  const getDualTimes = () => {
    try {
      const brandDateTime = DateTime.fromISO(`${scheduledDate}T${scheduledTime}:00`, { zone: timezone });
      const viewerDateTime = brandDateTime.toLocal();

      return {
        brandTime: brandDateTime.toFormat('dd MMM yyyy, HH:mm (ZZZZ)'),
        viewerTime: viewerDateTime.toFormat('dd MMM yyyy, HH:mm (ZZZZ)'),
      };
    } catch {
      return { brandTime: 'Invalid date/time', viewerTime: '' };
    }
  };

  const { brandTime, viewerTime } = getDualTimes();

  const handleAddMediaUrl = () => {
    if (newMediaInput.trim() && newMediaInput.startsWith('http')) {
      setMediaUrls([...mediaUrls, newMediaInput.trim()]);
      setNewMediaInput('');
    }
  };

  const handleRemoveMedia = (index) => {
    setMediaUrls(mediaUrls.filter((_, idx) => idx !== index));
  };

  const handleSubmit = async (targetStatus) => {
    const targetBrandList = brands.filter((b) => selectedBrandIds.includes(b.id));
    if (targetBrandList.length === 0) {
      setStatusMessage({ type: 'error', text: 'Please select at least one target brand.' });
      return;
    }
    if (selectedPlatforms.length === 0) {
      setStatusMessage({ type: 'error', text: 'Please select at least one social media platform.' });
      return;
    }

    setLoading(true);
    setStatusMessage(null);

    const isImmediate = targetStatus === 'PUBLISH_NOW';
    const effectiveStatus = isImmediate ? 'SCHEDULED' : targetStatus;
    const finalDate = isImmediate ? DateTime.now().toFormat('yyyy-MM-dd') : scheduledDate;
    const finalTime = isImmediate ? DateTime.now().toFormat('HH:mm') : scheduledTime;

    const platformsPayload = selectedPlatforms.map((p) => ({
      platform: p,
      captionOverride: platformOverrides[p] || null,
      firstCommentOverride: p === 'INSTAGRAM' ? firstComment : null,
    }));

    const results = [];
    const errors = [];

    for (const b of targetBrandList) {
      const postPayload = {
        brandId: b.id,
        topic: topic?.trim() || null,
        caption: baseCaption || '',
        hashtags: hashtags?.trim() || null,
        firstComment: firstComment?.trim() || null,
        linkUrl: linkUrl?.trim() || null,
        postType,
        mediaUrls: mediaUrls || [],
        scheduledDate: finalDate,
        scheduledTime: finalTime,
        timezone: b.defaultTimezone || timezone || 'America/New_York',
        platforms: platformsPayload,
        status: effectiveStatus,
      };

      try {
        const { data } = await apiClient.post('/posts', postPayload);
        const createdPost = data.data;
        results.push({ brandName: b.name, customId: createdPost?.customId });

        // Trigger automated scheduler / n8n pipeline immediately
        if (effectiveStatus === 'SCHEDULED') {
          try {
            await apiClient.post('/publish/trigger-n8n-sync', {
              brandId: b.id,
              postId: createdPost?.customId,
              action: isImmediate ? 'IMMEDIATE_DISPATCH' : 'SCHEDULE_REGISTER',
            });
          } catch (syncErr) {
            // background sync
          }
        }
      } catch (err) {
        const errMsg = err.response?.data?.message || err.message;
        errors.push({ brandName: b.name, error: errMsg });
      }
    }

    if (results.length > 0) {
      const brandNames = results.map((r) => r.brandName).join(', ');
      setStatusMessage({
        success: true,
        text: isImmediate
          ? `Dispatched immediately across ${results.length} brand(s): ${brandNames}!`
          : `Post scheduled across ${results.length} brand(s) (${brandNames}) for ${finalDate} ${finalTime} (${selectedPlatforms.length} networks each)!`,
      });
      setTimeout(() => navigate('/calendar'), 2000);
    } else {
      setStatusMessage({
        success: false,
        text: `Failed to create posts: ${errors.map((e) => `${e.brandName}: ${e.error}`).join('; ')}`,
      });
    }
    setLoading(false);
  };

  const setQuickSchedule = (preset) => {
    const now = DateTime.now().setZone(timezone || 'America/New_York');
    if (preset === 'NOW') {
      setScheduledDate(now.toFormat('yyyy-MM-dd'));
      setScheduledTime(now.plus({ minutes: 2 }).toFormat('HH:mm'));
    } else if (preset === 'TODAY_EVENING') {
      setScheduledDate(now.toFormat('yyyy-MM-dd'));
      setScheduledTime('18:00');
    } else if (preset === 'TOMORROW_MORNING') {
      setScheduledDate(now.plus({ days: 1 }).toFormat('yyyy-MM-dd'));
      setScheduledTime('10:00');
    } else if (preset === 'TOMORROW_EVENING') {
      setScheduledDate(now.plus({ days: 1 }).toFormat('yyyy-MM-dd'));
      setScheduledTime('18:30');
    }
  };

  const currentPlatformLimit = PLATFORM_SPECS[previewPlatform]?.maxCaptionLength || 2200;
  const currentCaption = getEffectiveCaption(previewPlatform);
  const activePreviewBrand = brands.find((b) => selectedBrandIds.includes(b.id)) || selectedBrand || brands[0];

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Schedule a Post</h1>
            <span className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Automated Schedule Engine</span>
            </span>
          </div>
          <p className="text-slate-500 text-xs sm:text-sm mt-1">
            Configure multi-brand content, target client social networks, and set automated posting schedules with n8n execution.
          </p>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => handleSubmit('DRAFT')}
            disabled={loading}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition disabled:opacity-50"
          >
            Save Draft
          </button>
          <button
            onClick={() => handleSubmit('PENDING_APPROVAL')}
            disabled={loading}
            className="px-3 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-xl shadow-xs transition disabled:opacity-50"
          >
            Submit Approval
          </button>
          <button
            onClick={() => handleSubmit('PUBLISH_NOW')}
            disabled={loading}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm transition disabled:opacity-50 flex items-center space-x-1.5"
            title="Publish immediately to selected networks"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Publish Now</span>
          </button>
          <button
            onClick={() => handleSubmit('SCHEDULED')}
            disabled={loading}
            className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-sm transition disabled:opacity-50 flex items-center space-x-1.5"
            title="Schedule for selected date and time"
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Schedule Post</span>
          </button>
        </div>
      </div>

      {statusMessage && (
        <div
          className={`p-4 rounded-xl border flex items-center space-x-3 text-xs font-semibold ${
            statusMessage.success
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}
        >
          {statusMessage.success ? <CheckCircle2 className="w-5 h-5 text-emerald-600" /> : <AlertCircle className="w-5 h-5 text-red-600" />}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* 2-Column Composer Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Form Editor (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Target Brands (Multi-Brand Selection) */}
          <div className="bg-white p-6 rounded-2xl border-2 border-indigo-100 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-800 tracking-tight flex items-center space-x-2">
                  <Layers className="w-4 h-4 text-indigo-600" />
                  <span>Target Client Brands ({selectedBrandIds.length} of {brands.length} selected)</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">Select multiple brands to schedule or publish across all of them simultaneously.</p>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={handleSelectAllBrands}
                  className="text-xs font-bold text-indigo-600 hover:text-indigo-800 transition px-2.5 py-1 bg-indigo-50 rounded-lg hover:bg-indigo-100"
                >
                  {selectedBrandIds.length === brands.length ? 'Deselect All' : `Select All (${brands.length})`}
                </button>
                <span className="text-slate-300">|</span>
                <button
                  type="button"
                  onClick={() => setSelectedBrandIds(selectedBrand ? [selectedBrand.id] : (brands[0] ? [brands[0].id] : []))}
                  className="text-xs font-bold text-slate-400 hover:text-slate-600 transition"
                >
                  Reset
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
              {brands.map((b) => {
                const isSelected = selectedBrandIds.includes(b.id);
                return (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => toggleBrandSelection(b.id)}
                    className={`flex items-center justify-between p-3 rounded-xl border text-left transition ${
                      isSelected
                        ? 'border-indigo-500 bg-indigo-50/60 text-indigo-950 font-bold shadow-sm ring-2 ring-indigo-500/20'
                        : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <div className="min-w-0 pr-2">
                      <div className="text-xs truncate font-semibold">{b.name}</div>
                      <div className="text-[10px] text-slate-400 truncate">{b.defaultTimezone || 'UTC'}</div>
                    </div>
                    <div
                      className={`w-4 h-4 rounded-md border flex items-center justify-center flex-shrink-0 text-[10px] font-black ${
                        isSelected
                          ? 'bg-indigo-600 border-indigo-600 text-white'
                          : 'border-slate-300 bg-white text-transparent'
                      }`}
                    >
                      ✓
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 1. Target Platforms Selector - Client social media accounts checklist */}
          <div className="bg-white p-6 rounded-2xl border-2 border-dashed border-slate-300 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-800 tracking-tight">
                Client social media accounts
              </h3>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setSelectedPlatforms(AVAILABLE_PLATFORMS.map((p) => p.key))}
                  className="text-xs font-bold text-indigo-600 hover:text-indigo-800 transition"
                >
                  Select All
                </button>
                <span className="text-slate-300">|</span>
                <button
                  type="button"
                  onClick={() => setSelectedPlatforms([])}
                  className="text-xs font-bold text-slate-400 hover:text-slate-600 transition"
                >
                  Clear
                </button>
              </div>
            </div>

            <div className="flex flex-wrap gap-2.5">
              {AVAILABLE_PLATFORMS.map((platform) => {
                const isSelected = selectedPlatforms.includes(platform.key);
                return (
                  <button
                    key={platform.key}
                    type="button"
                    onClick={() => togglePlatform(platform.key)}
                    className={`flex items-center space-x-1.5 px-4 py-2.5 rounded-xl text-xs transition border ${
                      isSelected
                        ? 'border-[#bd7d70] bg-[#fbf0ec] text-[#5e2b21] font-bold shadow-sm ring-2 ring-[#e4a89b]/40'
                        : 'border-[#e8cecb] bg-[#fbf0ec]/40 text-[#85534a] hover:bg-[#fbf0ec] hover:border-[#bd7d70]'
                    }`}
                  >
                    <span>{platform.name}</span>
                    {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-[#bd7d70]" />}
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] text-slate-400">
              Checklist selected by employee. Posts will only be dispatched and published to checked networks by n8n.
            </p>
          </div>

          {/* 2. Post Type & Topic */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Post Type</label>
                <select
                  value={postType}
                  onChange={(e) => setPostType(e.target.value)}
                  className="w-full text-xs py-2.5 px-3 bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-600 font-semibold text-slate-800"
                >
                  {POST_TYPES.map((t) => (
                    <option key={t.key} value={t.key}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Campaign / Topic</label>
                <input
                  type="text"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="e.g. Diwali Mega Sale 2026"
                  className="w-full text-xs py-2.5 px-3 bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-600 font-medium text-slate-800"
                />
              </div>
            </div>
          </div>

          {/* 3. Caption with Per-Platform Overrides */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Post Caption
              </label>

              {/* Character Limit Indicator */}
              <span
                className={`text-[11px] font-bold ${
                  currentCaption.length > currentPlatformLimit ? 'text-red-600' : 'text-slate-400'
                }`}
              >
                {currentCaption.length} / {currentPlatformLimit} chars
              </span>
            </div>

            {/* Platform Override Tabs */}
            <div className="flex items-center space-x-1.5 border-b border-slate-100 pb-2 overflow-x-auto no-scrollbar text-xs">
              <button
                type="button"
                onClick={() => setActiveTabPlatform('ALL')}
                className={`px-3 py-1.5 rounded-lg font-bold transition shrink-0 ${
                  activeTabPlatform === 'ALL'
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-500 hover:bg-slate-100'
                }`}
              >
                Base Caption (All)
              </button>

              {selectedPlatforms.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setActiveTabPlatform(p)}
                  className={`px-3 py-1.5 rounded-lg font-bold transition shrink-0 flex items-center space-x-1 ${
                    activeTabPlatform === p
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-500 hover:bg-slate-100'
                  }`}
                >
                  <span>{p}</span>
                  {platformOverrides[p] && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
                </button>
              ))}
            </div>

            {/* Caption Textarea */}
            {activeTabPlatform === 'ALL' ? (
              <textarea
                rows={5}
                value={baseCaption}
                onChange={(e) => setBaseCaption(e.target.value)}
                placeholder="Write your main caption here... (supports emojis, linebreaks, and mentions)"
                className="w-full text-xs p-3.5 bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-600 font-normal text-slate-800 leading-relaxed resize-none"
              />
            ) : (
              <div>
                <p className="text-[11px] text-slate-500 mb-1.5">
                  Overriding caption specifically for <strong className="text-slate-800">{activeTabPlatform}</strong>:
                </p>
                <textarea
                  rows={5}
                  value={platformOverrides[activeTabPlatform] || baseCaption}
                  onChange={(e) =>
                    setPlatformOverrides({
                      ...platformOverrides,
                      [activeTabPlatform]: e.target.value,
                    })
                  }
                  placeholder={`Custom caption for ${activeTabPlatform}...`}
                  className="w-full text-xs p-3.5 bg-indigo-50/30 rounded-xl border border-indigo-200 focus:outline-none focus:border-indigo-600 font-normal text-slate-800 leading-relaxed resize-none"
                />
              </div>
            )}

            {/* Hashtags & Link Input */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1 flex items-center space-x-1">
                  <Hash className="w-3.5 h-3.5 text-slate-400" />
                  <span>Hashtags</span>
                </label>
                <input
                  type="text"
                  value={hashtags}
                  onChange={(e) => setHashtags(e.target.value)}
                  placeholder="#sale #branding #2026"
                  className="w-full text-xs py-2 px-3 bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-600"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1 flex items-center space-x-1">
                  <Link2 className="w-3.5 h-3.5 text-slate-400" />
                  <span>Link URL (Optional)</span>
                </label>
                <input
                  type="url"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  placeholder="https://client.com/promo"
                  className="w-full text-xs py-2 px-3 bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-600"
                />
              </div>
            </div>

            {selectedPlatforms.includes('INSTAGRAM') && (
              <div className="pt-2">
                <label className="block text-[11px] font-bold text-slate-600 mb-1 flex items-center space-x-1">
                  <MessageSquare className="w-3.5 h-3.5 text-slate-400" />
                  <span>Instagram First Comment (Auto-published)</span>
                </label>
                <input
                  type="text"
                  value={firstComment}
                  onChange={(e) => setFirstComment(e.target.value)}
                  placeholder="Drop a comment or promo code link..."
                  className="w-full text-xs py-2 px-3 bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-600"
                />
              </div>
            )}
          </div>

          {/* 4. Media Attachments */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Media URLs (Public CDN)
            </label>

            {/* List of current media */}
            {mediaUrls.length > 0 && (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                {mediaUrls.map((url, idx) => (
                  <div key={idx} className="relative aspect-video bg-slate-900 rounded-xl overflow-hidden group">
                    <img src={url} alt="" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => handleRemoveMedia(idx)}
                      className="absolute top-1 right-1 p-1 bg-red-600 text-white rounded-md opacity-0 group-hover:opacity-100 transition"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={newMediaInput}
                onChange={(e) => setNewMediaInput(e.target.value)}
                placeholder="Paste media CDN URL (from Media Library or S3)..."
                className="flex-1 text-xs py-2.5 px-3 bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-600 font-mono text-slate-700"
              />
              <button
                type="button"
                onClick={handleAddMediaUrl}
                className="px-4 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs rounded-xl transition shrink-0"
              >
                Add URL
              </button>
            </div>
          </div>

          {/* 5. Automated Posting Schedule & Timezones */}
          <div className="bg-white p-6 rounded-2xl border-2 border-indigo-100 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <label className="block text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center space-x-1.5">
                  <Clock className="w-4 h-4 text-indigo-600" />
                  <span>Automated Posting Schedule</span>
                </label>
                <p className="text-[11px] text-slate-400 mt-0.5">Posts will be automatically published by n8n at this exact time.</p>
              </div>

              {/* Quick Timing Presets */}
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setQuickSchedule('NOW')}
                  className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold rounded-lg text-[10px] transition border border-emerald-200"
                >
                  ⚡ Now (+2m)
                </button>
                <button
                  type="button"
                  onClick={() => setQuickSchedule('TODAY_EVENING')}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-[10px] transition"
                >
                  Today 18:00
                </button>
                <button
                  type="button"
                  onClick={() => setQuickSchedule('TOMORROW_MORNING')}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-[10px] transition"
                >
                  Tomorrow 10:00
                </button>
                <button
                  type="button"
                  onClick={() => setQuickSchedule('TOMORROW_EVENING')}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-[10px] transition"
                >
                  Tomorrow 18:30
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Local Date</label>
                <input
                  type="date"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  className="w-full text-xs py-2 px-3 bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-600 font-semibold"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Local 24h Time</label>
                <input
                  type="time"
                  value={scheduledTime}
                  onChange={(e) => setScheduledTime(e.target.value)}
                  className="w-full text-xs py-2 px-3 bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-600 font-semibold"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Target Timezone</label>
                <input
                  type="text"
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="w-full text-xs py-2 px-3 bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-600 font-mono text-slate-700"
                />
              </div>
            </div>

            {/* Dual Time Zone Display */}
            <div className="p-3.5 bg-indigo-50/50 rounded-xl border border-indigo-100 flex flex-col sm:flex-row sm:items-center sm:justify-between text-xs gap-2">
              <div>
                <span className="text-slate-500">Brand Time: </span>
                <strong className="text-indigo-900">{brandTime}</strong>
              </div>
              <div>
                <span className="text-slate-500">Your Local Time: </span>
                <strong className="text-indigo-900">{viewerTime}</strong>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Live Platform Feed Previews (5 cols) */}
        <div className="lg:col-span-5 sticky top-24 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-900 text-sm flex items-center space-x-1.5">
              <Eye className="w-4 h-4 text-indigo-600" />
              <span>Live Social Feed Preview</span>
            </h3>

            {/* Switch preview platform */}
            <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-xl text-[11px] font-semibold text-slate-600">
              {selectedPlatforms.slice(0, 4).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPreviewPlatform(p)}
                  className={`px-2 py-1 rounded-md transition ${
                    previewPlatform === p ? 'bg-white text-slate-900 shadow-sm' : 'hover:text-slate-900'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Social Card Simulator */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden text-xs">
            {/* Social Header */}
            <div className="p-4 flex items-center space-x-3 border-b border-slate-100">
              <div
                className="w-10 h-10 rounded-xl text-white font-black flex items-center justify-center text-sm shadow-xs shrink-0"
                style={{ backgroundColor: activePreviewBrand?.color || '#4f46e5' }}
              >
                {(activePreviewBrand?.name?.[0] || 'B').toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-slate-900 truncate">{activePreviewBrand?.name || 'Client Brand'}</p>
                <p className="text-[11px] text-slate-400">
                  {previewPlatform} • Just now • 🌐
                </p>
              </div>
            </div>

            {/* Caption Body */}
            <div className="p-4 space-y-2 whitespace-pre-line text-slate-800 text-xs leading-relaxed">
              <p>{currentCaption || 'Start typing a caption to see your live preview here...'}</p>
              {hashtags && <p className="text-indigo-600 font-semibold">{hashtags}</p>}
              {linkUrl && <p className="text-blue-500 underline truncate">{linkUrl}</p>}
            </div>

            {/* Media Attachment View */}
            {mediaUrls.length > 0 && (
              <div className="relative aspect-video bg-slate-900">
                <img
                  src={mediaUrls[0]}
                  alt="Post preview"
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            {/* First Comment Simulation (Instagram) */}
            {previewPlatform === 'INSTAGRAM' && firstComment && (
              <div className="p-3 bg-slate-50 border-t border-slate-100 text-[11px] text-slate-600 flex items-start space-x-2">
                <strong className="text-slate-900 shrink-0">{activePreviewBrand?.name?.toLowerCase().replace(/\s+/g, '_')}:</strong>
                <span>{firstComment}</span>
              </div>
            )}

            {/* Social Action Footer */}
            <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-around text-slate-500 text-[11px] font-semibold">
              <button className="hover:text-indigo-600 transition">👍 Like</button>
              <button className="hover:text-indigo-600 transition">💬 Comment</button>
              <button className="hover:text-indigo-600 transition">↗ Share</button>
            </div>
          </div>

          {/* Publishing Dispatch Summary Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <span className="font-bold text-slate-800">Dispatch Summary</span>
              <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                Ready to dispatch
              </span>
            </div>

            <div className="space-y-2 text-slate-600">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Target Brands:</span>
                <span className="font-semibold text-slate-800">
                  {selectedBrandIds.length} brand{selectedBrandIds.length > 1 ? 's' : ''} selected
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Active Channels:</span>
                <div className="flex flex-wrap gap-1 justify-end max-w-[200px]">
                  {selectedPlatforms.map((p) => (
                    <span key={p} className="px-1.5 py-0.5 bg-slate-100 text-slate-700 rounded text-[10px] font-medium">
                      {p}
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Effective Schedule:</span>
                <span className="font-medium text-slate-700 font-mono text-[11px]">
                  {scheduledDate} {scheduledTime} ({timezone})
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Media Attachments:</span>
                <span className="font-semibold text-slate-800">{mediaUrls.length} file{mediaUrls.length !== 1 ? 's' : ''}</span>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
              <Link
                to="/workflows"
                className="text-[11px] font-medium text-indigo-600 hover:text-indigo-800 transition flex items-center space-x-1"
              >
                <span>Automations & Workflows</span>
                <span>→</span>
              </Link>
              <Link
                to="/sheets-sync"
                className="text-[11px] font-medium text-slate-500 hover:text-slate-700 transition"
              >
                Google Sheets Sync
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
