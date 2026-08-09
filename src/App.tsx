import React from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AdminAuthProvider, useAdminAuth } from './context/AdminAuthContext';
import DashboardLayout from './components/layout/DashboardLayout';
import LoginPage from './pages/LoginPage';
import OverviewPage from './pages/OverviewPage';
import UsersPage from './pages/UsersPage';
import UserDetailPage from './pages/UserDetailPage';
import TenantsPage from './pages/TenantsPage';
import TenantDetailPage from './pages/TenantDetailPage';
import WorkspacesPage from './pages/WorkspacesPage';
import WorkspaceDetailPage from './pages/WorkspaceDetailPage';
import PlansPage from './pages/PlansPage';
import FinancePage from './pages/FinancePage';
import InvitesPage from './pages/InvitesPage';
import UsagePage from './pages/UsagePage';
import ChatRunsPage from './pages/ChatRunsPage';
import ConnectorsPage from './pages/ConnectorsPage';
import DatasourcesPage from './pages/DatasourcesPage';
import FeedbackPage from './pages/FeedbackPage';
import ProvidersPage from './pages/ProvidersPage';
import OpsPage from './pages/OpsPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { status } = useAdminAuth();

  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0b1220]">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-teal-500/20 border-t-teal-400" />
      </div>
    );
  }

  if (status !== 'authenticated') {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<OverviewPage />} />
        <Route path="users" element={<UsersPage />} />
        <Route path="users/:userId" element={<UserDetailPage />} />
        <Route path="tenants" element={<TenantsPage />} />
        <Route path="tenants/:tenantId" element={<TenantDetailPage />} />
        <Route path="workspaces" element={<WorkspacesPage />} />
        <Route path="workspaces/:workspaceId" element={<WorkspaceDetailPage />} />
        <Route path="plans" element={<PlansPage />} />
        <Route path="finance" element={<FinancePage />} />
        <Route path="invites" element={<InvitesPage />} />
        <Route path="usage" element={<UsagePage />} />
        <Route path="chat-runs" element={<ChatRunsPage />} />
        <Route path="connectors" element={<ConnectorsPage />} />
        <Route path="datasources" element={<DatasourcesPage />} />
        <Route path="feedback" element={<FeedbackPage />} />
        <Route path="providers" element={<ProvidersPage />} />
        <Route path="ops" element={<OpsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AdminAuthProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AdminAuthProvider>
    </QueryClientProvider>
  );
}

export default App;
