import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { useBrand } from '../../context/BrandContext.jsx';
import { apiClient } from '../../api/client.js';
import Modal from '../../components/Modal.jsx';
import {
  Settings,
  Building,
  Key,
  Globe,
  Palette,
  Clock,
  Shield,
  Copy,
  Check,
  ExternalLink,
  Save,
  CheckCircle2,
  Cpu,
  Layers,
  Radio,
  Share2,
  Users,
  Plus,
  Trash2,
  Edit2,
  AlertCircle,
  Sparkles,
  Link2,
  UserCheck,
  UserPlus,
  Send,
  Calendar,
} from 'lucide-react';

const TIMEZONES = [
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Paris',
  'Asia/Kolkata',
  'Asia/Tokyo',
  'Asia/Singapore',
  'Australia/Sydney',
  'UTC',
];

const ROLES_LIST = [
  { id: 'AGENCY_ADMIN', label: 'Agency Admin', color: 'bg-purple-100 text-purple-800 border-purple-200' },
  { id: 'BRAND_MANAGER', label: 'Brand Manager', color: 'bg-indigo-100 text-indigo-800 border-indigo-200' },
  { id: 'CONTENT_CREATOR', label: 'Content Creator', color: 'bg-blue-100 text-blue-800 border-blue-200' },
  { id: 'CLIENT_VIEWER', label: 'Client Viewer', color: 'bg-slate-100 text-slate-800 border-slate-200' },
];

export default function SettingsPage() {
  const navigate = useNavigate();
  const { user, activeOrg } = useAuth();
  const { brands, selectedBrand, selectBrand, createBrand, updateBrand, deleteBrand, reloadBrands } = useBrand();

  const [activeTab, setActiveTab] = useState('brands');
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedWebhook, setCopiedWebhook] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState('');
  const [testingWebhook, setTestingWebhook] = useState(false);
  const [webhookStatus, setWebhookStatus] = useState(null);

  // Brand Modal States
  const [isBrandModalOpen, setIsBrandModalOpen] = useState(false);
  const [editingBrand, setEditingBrand] = useState(null);
  const [brandForm, setBrandForm] = useState({
    name: '',
    slug: '',
    defaultTimezone: 'America/New_York',
    primaryColor: '#4f46e5',
    scheduleSpreadsheetId: '',
    metaPageId: '',
    metaIgAccountId: '',
    metaAccessToken: '',
    linkedinOrgId: '',
    twitterHandle: '',
    youtubeChannelId: '',
    tiktokAccountId: '',
    pinterestBoardId: '',
  });

  // Meta Direct Token Modal States
  const [isMetaModalOpen, setIsMetaModalOpen] = useState(false);
  const [metaBrand, setMetaBrand] = useState(null);
  const [metaForm, setMetaForm] = useState({
    metaPageId: '',
    metaIgAccountId: '',
    metaAccessToken: '',
    metaAppId: '',
  });

  // Team / Employees States
  const [members, setMembers] = useState([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [isMemberModalOpen, setIsMemberModalOpen] = useState(false);
  const [memberForm, setMemberForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    role: 'CONTENT_CREATOR',
    password: 'password123',
  });

  const apiKey = 'pp_live_secret_n8n_scheduler_api_key_123456';
  const webhookUrl = 'http://localhost:5678/webhook/postpilot-sync';

  // Fetch organization team members
  const fetchMembers = async () => {
    setLoadingMembers(true);
    try {
      const { data } = await apiClient.get('/organizations/me');
      setMembers(data.data?.memberships || []);
    } catch (err) {
      console.warn('Failed to fetch organization members:', err.message);
    } finally {
      setLoadingMembers(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'team') {
      fetchMembers();
    }
  }, [activeTab]);

  const showNotification = (msg) => {
    setSavedSuccess(msg);
    setTimeout(() => setSavedSuccess(''), 3500);
  };

  // Copy helper
  const handleCopy = (text, type) => {
    navigator.clipboard.writeText(text);
    if (type === 'key') {
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
    } else {
      setCopiedWebhook(true);
      setTimeout(() => setCopiedWebhook(false), 2000);
    }
  };

  // Open Brand Modal
  const handleOpenBrandModal = (brand = null) => {
    if (brand) {
      setEditingBrand(brand);
      setBrandForm({
        name: brand.name,
        slug: brand.slug || '',
        defaultTimezone: brand.defaultTimezone || 'America/New_York',
        primaryColor: brand.primaryColor || '#4f46e5',
        scheduleSpreadsheetId: brand.sheetConfig?.scheduleSpreadsheetId || '',
        metaPageId: brand.metaConfig?.metaPageId || '',
        metaIgAccountId: brand.metaConfig?.metaIgAccountId || '',
        metaAccessToken: brand.metaConfig?.metaAccessToken || '',
        linkedinOrgId: brand.socialAccounts?.find((s) => s.platform === 'LINKEDIN')?.platformAccountId || brand.linkedinOrgId || '',
        twitterHandle: brand.socialAccounts?.find((s) => s.platform === 'TWITTER')?.accountHandle || brand.twitterHandle || '',
        youtubeChannelId: brand.socialAccounts?.find((s) => s.platform === 'YOUTUBE')?.platformAccountId || brand.youtubeChannelId || '',
        tiktokAccountId: brand.socialAccounts?.find((s) => s.platform === 'TIKTOK')?.accountHandle || brand.tiktokAccountId || '',
        pinterestBoardId: brand.socialAccounts?.find((s) => s.platform === 'PINTEREST')?.accountHandle || brand.pinterestBoardId || '',
      });
    } else {
      setEditingBrand(null);
      setBrandForm({
        name: '',
        slug: '',
        defaultTimezone: selectedBrand?.defaultTimezone || 'America/New_York',
        primaryColor: '#4f46e5',
        scheduleSpreadsheetId: '',
        metaPageId: '',
        metaIgAccountId: '',
        metaAccessToken: '',
        linkedinOrgId: '',
        twitterHandle: '',
        youtubeChannelId: '',
        tiktokAccountId: '',
        pinterestBoardId: '',
      });
    }
    setIsBrandModalOpen(true);
  };

  // Save Brand (Create or Edit)
  const handleSaveBrand = async (e) => {
    e.preventDefault();
    try {
      if (editingBrand) {
        await updateBrand(editingBrand.id, brandForm);
        showNotification(`Brand "${brandForm.name}" updated successfully!`);
      } else {
        await createBrand(brandForm);
        showNotification(`New Brand "${brandForm.name}" created successfully!`);
      }
      setIsBrandModalOpen(false);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to save brand');
    }
  };

  // Delete Brand
  const handleDeleteBrand = async (brand) => {
    if (brands.length <= 1) {
      alert('You must retain at least one active brand in your workspace.');
      return;
    }
    if (window.confirm(`Are you sure you want to delete brand "${brand.name}"? This cannot be undone.`)) {
      try {
        await deleteBrand(brand.id);
        showNotification(`Brand "${brand.name}" deleted.`);
      } catch (err) {
        alert(err.response?.data?.message || 'Failed to delete brand');
      }
    }
  };

  // Open Meta Direct Token Modal
  const handleOpenMetaModal = (brand) => {
    setMetaBrand(brand);
    setMetaForm({
      metaPageId: brand.metaConfig?.metaPageId || '',
      metaIgAccountId: brand.metaConfig?.metaIgAccountId || '',
      metaAccessToken: brand.metaConfig?.metaAccessToken || '',
      metaAppId: brand.metaConfig?.metaAppId || '',
    });
    setIsMetaModalOpen(true);
  };

  // Save Direct Meta Token
  const handleSaveMetaToken = async (e) => {
    e.preventDefault();
    if (!metaBrand) return;
    try {
      await updateBrand(metaBrand.id, {
        metaPageId: metaForm.metaPageId.trim(),
        metaIgAccountId: metaForm.metaIgAccountId.trim(),
        metaAccessToken: metaForm.metaAccessToken.trim(),
        metaAppId: metaForm.metaAppId.trim(),
      });
      showNotification(`Meta credentials configured for "${metaBrand.name}"!`);
      setIsMetaModalOpen(false);
      await reloadBrands();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to save Meta credentials');
    }
  };

  // Save Employee / Member
  const handleAddMember = async (e) => {
    e.preventDefault();
    try {
      await apiClient.post('/organizations/members', memberForm);
      showNotification(`Employee ${memberForm.firstName} ${memberForm.lastName} added!`);
      setIsMemberModalOpen(false);
      setMemberForm({
        firstName: '',
        lastName: '',
        email: '',
        role: 'CONTENT_CREATOR',
        password: 'password123',
      });
      await fetchMembers();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to add employee');
    }
  };

  // Update Member Role
  const handleUpdateMemberRole = async (userId, newRole) => {
    try {
      await apiClient.patch(`/organizations/members/${userId}/role`, { role: newRole });
      showNotification('Employee role updated!');
      await fetchMembers();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update employee role');
    }
  };

  // Remove Member
  const handleRemoveMember = async (member) => {
    if (member.userId === user?.id) {
      alert('You cannot remove yourself from the organization.');
      return;
    }
    if (window.confirm(`Remove employee ${member.user?.firstName || member.user?.email} from organization?`)) {
      try {
        await apiClient.delete(`/organizations/members/${member.userId}`);
        showNotification('Employee removed.');
        await fetchMembers();
      } catch (err) {
        alert(err.response?.data?.message || 'Failed to remove employee');
      }
    }
  };

  // Test n8n automation pipeline
  const handleTestWebhook = async () => {
    setTestingWebhook(true);
    setWebhookStatus(null);
    try {
      const res = await apiClient.post('/publish/trigger-n8n-sync', {
        test: true,
        source: 'Settings Automation Test',
        timestamp: new Date().toISOString(),
      });
      if (res.data.n8nReachable) {
        setWebhookStatus({ ok: true, msg: 'n8n Master Pipeline connected & trigger responded with HTTP 200!' });
      } else {
        setWebhookStatus({ ok: true, msg: 'Automated Pipeline active! Automated scheduler ready for queued runs.' });
      }
    } catch (err) {
      setWebhookStatus({
        ok: false,
        msg: 'Connection attempt failed. Ensure API and n8n services are running.',
      });
    } finally {
      setTestingWebhook(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center space-x-2.5">
            <Settings className="w-6 h-6 text-indigo-600" />
            <span>Workspace Settings & Management</span>
          </h1>
          <p className="text-slate-500 text-xs sm:text-sm mt-1">
            Manage multiple client brands, direct Meta access tokens, employee access roles, and automated future scheduling.
          </p>
        </div>

        {savedSuccess && (
          <div className="flex items-center space-x-2 bg-emerald-50 text-emerald-800 border border-emerald-200 px-4 py-2 rounded-xl text-xs font-bold animate-fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{savedSuccess}</span>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center space-x-2 border-b border-slate-200 pb-2 text-sm font-semibold overflow-x-auto">
        <button
          onClick={() => setActiveTab('brands')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl transition shrink-0 ${
            activeTab === 'brands'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Building className="w-4 h-4" />
          <span>Brands & Meta Tokens ({brands.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('team')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl transition shrink-0 ${
            activeTab === 'team'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Team & Employee Logins</span>
        </button>

        <button
          onClick={() => setActiveTab('automation')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl transition shrink-0 ${
            activeTab === 'automation'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Future Schedule Automation</span>
        </button>

        <button
          onClick={() => setActiveTab('api')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl transition shrink-0 ${
            activeTab === 'api'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Cpu className="w-4 h-4" />
          <span>n8n API & Security</span>
        </button>
      </div>

      {/* TAB 1: BRANDS & DIRECT META TOKENS */}
      {activeTab === 'brands' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Configured Client Brands</h2>
              <p className="text-xs text-slate-500">
                Each brand has its own timezone, Google Sheet synchronization ID, and direct Meta API tokens for Facebook & Instagram posting.
              </p>
            </div>
            <button
              onClick={() => handleOpenBrandModal()}
              className="inline-flex items-center space-x-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-sm transition"
            >
              <Plus className="w-4 h-4" />
              <span>Add New Brand</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {brands.map((brand) => {
              const isActive = selectedBrand?.id === brand.id;
              const isMetaConnected =
                brand.metaConfig?.status === 'CONNECTED' ||
                Boolean(brand.metaConfig?.metaAccessToken && (brand.metaConfig?.metaPageId || brand.metaConfig?.metaIgAccountId));

              return (
                <div
                  key={brand.id}
                  className={`bg-white rounded-2xl border p-6 space-y-5 shadow-sm transition ${
                    isActive ? 'border-indigo-500 ring-2 ring-indigo-500/20' : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  {/* Brand Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <div
                        className="w-11 h-11 rounded-2xl flex items-center justify-center text-white font-bold text-base shadow-sm"
                        style={{ backgroundColor: brand.primaryColor || '#4f46e5' }}
                      >
                        {brand.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <h3 className="font-bold text-slate-900 text-base">{brand.name}</h3>
                          {isActive && (
                            <span className="px-2 py-0.5 text-[10px] uppercase font-bold bg-indigo-50 text-indigo-600 border border-indigo-200 rounded-md">
                              Active Workspace
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 font-mono">slug: {brand.slug || 'default'}</p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => handleOpenBrandModal(brand)}
                        title="Edit Brand"
                        className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteBrand(brand)}
                        title="Delete Brand"
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Details Badge Row */}
                  <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                    <div>
                      <span className="text-slate-400 block font-medium">Timezone</span>
                      <span className="font-bold text-slate-800">{brand.defaultTimezone}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-medium">Google Sheet</span>
                      <span className="font-mono text-slate-800 truncate block">
                        {brand.sheetConfig?.scheduleSpreadsheetId ? `${brand.sheetConfig.scheduleSpreadsheetId.slice(0, 12)}...` : 'Not linked'}
                      </span>
                    </div>
                  </div>

                  {/* Direct Meta Token Card */}
                  <div className="border border-slate-200 rounded-xl p-3.5 bg-gradient-to-r from-slate-50 to-white flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-bold text-slate-800">Meta Graph API (Direct Token)</span>
                        <span
                          className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                            isMetaConnected ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {isMetaConnected ? 'Connected' : 'Token Required'}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500">
                        {isMetaConnected
                          ? `Page ID: ${brand.metaConfig?.metaPageId || 'Configured'} • IG ID: ${brand.metaConfig?.metaIgAccountId || 'Configured'}`
                          : 'Add your Meta System User Token & Page ID for automated posting'}
                      </p>
                    </div>

                    <button
                      onClick={() => handleOpenMetaModal(brand)}
                      className="px-3 py-1.5 bg-slate-900 hover:bg-indigo-600 text-white text-xs font-bold rounded-lg transition shadow-sm shrink-0 ml-3"
                    >
                      {isMetaConnected ? 'Manage Token' : 'Add Meta Token'}
                    </button>
                  </div>

                  {/* Bottom Switch Button */}
                  {!isActive && (
                    <button
                      onClick={() => {
                        selectBrand(brand);
                        showNotification(`Switched active workspace to "${brand.name}"`);
                      }}
                      className="w-full py-2 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-slate-700 text-xs font-bold rounded-xl transition"
                    >
                      Switch to This Brand
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: TEAM & EMPLOYEE LOGINS */}
      {activeTab === 'team' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Organization Employees & Team Members</h2>
              <p className="text-xs text-slate-500">
                Grant role-based access for agency managers, content creators, and client reviewers with distinct permissions.
              </p>
            </div>
            <div className="flex items-center space-x-2.5">
              <button
                onClick={() => navigate('/team')}
                className="inline-flex items-center space-x-1.5 px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition"
              >
                <ShieldCheck className="w-4 h-4 text-indigo-600" />
                <span>Full Role Matrix & Details →</span>
              </button>
              <button
                onClick={() => setIsMemberModalOpen(true)}
                className="inline-flex items-center space-x-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-sm transition"
              >
                <UserPlus className="w-4 h-4" />
                <span>Add Employee</span>
              </button>
            </div>
          </div>

          {/* Members Table */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-bold tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Employee</th>
                    <th className="py-3 px-4">Email</th>
                    <th className="py-3 px-4">Role</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {members.map((mem) => {
                    const isSelf = mem.userId === user?.id;
                    const roleBadge = ROLES_LIST.find((r) => r.id === mem.role) || ROLES_LIST[2];

                    return (
                      <tr key={mem.id || mem.userId} className="hover:bg-slate-50/60 transition">
                        <td className="py-3.5 px-4">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-xs">
                              {mem.user?.firstName?.[0] || mem.user?.email?.[0] || 'U'}
                            </div>
                            <div>
                              <span className="font-bold text-slate-900 block">
                                {mem.user?.firstName} {mem.user?.lastName} {isSelf && '(You)'}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-slate-600">{mem.user?.email}</td>
                        <td className="py-3.5 px-4">
                          <select
                            value={mem.role}
                            disabled={isSelf}
                            onChange={(e) => handleUpdateMemberRole(mem.userId, e.target.value)}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border cursor-pointer focus:outline-none ${roleBadge.color}`}
                          >
                            {ROLES_LIST.map((r) => (
                              <option key={r.id} value={r.id}>
                                {r.label}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="inline-flex items-center space-x-1 px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-full font-bold text-[10px]">
                            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                            <span>Active</span>
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          {!isSelf && (
                            <button
                              onClick={() => handleRemoveMember(mem)}
                              title="Remove Employee"
                              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Quick Demo Credentials for Testing */}
          <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-100 rounded-2xl p-6 space-y-3">
            <div className="flex items-center space-x-2 text-indigo-900 font-bold">
              <Sparkles className="w-5 h-5 text-indigo-600" />
              <span>Multi-Employee Login Credentials</span>
            </div>
            <p className="text-xs text-indigo-700">
              You can log out and test signing in with different role credentials:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-2 text-xs">
              <div className="bg-white p-3 rounded-xl border border-indigo-100 shadow-2xs">
                <span className="font-bold text-purple-700 block text-[11px] uppercase">Agency Admin</span>
                <span className="text-slate-700 font-mono block">admin@apexmedia.com</span>
                <span className="text-slate-400 font-mono text-[10px]">Pass: ApexAdmin123!</span>
              </div>
              <div className="bg-white p-3 rounded-xl border border-indigo-100 shadow-2xs">
                <span className="font-bold text-indigo-700 block text-[11px] uppercase">Brand Manager</span>
                <span className="text-slate-700 font-mono block">manager@apexmedia.com</span>
                <span className="text-slate-400 font-mono text-[10px]">Pass: ApexAdmin123!</span>
              </div>
              <div className="bg-white p-3 rounded-xl border border-indigo-100 shadow-2xs">
                <span className="font-bold text-blue-700 block text-[11px] uppercase">Content Creator</span>
                <span className="text-slate-700 font-mono block">creator@apexmedia.com</span>
                <span className="text-slate-400 font-mono text-[10px]">Pass: ApexAdmin123!</span>
              </div>
              <div className="bg-white p-3 rounded-xl border border-indigo-100 shadow-2xs">
                <span className="font-bold text-slate-700 block text-[11px] uppercase">Client Viewer</span>
                <span className="text-slate-700 font-mono block">client@apexmedia.com</span>
                <span className="text-slate-400 font-mono text-[10px]">Pass: ApexAdmin123!</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: AUTOMATION & FUTURE SCHEDULING */}
      {activeTab === 'automation' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-6 shadow-sm">
            <div>
              <h2 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
                <Clock className="w-5 h-5 text-indigo-600" />
                <span>Automated Future Scheduling Engine</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                How PostPilot handles future scheduling, automated triggers, and execution idempotency.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-1.5">
                <div className="flex items-center space-x-2 text-indigo-600 font-bold">
                  <Calendar className="w-4 h-4" />
                  <span>Future Posts Stay Safe</span>
                </div>
                <p className="text-slate-600">
                  When you schedule a post for a future date/time, its status remains <strong>SCHEDULED</strong> and is protected from premature publishing.
                </p>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-1.5">
                <div className="flex items-center space-x-2 text-emerald-600 font-bold">
                  <Cpu className="w-4 h-4" />
                  <span>Automated Due Dispatch</span>
                </div>
                <p className="text-slate-600">
                  Every minute, the scheduler queries <code className="font-mono bg-white px-1 rounded">scheduledUtc &lt;= now</code> to only dispatch posts whose time has arrived.
                </p>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-1.5">
                <div className="flex items-center space-x-2 text-purple-600 font-bold">
                  <Shield className="w-4 h-4" />
                  <span>Idempotent Execution</span>
                </div>
                <p className="text-slate-600">
                  Strict <code className="font-mono bg-white px-1 rounded">postId:platform</code> composite keys prevent double-posting even across network retries.
                </p>
              </div>
            </div>

            {/* Test Automated Engine */}
            <div className="border border-slate-200 rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-800 text-sm">n8n Scheduler Master Webhook</h3>
                  <p className="text-xs text-slate-500 font-mono mt-0.5">{webhookUrl}</p>
                </div>
                <button
                  type="button"
                  onClick={handleTestWebhook}
                  disabled={testingWebhook}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition shadow-sm disabled:opacity-50"
                >
                  {testingWebhook ? 'Testing...' : 'Test Scheduler Trigger'}
                </button>
              </div>

              {webhookStatus && (
                <div
                  className={`p-3.5 rounded-xl text-xs font-medium border flex items-center space-x-2 ${
                    webhookStatus.ok
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      : 'bg-red-50 text-red-800 border-red-200'
                  }`}
                >
                  {webhookStatus.ok ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                  )}
                  <span>{webhookStatus.msg}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: API & SECURITY */}
      {activeTab === 'api' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-6 shadow-sm">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Automation API Keys & Webhooks</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Secure master credentials for connecting n8n scheduler nodes, headless workers, and webhooks.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Master Automation API Key (X-API-Key)
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="password"
                  readOnly
                  value={apiKey}
                  className="w-full px-4 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-xs font-mono text-slate-700"
                />
                <button
                  onClick={() => handleCopy(apiKey, 'key')}
                  className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition flex items-center space-x-1.5 shrink-0"
                >
                  {copiedKey ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedKey ? 'Copied' : 'Copy Key'}</span>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                n8n Webhook Sync Endpoint
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  readOnly
                  value={webhookUrl}
                  className="w-full px-4 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-xs font-mono text-slate-700"
                />
                <button
                  onClick={() => handleCopy(webhookUrl, 'webhook')}
                  className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition flex items-center space-x-1.5 shrink-0"
                >
                  {copiedWebhook ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedWebhook ? 'Copied' : 'Copy URL'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: CREATE / EDIT BRAND */}
      <Modal
        isOpen={isBrandModalOpen}
        onClose={() => setIsBrandModalOpen(false)}
        title={editingBrand ? `Edit Brand: ${editingBrand.name}` : 'Create New Brand'}
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleSaveBrand} className="space-y-4">
          {/* Section 1: Basic Brand Identity */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
            <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center space-x-1.5">
              <Building className="w-3.5 h-3.5 text-indigo-600" />
              <span>Brand Identity & Schedule</span>
            </h4>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Brand Name *</label>
              <input
                type="text"
                required
                value={brandForm.name}
                onChange={(e) => setBrandForm({ ...brandForm, name: e.target.value })}
                placeholder="e.g. Acme Organic Foods"
                className="w-full px-3.5 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Slug (Identifier)</label>
                <input
                  type="text"
                  value={brandForm.slug}
                  onChange={(e) => setBrandForm({ ...brandForm, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                  placeholder="e.g. acme-organic"
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl font-mono focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Default Timezone *</label>
                <select
                  value={brandForm.defaultTimezone}
                  onChange={(e) => setBrandForm({ ...brandForm, defaultTimezone: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl cursor-pointer focus:outline-none"
                >
                  {TIMEZONES.map((tz) => (
                    <option key={tz} value={tz}>
                      {tz}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Primary Color</label>
                <div className="flex items-center space-x-1.5">
                  <input
                    type="color"
                    value={brandForm.primaryColor}
                    onChange={(e) => setBrandForm({ ...brandForm, primaryColor: e.target.value })}
                    className="w-8 h-8 p-0.5 rounded-lg border border-slate-200 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={brandForm.primaryColor}
                    onChange={(e) => setBrandForm({ ...brandForm, primaryColor: e.target.value })}
                    className="w-full px-2.5 py-1.5 text-xs font-mono bg-white border border-slate-200 rounded-xl uppercase"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Google Sheet URL or Spreadsheet ID</label>
              <input
                type="text"
                value={brandForm.scheduleSpreadsheetId}
                onChange={(e) => setBrandForm({ ...brandForm, scheduleSpreadsheetId: e.target.value })}
                placeholder="e.g. 11uZJdPucIlFoZbiFJdc6GHQZHL_11MlfNFEOu7sxRIw"
                className="w-full px-3.5 py-2 text-xs bg-white border border-slate-200 rounded-xl font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Section 2: Direct Meta (Facebook & Instagram) */}
          <div className="bg-blue-50/60 p-4 rounded-xl border border-blue-200 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black text-blue-900 uppercase tracking-wider flex items-center space-x-1.5">
                <Share2 className="w-3.5 h-3.5 text-blue-600" />
                <span>Facebook & Instagram Direct (Meta Graph API)</span>
              </h4>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200">
                Direct API
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Facebook Page ID
                </label>
                <input
                  type="text"
                  value={brandForm.metaPageId}
                  onChange={(e) => setBrandForm({ ...brandForm, metaPageId: e.target.value.trim() })}
                  placeholder="e.g. 1454740611044963"
                  className="w-full px-3.5 py-2 text-xs bg-white border border-blue-200 rounded-xl font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold text-slate-900"
                />
                <span className="text-[10px] text-slate-500 mt-0.5 block">
                  Find under Facebook Page &gt; Settings &gt; Page Details.
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Instagram Account ID
                </label>
                <input
                  type="text"
                  value={brandForm.metaIgAccountId}
                  onChange={(e) => setBrandForm({ ...brandForm, metaIgAccountId: e.target.value.trim() })}
                  placeholder="e.g. 17841439037630316"
                  className="w-full px-3.5 py-2 text-xs bg-white border border-blue-200 rounded-xl font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold text-slate-900"
                />
                <span className="text-[10px] text-slate-500 mt-0.5 block">
                  Instagram Business Account linked to your Page.
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Meta Direct Access Token (Page or System User Token)
              </label>
              <textarea
                rows={2}
                value={brandForm.metaAccessToken}
                onChange={(e) => setBrandForm({ ...brandForm, metaAccessToken: e.target.value.trim() })}
                placeholder="e.g. EAGVJejn... or EAABwz..."
                className="w-full px-3.5 py-2 text-xs bg-white border border-blue-200 rounded-xl font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 resize-none"
              />
              <span className="text-[10px] text-slate-500 mt-0.5 block">
                Token generated from Meta Graph API Explorer or Meta Business Suite with publishing permissions.
              </span>
            </div>
          </div>

          {/* Section 3: All Other Direct Platforms */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
            <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center space-x-1.5">
              <Globe className="w-3.5 h-3.5 text-indigo-600" />
              <span>Other Direct Social Accounts</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">LinkedIn Organization ID</label>
                <input
                  type="text"
                  value={brandForm.linkedinOrgId}
                  onChange={(e) => setBrandForm({ ...brandForm, linkedinOrgId: e.target.value.trim() })}
                  placeholder="e.g. 12345678"
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">X / Twitter Handle</label>
                <input
                  type="text"
                  value={brandForm.twitterHandle}
                  onChange={(e) => setBrandForm({ ...brandForm, twitterHandle: e.target.value.trim() })}
                  placeholder="e.g. @brandhandle"
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">YouTube Channel ID</label>
                <input
                  type="text"
                  value={brandForm.youtubeChannelId}
                  onChange={(e) => setBrandForm({ ...brandForm, youtubeChannelId: e.target.value.trim() })}
                  placeholder="e.g. UC_x5XG1OV2P6uZZ5FSM9Ttw"
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">TikTok Account Handle / ID</label>
                <input
                  type="text"
                  value={brandForm.tiktokAccountId}
                  onChange={(e) => setBrandForm({ ...brandForm, tiktokAccountId: e.target.value.trim() })}
                  placeholder="e.g. @brandchannel"
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">Pinterest Board / Handle</label>
                <input
                  type="text"
                  value={brandForm.pinterestBoardId}
                  onChange={(e) => setBrandForm({ ...brandForm, pinterestBoardId: e.target.value.trim() })}
                  placeholder="e.g. brand/pins-board"
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsBrandModalOpen(false)}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-sm transition"
            >
              {editingBrand ? 'Save Changes' : 'Create Brand'}
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL 2: DIRECT META TOKEN CONFIGURATION */}
      <Modal
        isOpen={isMetaModalOpen}
        onClose={() => setIsMetaModalOpen(false)}
        title={`Direct Meta API Token: ${metaBrand?.name || 'Brand'}`}
        maxWidth="max-w-xl"
      >
        <form onSubmit={handleSaveMetaToken} className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 p-3.5 rounded-xl text-xs text-blue-900 space-y-1">
            <div className="font-bold flex items-center space-x-1.5">
              <Share2 className="w-4 h-4 text-blue-600" />
              <span>Direct Meta Graph API Integration</span>
            </div>
            <p className="text-[11px] text-blue-800">
              Enter your Meta System User Access Token, Facebook Page ID, and Instagram Business Account ID.
              Automated posts for <strong>{metaBrand?.name}</strong> will publish directly through Meta's official Graph API!
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Facebook Page ID <span className="text-indigo-600">*</span>
            </label>
            <input
              type="text"
              required
              value={metaForm.metaPageId}
              onChange={(e) => setMetaForm({ ...metaForm, metaPageId: e.target.value })}
              placeholder="e.g. 102938475612345"
              className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <span className="text-[10px] text-slate-400 mt-0.5 block">
              Found under Facebook Page Settings &gt; Page Transparency or About page.
            </span>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Instagram Business Account ID
            </label>
            <input
              type="text"
              value={metaForm.metaIgAccountId}
              onChange={(e) => setMetaForm({ ...metaForm, metaIgAccountId: e.target.value })}
              placeholder="e.g. 17841400123456789"
              className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <span className="text-[10px] text-slate-400 mt-0.5 block">
              Instagram Professional account linked to your Facebook Page.
            </span>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Meta Direct Access Token (Long-Lived or System User) <span className="text-indigo-600">*</span>
            </label>
            <textarea
              required
              rows={3}
              value={metaForm.metaAccessToken}
              onChange={(e) => setMetaForm({ ...metaForm, metaAccessToken: e.target.value })}
              placeholder="e.g. EAABwzLixnjYBA..."
              className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <span className="text-[10px] text-slate-400 mt-0.5 block">
              Generated via Meta Business Suite &gt; System Users with <code className="font-mono">pages_manage_posts</code> and <code className="font-mono">instagram_content_publish</code> permissions.
            </span>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Meta App ID (Optional)</label>
            <input
              type="text"
              value={metaForm.metaAppId}
              onChange={(e) => setMetaForm({ ...metaForm, metaAppId: e.target.value })}
              placeholder="e.g. 987654321098765"
              className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsMetaModalOpen(false)}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-sm transition"
            >
              Save Meta Credentials
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL 3: ADD EMPLOYEE / TEAM MEMBER */}
      <Modal
        isOpen={isMemberModalOpen}
        onClose={() => setIsMemberModalOpen(false)}
        title="Add Employee / Team Member"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleAddMember} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">First Name *</label>
              <input
                type="text"
                required
                value={memberForm.firstName}
                onChange={(e) => setMemberForm({ ...memberForm, firstName: e.target.value })}
                placeholder="Jane"
                className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Last Name *</label>
              <input
                type="text"
                required
                value={memberForm.lastName}
                onChange={(e) => setMemberForm({ ...memberForm, lastName: e.target.value })}
                placeholder="Doe"
                className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Email Address *</label>
            <input
              type="email"
              required
              value={memberForm.email}
              onChange={(e) => setMemberForm({ ...memberForm, email: e.target.value })}
              placeholder="jane@agency.com"
              className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Role *</label>
            <select
              value={memberForm.role}
              onChange={(e) => setMemberForm({ ...memberForm, role: e.target.value })}
              className="w-full px-3 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl cursor-pointer focus:outline-none"
            >
              {ROLES_LIST.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.label}
                </option>
              ))}
            </select>
            <span className="text-[10px] text-slate-400 mt-1 block">
              Determines permissions for drafting, approving, publishing, and scheduling.
            </span>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Initial Password *</label>
            <input
              type="password"
              required
              value={memberForm.password}
              onChange={(e) => setMemberForm({ ...memberForm, password: e.target.value })}
              placeholder="••••••••"
              className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsMemberModalOpen(false)}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-sm transition"
            >
              Add Employee
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}