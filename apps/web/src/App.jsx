import React, { useState, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import { BrandProvider } from './context/BrandContext.jsx';
import { ToastProvider } from './components/Toast.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import Sidebar from './components/Sidebar.jsx';
import Navbar from './components/Navbar.jsx';
import NotFoundPage from './components/NotFoundPage.jsx';
import RoleGuard from './components/RoleGuard.jsx';

// Route-level Code Splitting for Performance Budget Optimization
const LoginPage = lazy(() => import('./features/auth/LoginPage.jsx'));
const DashboardPage = lazy(() => import('./features/dashboard/DashboardPage.jsx'));
const PostComposerPage = lazy(() => import('./features/composer/PostComposerPage.jsx'));
const ContentCalendarPage = lazy(() => import('./features/calendar/ContentCalendarPage.jsx'));
const MediaLibraryPage = lazy(() => import('./features/media/MediaLibraryPage.jsx'));
const BulkImportPage = lazy(() => import('./features/bulk-import/BulkImportPage.jsx'));
const WorkflowsPage = lazy(() => import('./features/workflows/WorkflowsPage.jsx'));
const SheetsSyncPage = lazy(() => import('./features/sheets-sync/SheetsSyncPage.jsx'));
const ReportsPage = lazy(() => import('./features/reports/ReportsPage.jsx'));
const TeamRolesPage = lazy(() => import('./features/team/TeamRolesPage.jsx'));
const SettingsPage = lazy(() => import('./features/settings/SettingsPage.jsx'));

function PageFallback() {
  return (
    <div className="p-8 max-w-7xl mx-auto space-y-4 animate-pulse">
      <div className="h-6 bg-slate-200 rounded w-1/4"></div>
      <div className="h-32 bg-white border border-slate-200 rounded-2xl p-4"></div>
      <div className="grid grid-cols-3 gap-4">
        <div className="h-28 bg-white border border-slate-200 rounded-2xl"></div>
        <div className="h-28 bg-white border border-slate-200 rounded-2xl"></div>
        <div className="h-28 bg-white border border-slate-200 rounded-2xl"></div>
      </div>
    </div>
  );
}

function ProtectedLayout() {
  const { isAuthenticated, loading } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-slate-900 text-white font-semibold">
        <div className="flex flex-col items-center space-y-3">
          <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-slate-400">Loading PostPilot Workspace...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <BrandProvider>
      <div className="flex min-h-screen bg-slate-50 relative">
        <Sidebar mobileOpen={mobileMenuOpen} setMobileOpen={setMobileMenuOpen} />
        <div className="flex-1 flex flex-col min-w-0">
          <Navbar onToggleMobileMenu={() => setMobileMenuOpen((prev) => !prev)} />
          <main className="flex-1 overflow-y-auto">
            <ErrorBoundary>
              <Suspense fallback={<PageFallback />}>
                <Routes>
                  <Route path="/" element={<Navigate to="/dashboard" replace />} />
                  <Route path="/dashboard" element={<DashboardPage />} />
                  <Route
                    path="/composer"
                    element={
                      <RoleGuard allowedRoles={['CONTENT_CREATOR', 'BRAND_MANAGER', 'AGENCY_ADMIN', 'SUPER_ADMIN']}>
                        <PostComposerPage />
                      </RoleGuard>
                    }
                  />
                  <Route path="/calendar" element={<ContentCalendarPage />} />
                  <Route
                    path="/media"
                    element={
                      <RoleGuard allowedRoles={['CONTENT_CREATOR', 'BRAND_MANAGER', 'AGENCY_ADMIN', 'SUPER_ADMIN']}>
                        <MediaLibraryPage />
                      </RoleGuard>
                    }
                  />
                  <Route
                    path="/bulk-import"
                    element={
                      <RoleGuard allowedRoles={['BRAND_MANAGER', 'AGENCY_ADMIN', 'SUPER_ADMIN']}>
                        <BulkImportPage />
                      </RoleGuard>
                    }
                  />
                  <Route
                    path="/workflows"
                    element={
                      <RoleGuard allowedRoles={['AGENCY_ADMIN', 'SUPER_ADMIN']}>
                        <WorkflowsPage />
                      </RoleGuard>
                    }
                  />
                  <Route
                    path="/sheets-sync"
                    element={
                      <RoleGuard allowedRoles={['BRAND_MANAGER', 'AGENCY_ADMIN', 'SUPER_ADMIN']}>
                        <SheetsSyncPage />
                      </RoleGuard>
                    }
                  />
                  <Route
                    path="/team"
                    element={
                      <RoleGuard allowedRoles={['AGENCY_ADMIN', 'SUPER_ADMIN']}>
                        <TeamRolesPage />
                      </RoleGuard>
                    }
                  />
                  <Route path="/reports" element={<ReportsPage />} />
                  <Route
                    path="/settings"
                    element={
                      <RoleGuard allowedRoles={['BRAND_MANAGER', 'AGENCY_ADMIN', 'SUPER_ADMIN']}>
                        <SettingsPage />
                      </RoleGuard>
                    }
                  />
                  <Route path="*" element={<NotFoundPage />} />
                </Routes>
              </Suspense>
            </ErrorBoundary>
          </main>
        </div>
      </div>
    </BrandProvider>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <ToastProvider>
          <BrowserRouter>
            <Suspense fallback={<PageFallback />}>
              <Routes>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/*" element={<ProtectedLayout />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </ToastProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}
