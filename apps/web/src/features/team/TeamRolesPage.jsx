import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import apiClient from '../../api/client.js';
import Modal from '../../components/Modal.jsx';
import {
  Users,
  UserPlus,
  ShieldCheck,
  Shield,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Search,
  RefreshCw,
  Mail,
  UserCheck,
  Key,
  Lock,
  ChevronRight,
  Check,
  X,
  Edit2,
  Sliders,
  Settings2,
  Sparkles,
} from 'lucide-react';

const DEFAULT_ROLES_CONFIG = [
  {
    id: 'SUPER_ADMIN',
    label: 'Super Admin',
    color: 'bg-purple-100 text-purple-900 border-purple-200',
    badgeColor: 'bg-purple-600',
    description: 'Full unconstrained system authority across organizations, brands, tokens, and billing.',
  },
  {
    id: 'AGENCY_ADMIN',
    label: 'Agency Admin',
    color: 'bg-indigo-100 text-indigo-900 border-indigo-200',
    badgeColor: 'bg-indigo-600',
    description: 'Manages all client brands, assigns employee roles, and connects Meta API integrations.',
  },
  {
    id: 'BRAND_MANAGER',
    label: 'Brand Manager',
    color: 'bg-blue-100 text-blue-900 border-blue-200',
    badgeColor: 'bg-blue-600',
    description: 'Oversees campaign calendars, reviews and approves posts, and monitors brand analytics.',
  },
  {
    id: 'CONTENT_CREATOR',
    label: 'Content Creator',
    color: 'bg-emerald-100 text-emerald-900 border-emerald-200',
    badgeColor: 'bg-emerald-600',
    description: 'Composes posts, uploads media, drafts captions, and schedules publication times.',
  },
  {
    id: 'CLIENT_VIEWER',
    label: 'Client Viewer',
    color: 'bg-amber-100 text-amber-900 border-amber-200',
    badgeColor: 'bg-amber-600',
    description: 'Read-only access for external clients to view content calendar and post previews.',
  },
];

const DEFAULT_PERMISSIONS_MATRIX = [
  {
    id: 'perm_compose',
    feature: 'Create & Compose Posts',
    SUPER_ADMIN: true,
    AGENCY_ADMIN: true,
    BRAND_MANAGER: true,
    CONTENT_CREATOR: true,
    CLIENT_VIEWER: false,
  },
  {
    id: 'perm_bulk_schedule',
    feature: 'Multi-Brand Bulk Scheduling',
    SUPER_ADMIN: true,
    AGENCY_ADMIN: true,
    BRAND_MANAGER: true,
    CONTENT_CREATOR: true,
    CLIENT_VIEWER: false,
  },
  {
    id: 'perm_meta_dispatch',
    feature: 'Direct Meta / n8n Instant Dispatch',
    SUPER_ADMIN: true,
    AGENCY_ADMIN: true,
    BRAND_MANAGER: true,
    CONTENT_CREATOR: true,
    CLIENT_VIEWER: false,
  },
  {
    id: 'perm_approve',
    feature: 'Approve & Reject Content',
    SUPER_ADMIN: true,
    AGENCY_ADMIN: true,
    BRAND_MANAGER: true,
    CONTENT_CREATOR: false,
    CLIENT_VIEWER: false,
  },
  {
    id: 'perm_brands_tokens',
    feature: 'Add / Edit Client Brands & Tokens',
    SUPER_ADMIN: true,
    AGENCY_ADMIN: true,
    BRAND_MANAGER: false,
    CONTENT_CREATOR: false,
    CLIENT_VIEWER: false,
  },
  {
    id: 'perm_roles_assign',
    feature: 'Assign Employee Roles & Permissions',
    SUPER_ADMIN: true,
    AGENCY_ADMIN: true,
    BRAND_MANAGER: false,
    CONTENT_CREATOR: false,
    CLIENT_VIEWER: false,
  },
  {
    id: 'perm_audit_logs',
    feature: 'Export Performance & Audit Logs',
    SUPER_ADMIN: true,
    AGENCY_ADMIN: true,
    BRAND_MANAGER: true,
    CONTENT_CREATOR: true,
    CLIENT_VIEWER: true,
  },
];

export default function TeamRolesPage() {
  const { user } = useAuth();

  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');

  // Role Definitions & Permissions State
  const [rolesConfig, setRolesConfig] = useState(() => {
    try {
      const saved = localStorage.getItem('postpilot_roles_config');
      return saved ? JSON.parse(saved) : DEFAULT_ROLES_CONFIG;
    } catch {
      return DEFAULT_ROLES_CONFIG;
    }
  });

  const [permissionsMatrix, setPermissionsMatrix] = useState(() => {
    try {
      const saved = localStorage.getItem('postpilot_permissions_matrix');
      return saved ? JSON.parse(saved) : DEFAULT_PERMISSIONS_MATRIX;
    } catch {
      return DEFAULT_PERMISSIONS_MATRIX;
    }
  });

  // Modal 1: Edit Role Details & Permissions
  const [isEditRoleModalOpen, setIsEditRoleModalOpen] = useState(false);
  const [selectedRoleToEdit, setSelectedRoleToEdit] = useState(null);
  const [roleEditForm, setRoleEditForm] = useState({
    id: '',
    label: '',
    description: '',
    permissions: {},
  });

  // Modal 2: Edit Employee Details & Role
  const [isEditEmployeeModalOpen, setIsEditEmployeeModalOpen] = useState(false);
  const [employeeEditForm, setEmployeeEditForm] = useState({
    userId: '',
    firstName: '',
    lastName: '',
    email: '',
    role: 'CONTENT_CREATOR',
    isActive: true,
  });

  // Modal 3: Add Employee Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addForm, setAddForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    role: 'CONTENT_CREATOR',
  });
  const [submitting, setSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);

  useEffect(() => {
    fetchMembers();
  }, []);

  const fetchMembers = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/organizations/members').catch(async () => {
        return await apiClient.get('/organizations/me');
      });

      const list = res.data?.data?.memberships || res.data?.data || [];
      setMembers(Array.isArray(list) ? list : []);
    } catch (err) {
      console.warn('Failed to load members:', err.message);
      setMembers([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchMembers();
  };

  // Open Edit Role Details Modal
  const handleOpenEditRole = (role) => {
    const roleId = role.id;
    const currentPerms = {};
    permissionsMatrix.forEach((pm) => {
      currentPerms[pm.id] = !!pm[roleId];
    });

    setSelectedRoleToEdit(role);
    setRoleEditForm({
      id: roleId,
      label: role.label,
      description: role.description,
      permissions: currentPerms,
    });
    setIsEditRoleModalOpen(true);
  };

  // Save Role Details & Permissions
  const handleSaveRoleDetails = (e) => {
    e.preventDefault();
    if (!roleEditForm.label) {
      alert('Role label is required.');
      return;
    }

    const updatedRoles = rolesConfig.map((r) =>
      r.id === roleEditForm.id
        ? { ...r, label: roleEditForm.label, description: roleEditForm.description }
        : r
    );
    setRolesConfig(updatedRoles);
    localStorage.setItem('postpilot_roles_config', JSON.stringify(updatedRoles));

    const updatedMatrix = permissionsMatrix.map((pm) => ({
      ...pm,
      [roleEditForm.id]: !!roleEditForm.permissions[pm.id],
    }));
    setPermissionsMatrix(updatedMatrix);
    localStorage.setItem('postpilot_permissions_matrix', JSON.stringify(updatedMatrix));

    setIsEditRoleModalOpen(false);
    setStatusMessage({
      type: 'success',
      text: `Role details and permissions for "${roleEditForm.label}" saved successfully!`,
    });
    setTimeout(() => setStatusMessage(null), 3500);
  };

  // Open Edit Employee Details Modal
  const handleOpenEditEmployee = (mem) => {
    const targetUserId = mem.userId || mem.user?.id;
    setEmployeeEditForm({
      userId: targetUserId,
      firstName: mem.user?.firstName || '',
      lastName: mem.user?.lastName || '',
      email: mem.user?.email || '',
      role: mem.role || 'CONTENT_CREATOR',
      isActive: mem.user?.isActive !== false,
    });
    setIsEditEmployeeModalOpen(true);
  };

  // Save Employee Details & Role
  const handleSaveEmployeeDetails = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await apiClient.patch(`/organizations/members/${employeeEditForm.userId}`, {
        firstName: employeeEditForm.firstName,
        lastName: employeeEditForm.lastName,
        email: employeeEditForm.email,
        role: employeeEditForm.role,
        isActive: employeeEditForm.isActive,
      });

      setMembers((prev) =>
        prev.map((m) => {
          const mUserId = m.userId || m.user?.id;
          if (mUserId === employeeEditForm.userId) {
            return {
              ...m,
              role: employeeEditForm.role,
              user: {
                ...m.user,
                firstName: employeeEditForm.firstName,
                lastName: employeeEditForm.lastName,
                email: employeeEditForm.email,
                isActive: employeeEditForm.isActive,
              },
            };
          }
          return m;
        })
      );

      setIsEditEmployeeModalOpen(false);
      setStatusMessage({
        type: 'success',
        text: `Details and role for ${employeeEditForm.firstName} ${employeeEditForm.lastName} updated!`,
      });
      setTimeout(() => setStatusMessage(null), 3500);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update employee details');
    } finally {
      setSubmitting(false);
    }
  };

  // Quick Inline Role update
  const handleUpdateRoleInline = async (targetUserId, newRole) => {
    try {
      await apiClient.patch(`/organizations/members/${targetUserId}/role`, { role: newRole });
      setMembers((prev) =>
        prev.map((m) =>
          m.userId === targetUserId || m.user?.id === targetUserId
            ? { ...m, role: newRole }
            : m
        )
      );
      setStatusMessage({
        type: 'success',
        text: `Employee role updated to ${newRole.replace('_', ' ')}!`,
      });
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (err) {
      setStatusMessage({
        type: 'error',
        text: err.response?.data?.message || 'Failed to update employee role.',
      });
    }
  };

  // Remove Employee
  const handleRemoveMember = async (targetUserId, memberName) => {
    if (!window.confirm(`Are you sure you want to remove ${memberName} from this organization?`)) {
      return;
    }

    try {
      await apiClient.delete(`/organizations/members/${targetUserId}`);
      setMembers((prev) => prev.filter((m) => m.userId !== targetUserId && m.user?.id !== targetUserId));
      setStatusMessage({
        type: 'success',
        text: `${memberName} has been removed from the organization.`,
      });
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (err) {
      setStatusMessage({
        type: 'error',
        text: err.response?.data?.message || 'Failed to remove member.',
      });
    }
  };

  // Add Employee
  const handleAddEmployee = async (e) => {
    e.preventDefault();
    if (!addForm.email || !addForm.firstName) {
      alert('Please fill out all required fields.');
      return;
    }

    setSubmitting(true);
    try {
      const { data } = await apiClient.post('/organizations/members', addForm);
      const newMember = data.data;

      setMembers((prev) => [...prev, newMember]);
      setIsAddModalOpen(false);
      setAddForm({
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        role: 'CONTENT_CREATOR',
      });
      setStatusMessage({
        type: 'success',
        text: `Employee ${addForm.firstName} ${addForm.lastName} (${addForm.role}) created successfully!`,
      });
      setTimeout(() => setStatusMessage(null), 4000);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to add employee');
    } finally {
      setSubmitting(false);
    }
  };

  // Filtered members list
  const filteredMembers = members.filter((m) => {
    const fullName = `${m.user?.firstName || ''} ${m.user?.lastName || ''}`.toLowerCase();
    const email = (m.user?.email || '').toLowerCase();
    const matchesSearch = fullName.includes(searchTerm.toLowerCase()) || email.includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'ALL' || m.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const adminCount = members.filter((m) => m.role === 'SUPER_ADMIN' || m.role === 'AGENCY_ADMIN').length;
  const managerCount = members.filter((m) => m.role === 'BRAND_MANAGER').length;
  const creatorCount = members.filter((m) => m.role === 'CONTENT_CREATOR').length;
  const viewerCount = members.filter((m) => m.role === 'CLIENT_VIEWER').length;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 animate-fade-in">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Team & Role Management</h1>
            <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>RBAC Security Active</span>
            </span>
          </div>
          <p className="text-slate-500 text-xs sm:text-sm mt-1">
            Manage organization employees, assign & edit roles, and customize role permissions across client brands.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-2.5 text-slate-600 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl shadow-sm transition disabled:opacity-50"
            title="Refresh employee roster"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-indigo-600' : ''}`} />
          </button>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-lg shadow-indigo-600/30 transition flex items-center space-x-2"
          >
            <UserPlus className="w-4 h-4" />
            <span>Add New Employee</span>
          </button>
        </div>
      </div>

      {/* Status Notification */}
      {statusMessage && (
        <div
          className={`p-4 rounded-xl border flex items-center space-x-3 text-xs font-semibold ${
            statusMessage.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}
        >
          {statusMessage.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
          )}
          <span className="flex-1">{statusMessage.text}</span>
          <button onClick={() => setStatusMessage(null)} className="text-xs opacity-60 hover:opacity-100">
            ✕
          </button>
        </div>
      )}

      {/* 2. Role Overview Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Employees</span>
            <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-3xl font-black text-slate-900">{members.length}</span>
            <span className="text-xs text-emerald-600 font-bold">Active Staff</span>
          </div>
          <p className="text-xs text-slate-400 mt-1">Multi-client organization</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Admins & Leadership</span>
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
              <Shield className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-3xl font-black text-slate-900">{adminCount}</span>
            <span className="text-xs text-indigo-600 font-bold">Full Authority</span>
          </div>
          <p className="text-xs text-slate-400 mt-1">Token & Role Management</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Content Creators</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <UserCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-3xl font-black text-slate-900">{creatorCount}</span>
            <span className="text-xs text-emerald-600 font-bold">Publishing Queue</span>
          </div>
          <p className="text-xs text-slate-400 mt-1">Composers & Designers</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Managers & Reviewers</span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-3xl font-black text-slate-900">{managerCount + viewerCount}</span>
            <span className="text-xs text-blue-600 font-bold">Approvers</span>
          </div>
          <p className="text-xs text-slate-400 mt-1">Brand Managers & Clients</p>
        </div>
      </div>

      {/* 3. Employee Directory & Role Edit Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden space-y-4 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-base font-extrabold text-slate-900 tracking-tight flex items-center space-x-2">
              <Users className="w-4 h-4 text-indigo-600" />
              <span>Employee Directory & Role Assignment</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Change any employee's role in real-time or click "Edit" to modify their details.
            </p>
          </div>

          {/* Search & Filter */}
          <div className="flex items-center space-x-2.5">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Search by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 w-48 sm:w-56"
              />
            </div>

            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="ALL">All Roles</option>
              {rolesConfig.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto border border-slate-200 rounded-xl">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
              <tr>
                <th className="py-3.5 px-4">Employee</th>
                <th className="py-3.5 px-4">Work Email</th>
                <th className="py-3.5 px-4">Assigned Role</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredMembers.map((mem) => {
                const targetUserId = mem.userId || mem.user?.id;
                const isSelf = targetUserId === user?.id;
                const roleConfig = rolesConfig.find((r) => r.id === mem.role) || rolesConfig[3];
                const displayName = `${mem.user?.firstName || 'Staff'} ${mem.user?.lastName || 'Member'}`;

                return (
                  <tr key={mem.id || targetUserId} className="hover:bg-slate-50/70 transition">
                    <td className="py-4 px-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-800 text-white font-extrabold flex items-center justify-center text-xs shadow-sm">
                          {(mem.user?.firstName?.[0] || 'U').toUpperCase()}
                          {(mem.user?.lastName?.[0] || '').toUpperCase()}
                        </div>
                        <div>
                          <div className="font-extrabold text-slate-900 flex items-center space-x-1.5">
                            <span>{displayName}</span>
                            {isSelf && (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-600 border border-indigo-200">
                                You
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-slate-400 font-mono">ID: {targetUserId}</span>
                        </div>
                      </div>
                    </td>

                    <td className="py-4 px-4 font-mono text-slate-600">
                      <div className="flex items-center space-x-1.5">
                        <Mail className="w-3.5 h-3.5 text-slate-400" />
                        <span>{mem.user?.email}</span>
                      </div>
                    </td>

                    <td className="py-4 px-4">
                      <div className="flex items-center space-x-2">
                        <select
                          value={mem.role}
                          disabled={isSelf}
                          onChange={(e) => handleUpdateRoleInline(targetUserId, e.target.value)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer ${roleConfig.color}`}
                        >
                          {rolesConfig.map((r) => (
                            <option key={r.id} value={r.id}>
                              {r.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </td>

                    <td className="py-4 px-4">
                      <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                        <span>Active</span>
                      </span>
                    </td>

                    <td className="py-4 px-4 text-right">
                      <div className="flex items-center justify-end space-x-1">
                        <button
                          onClick={() => handleOpenEditEmployee(mem)}
                          className="p-1.5 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-lg transition"
                          title="Edit employee details and role"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        {!isSelf && (
                          <button
                            onClick={() => handleRemoveMember(targetUserId, displayName)}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                            title="Remove employee from organization"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. Configured Roles & Edit Role Details Cards */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h2 className="text-base font-extrabold text-slate-900 tracking-tight flex items-center space-x-2">
              <Sliders className="w-4 h-4 text-indigo-600" />
              <span>Configured Roles & Granular Authority</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Click "Edit Role Details" on any role to customize its title, description, or capability checkmarks.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {rolesConfig.map((role) => (
            <div
              key={role.id}
              className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:border-slate-300 transition flex flex-col justify-between space-y-3"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className={`px-2.5 py-1 rounded-lg text-xs font-extrabold border ${role.color}`}>
                    {role.label}
                  </span>
                  <button
                    onClick={() => handleOpenEditRole(role)}
                    className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-white rounded-lg transition border border-transparent hover:border-slate-200 flex items-center space-x-1 text-[11px] font-bold"
                    title="Edit role title, description & permissions"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Edit Role</span>
                  </button>
                </div>
                <p className="text-xs text-slate-500 mt-2.5 line-clamp-3">{role.description}</p>
              </div>

              <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-400">
                <span>Code: {role.id}</span>
                <span className="font-semibold text-indigo-600">
                  {members.filter((m) => m.role === role.id).length} employee(s)
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 5. Granular Permissions Matrix Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
        <div>
          <h2 className="text-base font-extrabold text-slate-900 tracking-tight flex items-center space-x-2">
            <ShieldCheck className="w-4 h-4 text-indigo-600" />
            <span>Role Permissions & Capability Matrix</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Active capability matrix across system roles. Click any role's "Edit Role" card above to modify checkmarks.
          </p>
        </div>

        <div className="overflow-x-auto border border-slate-200 rounded-xl">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Feature / Action</th>
                {rolesConfig.map((r) => (
                  <th key={r.id} className="py-3 px-4 text-center">
                    {r.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {permissionsMatrix.map((perm) => (
                <tr key={perm.id || perm.feature} className="hover:bg-slate-50/60 transition">
                  <td className="py-3 px-4 font-semibold text-slate-900">{perm.feature}</td>
                  {rolesConfig.map((r) => {
                    const allowed = perm[r.id];
                    return (
                      <td key={r.id} className="py-3 px-4 text-center">
                        {allowed ? (
                          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 font-black">
                            <Check className="w-3.5 h-3.5" />
                          </span>
                        ) : (
                          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-slate-100 text-slate-400 font-black">
                            <X className="w-3 h-3" />
                          </span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL 1: Edit Role Details & Permissions */}
      <Modal
        isOpen={isEditRoleModalOpen}
        onClose={() => setIsEditRoleModalOpen(false)}
        title={`Edit Role Details: ${selectedRoleToEdit?.label || ''}`}
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleSaveRoleDetails} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Role Title / Display Name *</label>
            <input
              type="text"
              required
              value={roleEditForm.label}
              onChange={(e) => setRoleEditForm({ ...roleEditForm, label: e.target.value })}
              className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Role Description</label>
            <textarea
              rows={2}
              value={roleEditForm.description}
              onChange={(e) => setRoleEditForm({ ...roleEditForm, description: e.target.value })}
              className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2">Granted Feature Capabilities</label>
            <div className="space-y-2 max-h-56 overflow-y-auto p-3 bg-slate-50 border border-slate-200 rounded-xl">
              {permissionsMatrix.map((pm) => {
                const isChecked = !!roleEditForm.permissions[pm.id];
                return (
                  <label
                    key={pm.id}
                    className="flex items-center space-x-2.5 text-xs text-slate-800 font-medium cursor-pointer hover:text-indigo-600 transition"
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={(e) =>
                        setRoleEditForm({
                          ...roleEditForm,
                          permissions: {
                            ...roleEditForm.permissions,
                            [pm.id]: e.target.checked,
                          },
                        })
                      }
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                    />
                    <span>{pm.feature}</span>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="pt-3 flex items-center justify-end space-x-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsEditRoleModalOpen(false)}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md transition"
            >
              Save Role Details
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL 2: Edit Employee Details & Role */}
      <Modal
        isOpen={isEditEmployeeModalOpen}
        onClose={() => setIsEditEmployeeModalOpen(false)}
        title="Edit Employee Details & Assigned Role"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleSaveEmployeeDetails} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">First Name *</label>
              <input
                type="text"
                required
                value={employeeEditForm.firstName}
                onChange={(e) => setEmployeeEditForm({ ...employeeEditForm, firstName: e.target.value })}
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Last Name *</label>
              <input
                type="text"
                required
                value={employeeEditForm.lastName}
                onChange={(e) => setEmployeeEditForm({ ...employeeEditForm, lastName: e.target.value })}
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Work Email *</label>
            <input
              type="email"
              required
              value={employeeEditForm.email}
              onChange={(e) => setEmployeeEditForm({ ...employeeEditForm, email: e.target.value })}
              className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Assigned Role *</label>
            <select
              value={employeeEditForm.role}
              onChange={(e) => setEmployeeEditForm({ ...employeeEditForm, role: e.target.value })}
              className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {rolesConfig.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.label} - {r.description}
                </option>
              ))}
            </select>
          </div>

          <div className="pt-3 flex items-center justify-end space-x-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsEditEmployeeModalOpen(false)}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md transition disabled:opacity-50"
            >
              {submitting ? 'Saving...' : 'Save Employee Details'}
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL 3: Add Employee Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add New Employee & Assign Role"
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleAddEmployee} className="space-y-4">
          <p className="text-xs text-slate-500">
            Create an employee login for your agency team. They can log in immediately using their email and credentials.
          </p>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">First Name *</label>
              <input
                type="text"
                required
                value={addForm.firstName}
                onChange={(e) => setAddForm({ ...addForm, firstName: e.target.value })}
                placeholder="e.g. Rachel"
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Last Name *</label>
              <input
                type="text"
                required
                value={addForm.lastName}
                onChange={(e) => setAddForm({ ...addForm, lastName: e.target.value })}
                placeholder="e.g. Green"
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Work Email Address *</label>
            <input
              type="email"
              required
              value={addForm.email}
              onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
              placeholder="rachel@agency.com"
              className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Initial Password *</label>
            <input
              type="password"
              required
              value={addForm.password}
              onChange={(e) => setAddForm({ ...addForm, password: e.target.value })}
              placeholder="Temporary password (min 8 chars)"
              className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Assigned Role *</label>
            <select
              value={addForm.role}
              onChange={(e) => setAddForm({ ...addForm, role: e.target.value })}
              className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {rolesConfig.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.label} - {r.description}
                </option>
              ))}
            </select>
          </div>

          <div className="pt-3 flex items-center justify-end space-x-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md transition disabled:opacity-50"
            >
              {submitting ? 'Creating Employee...' : 'Add Employee'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
