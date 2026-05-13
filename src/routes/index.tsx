import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';

// Public pages
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import ForgotPassword from '@/pages/ForgotPassword';
import ResetPassword from '@/pages/ResetPassword';
import VerifyEmail from '@/pages/VerifyEmail';
import SocialCallback from '@/pages/SocialCallback';
import SocialLogin from '@/pages/SocialLogin';
import LandingPage from '@/pages/LandingPage';

// Auth-required (end-user) pages
import Dashboard from '@/pages/Dashboard';
import Profile from '@/pages/Profile';
import Sessions from '@/pages/Sessions';
import Security from '@/pages/Security';
import Applications from '@/pages/Applications';
import OAuthConsent from '@/pages/OAuthConsent';
// Super-admin pages
import SuperAdminDashboard from '@/pages/admin/SuperAdminDashboard';
import UsersAdmin from '@/pages/admin/UsersAdmin';
import ClientsAdmin from '@/pages/admin/ClientsAdmin';
import RolesPermissionsAdmin from '@/pages/admin/RolesPermissionsAdmin';
import SessionsAdmin from '@/pages/admin/SessionsAdmin';
import SecurityCenter from '@/pages/admin/SecurityCenter';
import ProvidersAdmin from '@/pages/admin/ProvidersAdmin';
import ReportsAdmin from '@/pages/admin/ReportsAdmin';
import SettingsAdmin from '@/pages/admin/SettingsAdmin';
import UserDetail from '@/pages/admin/UserDetail';
import CreateUser from '@/pages/admin/CreateUser';

// App-admin pages
import AppAdminDashboard from '@/pages/admin/AppAdminDashboard';
import AppAdminClients from '@/pages/admin/AppAdminClients';

// Layout guards
import ProtectedRoute from './ProtectedRoute';
import RoleGate from './RoleGate';
import AppShell from '@/components/AppShell';

export default function AppRouter() {
  const fetchUser = useAuthStore((s) => s.fetchUser);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        {/* ── Public ───────────────────────────────────────────────── */}
        <Route path="/login"           element={<Login />} />
        <Route path="/register"        element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password"  element={<ResetPassword />} />
        <Route path="/verify-email"    element={<VerifyEmail />} />
        <Route path="/social-callback" element={<SocialCallback />} />
        <Route path="/social-login"    element={<SocialLogin />} />

        {/* OAuth consent — auth required, no shell */}
        <Route path="/consent/authorize" element={
          <ProtectedRoute><OAuthConsent /></ProtectedRoute>
        } />
        <Route path="/oauth/authorize" element={
          <ProtectedRoute><OAuthConsent /></ProtectedRoute>
        } />

        {/* ── Authenticated — shared AppShell ──────────────────────── */}
        <Route element={<ProtectedRoute><AppShell /></ProtectedRoute>}>

          {/* End user */}
          <Route path="/dashboard"    element={<Dashboard />} />
          <Route path="/profile"      element={<Profile />} />
          <Route path="/sessions"     element={<Sessions />} />
          <Route path="/security"     element={<Security />} />
          <Route path="/applications" element={<Applications />} />

          {/* ── Super Admin ────────────────────────────────────────── */}
          <Route path="/admin/dashboard" element={
            <RoleGate requireRoles={['super_admin']} fallback="/dashboard">
              <SuperAdminDashboard />
            </RoleGate>
          } />
          <Route path="/admin/users" element={
            <RoleGate requireRoles={['super_admin']} fallback="/dashboard">
              <UsersAdmin />
            </RoleGate>
          } />
          <Route path="/admin/users/create" element={
            <RoleGate requireRoles={['super_admin']} fallback="/dashboard">
              <CreateUser />
            </RoleGate>
          } />
          <Route path="/admin/users/:userId" element={
            <RoleGate requireRoles={['super_admin']} fallback="/dashboard">
              <UserDetail />
            </RoleGate>
          } />
          <Route path="/admin/clients" element={
            <RoleGate requireRoles={['super_admin']} fallback="/dashboard">
              <ClientsAdmin />
            </RoleGate>
          } />
          <Route path="/admin/roles" element={
            <RoleGate requireRoles={['super_admin']} fallback="/dashboard">
              <RolesPermissionsAdmin />
            </RoleGate>
          } />
          <Route path="/admin/permissions" element={<Navigate to="/admin/roles" replace />} />
          <Route path="/admin/sessions" element={
            <RoleGate requireRoles={['super_admin']} fallback="/dashboard">
              <SessionsAdmin />
            </RoleGate>
          } />
          <Route path="/admin/security" element={
            <RoleGate requireRoles={['super_admin']} fallback="/dashboard">
              <SecurityCenter />
            </RoleGate>
          } />
          <Route path="/admin/providers" element={
            <RoleGate requireRoles={['super_admin']} fallback="/dashboard">
              <ProvidersAdmin />
            </RoleGate>
          } />
          <Route path="/admin/reports" element={
            <RoleGate requireRoles={['super_admin']} fallback="/dashboard">
              <ReportsAdmin />
            </RoleGate>
          } />
          <Route path="/admin/settings" element={
            <RoleGate requireRoles={['super_admin']} fallback="/dashboard">
              <SettingsAdmin />
            </RoleGate>
          } />

          {/* ── App Admin ──────────────────────────────────────────── */}
          <Route path="/app-admin/dashboard" element={
            <RoleGate requireRoles={['app_admin', 'super_admin']} fallback="/dashboard">
              <AppAdminDashboard />
            </RoleGate>
          } />
          <Route path="/app-admin/clients" element={
            <RoleGate requireRoles={['app_admin', 'super_admin']} fallback="/dashboard">
              <AppAdminClients />
            </RoleGate>
          } />
        </Route>

        {/* ── Default landing ── */}
        <Route path="/"  element={<LandingPage />} />
        <Route path="*"  element={<RootRedirect />} />
      </Routes>
    </BrowserRouter>
  );
}

function RootRedirect() {
  const { isAuthenticated, primaryDashboard } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/" replace />;
  return <Navigate to={primaryDashboard()} replace />;
}
