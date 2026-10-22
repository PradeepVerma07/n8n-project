import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useBrand } from '../context/BrandContext.jsx';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Building2,
  LogOut,
  Plus,
  Menu,
  ChevronDown,
  User,
  Shield,
  HelpCircle,
  Sparkles,
  Check,
} from 'lucide-react';

const ROUTE_TITLES = {
  '/dashboard': 'Publishing Overview',
  '/composer': 'Post Composer',
  '/calendar': 'Content Calendar',
  '/media': 'Media Library',
  '/workflows': 'Automated Workflows',
  '/sheets-sync': 'Google Sheets Synchronization',
  '/bulk-import': 'Bulk CSV Import',
  '/reports': 'Analytics & Reports',
  '/team': 'Team & Access Management',
  '/settings': 'Workspace Settings',
};

export default function Navbar({ onToggleMobileMenu }) {
  const { user, activeOrg, switchOrganization, logout, currentRole } = useAuth();
  const { brands, selectedBrand, selectBrand } = useBrand();
  const navigate = useNavigate();
  const location = useLocation();

  const [orgDropdownOpen, setOrgDropdownOpen] = useState(false);
  const [brandDropdownOpen, setBrandDropdownOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const orgRef = useRef(null);
  const brandRef = useRef(null);
  const userRef = useRef(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (orgRef.current && !orgRef.current.contains(e.target)) setOrgDropdownOpen(false);
      if (brandRef.current && !brandRef.current.contains(e.target)) setBrandDropdownOpen(false);
      if (userRef.current && !userRef.current.contains(e.target)) setUserMenuOpen(false);
    };
    window.addEventListener('mousedown', handleOutsideClick);
    return () => window.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const pageTitle = ROUTE_TITLES[location.pathname] || 'Workspace';
  const roleDisplay = currentRole.replace('_', ' ');

  const handleLogout = async () => {
    setUserMenuOpen(false);
    await logout();
    navigate('/login');
  };

  const isClientViewer = currentRole === 'CLIENT_VIEWER';

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30 select-none shadow-2xs">
      {/* Left: Mobile Toggle & Page Title / Breadcrumbs */}
      <div className="flex items-center space-x-3 min-w-0">
        <button
          type="button"
          onClick={onToggleMobileMenu}
          className="lg:hidden p-2 text-slate-600 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition"
          aria-label="Open Navigation Drawer"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center space-x-2 min-w-0">
          {/* Organization Switcher Dropdown */}
          <div ref={orgRef} className="relative">
            <button
              type="button"
              onClick={() => setOrgDropdownOpen((prev) => !prev)}
              className="flex items-center space-x-2 px-2.5 py-1.5 rounded-xl hover:bg-slate-100 text-slate-800 text-xs font-bold transition border border-transparent hover:border-slate-200"
              aria-expanded={orgDropdownOpen}
              aria-haspopup="true"
            >
              <div className="w-6 h-6 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Building2 className="w-3.5 h-3.5" />
              </div>
              <span className="truncate max-w-[120px] sm:max-w-[160px]">
                {activeOrg?.orgName || 'Apex Media'}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {orgDropdownOpen && (
              <div className="absolute left-0 mt-1.5 w-56 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-50 animate-in fade-in zoom-in-95">
                <div className="px-3 py-1.5 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  Select Organization
                </div>
                {(user?.memberships || [{ orgId: 'org-system-01', orgName: 'Apex Media Agency', role: currentRole }]).map((m) => (
                  <button
                    key={m.orgId}
                    type="button"
                    onClick={() => {
                      switchOrganization(m);
                      setOrgDropdownOpen(false);
                    }}
                    className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                  >
                    <span className="truncate">{m.orgName}</span>
                    {activeOrg?.orgId === m.orgId && <Check className="w-4 h-4 text-indigo-600" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          <span className="text-slate-300">/</span>

          {/* Active Brand Selector Dropdown */}
          <div ref={brandRef} className="relative">
            <button
              type="button"
              onClick={() => setBrandDropdownOpen((prev) => !prev)}
              className="flex items-center space-x-2 px-2.5 py-1.5 rounded-xl bg-slate-100/80 hover:bg-slate-100 text-slate-900 text-xs font-bold transition border border-slate-200"
              aria-expanded={brandDropdownOpen}
              aria-haspopup="true"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="truncate max-w-[120px] sm:max-w-[160px]">
                {selectedBrand?.name || 'Flower plant'}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {brandDropdownOpen && (
              <div className="absolute left-0 mt-1.5 w-56 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-50 animate-in fade-in zoom-in-95">
                <div className="px-3 py-1.5 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  Switch Brand Scope
                </div>
                {brands.map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => {
                      selectBrand(b);
                      setBrandDropdownOpen(false);
                    }}
                    className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                  >
                    <span className="truncate">{b.name}</span>
                    {selectedBrand?.id === b.id && <Check className="w-4 h-4 text-emerald-600" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Right: Primary Create Action & Consistent Unified User Menu */}
      <div className="flex items-center space-x-3">
        {!isClientViewer && (
          <button
            type="button"
            onClick={() => navigate('/composer')}
            className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center space-x-1.5 shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Create Post</span>
            <span className="sm:hidden">Post</span>
          </button>
        )}

        <div className="h-5 w-px bg-slate-200 hidden sm:block" />

        {/* User Account Menu */}
        <div ref={userRef} className="relative">
          <button
            type="button"
            onClick={() => setUserMenuOpen((prev) => !prev)}
            className="flex items-center space-x-2.5 p-1 rounded-xl hover:bg-slate-100 transition"
            aria-expanded={userMenuOpen}
            aria-haspopup="true"
            aria-label="User Account Menu"
          >
            <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white font-bold flex items-center justify-center text-xs shadow-xs">
              {(user?.firstName?.[0] || 'A').toUpperCase()}
            </div>
            <div className="hidden md:block text-left text-xs">
              <p className="font-bold text-slate-800 leading-tight">
                {user ? `${user.firstName} ${user.lastName}` : 'Administrator'}
              </p>
              <p className="text-[10px] text-slate-400 font-medium">
                {roleDisplay}
              </p>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
          </button>

          {userMenuOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-2xl border border-slate-200 py-2 z-50 animate-in fade-in zoom-in-95">
              <div className="px-4 py-2 border-b border-slate-100">
                <p className="text-xs font-bold text-slate-900">{user?.email || 'admin@apexmedia.com'}</p>
                <span className="inline-block px-1.5 py-0.5 mt-1 text-[9px] uppercase font-bold tracking-wider bg-indigo-50 text-indigo-700 rounded border border-indigo-200">
                  {roleDisplay}
                </span>
              </div>

              <div className="py-1">
                <button
                  type="button"
                  onClick={() => {
                    setUserMenuOpen(false);
                    navigate('/settings');
                  }}
                  className="w-full flex items-center space-x-2.5 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition"
                >
                  <User className="w-4 h-4 text-slate-400" />
                  <span>Profile & Preferences</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setUserMenuOpen(false);
                    navigate('/settings');
                  }}
                  className="w-full flex items-center space-x-2.5 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition"
                >
                  <Shield className="w-4 h-4 text-slate-400" />
                  <span>Security & MFA</span>
                </button>
                <a
                  href="/api/docs"
                  target="_blank"
                  rel="noreferrer"
                  className="w-full flex items-center space-x-2.5 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition"
                >
                  <HelpCircle className="w-4 h-4 text-slate-400" />
                  <span>API Documentation</span>
                </a>
              </div>

              <div className="pt-1 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full flex items-center space-x-2.5 px-4 py-2 text-xs font-bold text-red-600 hover:bg-red-50 transition"
                >
                  <LogOut className="w-4 h-4 text-red-500" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
