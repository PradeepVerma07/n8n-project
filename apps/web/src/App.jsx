import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import { BrandProvider } from './context/BrandContext.jsx';
import Sidebar from './components/Sidebar.jsx';
import Navbar from './components/Navbar.jsx';
import LoginPage from './features/auth/LoginPage.jsx';
import MediaLibraryPage from './features/media/MediaLibraryPage.jsx';
import PostComposerPage from './features/composer/PostComposerPage.jsx';
import ContentCalendarPage from './features/calendar/ContentCalendarPage.jsx';
import BulkImportPage from './features/bulk-import/BulkImportPage.jsx';
import WorkflowsPage from './features/workflows/WorkflowsPage.jsx';
import SheetsSyncPage from './features/sheets-sync/SheetsSyncPage.jsx';
import DashboardPage from './features/dashboard/DashboardPage.jsx';
import ReportsPage from './features/reports/ReportsPage.jsx';
import SettingsPage from './features/settings/SettingsPage.jsx';
import TeamRolesPage from './features/team/TeamRolesPage.jsx';

function ProtectedLayout() {
  const { isAuthenticated, loading } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-slate-900 text-white font-semibold">
        <div className="flex flex-col items-center space-y-3">
          <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm">Loading PostPilot Workspace...</p>
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
            <Routes>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/calendar" element={<ContentCalendarPage />} />
              <Route path="/composer" element={<PostComposerPage />} />
              <Route path="/media" element={<MediaLibraryPage />} />
              <Route path="/bulk-import" element={<BulkImportPage />} />
              <Route path="/workflows" element={<WorkflowsPage />} />
              <Route path="/team" element={<TeamRolesPage />} />
              <Route path="/reports" element={<ReportsPage />} />
              <Route path="/sheets-sync" element={<SheetsSyncPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route
                path="*"
                element={<Navigate to="/dashboard" replace />}
              />
            </Routes>
          </main>
        </div>
      </div>
    </BrandProvider>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/*" element={<ProtectedLayout />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
