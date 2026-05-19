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
import ExploreApps from '@/pages/ExploreApps';
import BannedPage from '@/pages/BannedPage';

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
import PlansAdmin from '@/pages/admin/PlansAdmin';
import EditPlan from '@/pages/admin/EditPlan';
import RevenueAdmin from '@/pages/admin/RevenueAdmin';

// App-admin pages
import AppAdminDashboard from '@/pages/admin/AppAdminDashboard';
import AppAdminClients from '@/pages/admin/AppAdminClients';
import AppUsers from '@/pages/admin/AppUsers';
import UpgradePlan from '@/pages/admin/UpgradePlan';
import PlanAndCredits from '@/pages/dashboard/PlanAndCredits';
import CreditLogs from '@/pages/dashboard/CreditLogs';
import PricingPage from '@/pages/Pricing';

// Marketplace User Pages
import BrowseApps from '@/pages/marketplace/BrowseApps';
import MySubscriptions from '@/pages/marketplace/MySubscriptions';
import PurchaseHistory from '@/pages/marketplace/PurchaseHistory';

// Marketplace Developer Pages
import SubmitApp from '@/pages/admin/marketplace/SubmitApp';
import MyListings from '@/pages/admin/marketplace/MyListings';
import DeveloperRevenue from '@/pages/admin/marketplace/DeveloperRevenue';
import Subscribers from '@/pages/admin/marketplace/Subscribers';
import DeveloperRefunds from '@/pages/admin/marketplace/DeveloperRefunds';

// Marketplace Super Admin Pages
import PendingApprovals from '@/pages/admin/marketplace/PendingApprovals';
import AllListings from '@/pages/admin/marketplace/AllListings';
import MarketplaceCategories from '@/pages/admin/marketplace/MarketplaceCategories';
import MarketplaceSettings from '@/pages/admin/marketplace/MarketplaceSettings';

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
        <Route path="/explore"         element={<ExploreApps />} />
        <Route path="/banned"          element={<BannedPage />} />

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
          <Route path="/plans"        element={<PricingPage />} />

          {/* User Marketplace */}
          <Route path="/marketplace/browse" element={<BrowseApps />} />
          <Route path="/marketplace/subscriptions" element={<MySubscriptions />} />
          <Route path="/marketplace/orders" element={<PurchaseHistory />} />

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
          <Route path="/admin/plans" element={
            <RoleGate requireRoles={['super_admin']} fallback="/dashboard">
              <PlansAdmin />
            </RoleGate>
          } />
          <Route path="/admin/plans/new" element={
            <RoleGate requireRoles={['super_admin']} fallback="/dashboard">
              <EditPlan />
            </RoleGate>
          } />
          <Route path="/admin/plans/:id/edit" element={
            <RoleGate requireRoles={['super_admin']} fallback="/dashboard">
              <EditPlan />
            </RoleGate>
          } />
          <Route path="/admin/revenue" element={
            <RoleGate requireRoles={['super_admin']} fallback="/dashboard">
              <RevenueAdmin />
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

          {/* Super Admin Marketplace */}
          <Route path="/admin/marketplace/pending" element={
            <RoleGate requireRoles={['super_admin']} fallback="/dashboard">
              <PendingApprovals />
            </RoleGate>
          } />
          <Route path="/admin/marketplace/all" element={
            <RoleGate requireRoles={['super_admin']} fallback="/dashboard">
              <AllListings />
            </RoleGate>
          } />
          <Route path="/admin/marketplace/categories" element={
            <RoleGate requireRoles={['super_admin']} fallback="/dashboard">
              <MarketplaceCategories />
            </RoleGate>
          } />
          <Route path="/admin/marketplace/settings" element={
            <RoleGate requireRoles={['super_admin']} fallback="/dashboard">
              <MarketplaceSettings />
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
          <Route path="/app-admin/clients/:clientId/users" element={
            <RoleGate requireRoles={['app_admin', 'super_admin']} fallback="/dashboard">
              <AppUsers />
            </RoleGate>
          } />
          <Route path="/app-admin/clients/:clientId/upgrade" element={
            <RoleGate requireRoles={['app_admin', 'super_admin']} fallback="/dashboard">
              <UpgradePlan />
            </RoleGate>
          } />
          <Route path="/app-admin/plans" element={
            <RoleGate requireRoles={['app_admin', 'super_admin']} fallback="/dashboard">
              <PlanAndCredits />
            </RoleGate>
          } />
          <Route path="/app-admin/credits" element={
            <RoleGate requireRoles={['app_admin', 'super_admin']} fallback="/dashboard">
              <CreditLogs />
            </RoleGate>
          } />

          {/* Developer/App Admin Marketplace */}
          <Route path="/app-admin/marketplace/submit" element={
            <RoleGate requireRoles={['app_admin', 'super_admin']} fallback="/dashboard">
              <SubmitApp />
            </RoleGate>
          } />
          <Route path="/app-admin/marketplace/listings" element={
            <RoleGate requireRoles={['app_admin', 'super_admin']} fallback="/dashboard">
              <MyListings />
            </RoleGate>
          } />
          <Route path="/app-admin/marketplace/revenue" element={
            <RoleGate requireRoles={['app_admin', 'super_admin']} fallback="/dashboard">
              <DeveloperRevenue />
            </RoleGate>
          } />
          <Route path="/app-admin/marketplace/subscribers" element={
            <RoleGate requireRoles={['app_admin', 'super_admin']} fallback="/dashboard">
              <Subscribers />
            </RoleGate>
          } />
          <Route path="/app-admin/marketplace/refunds" element={
            <RoleGate requireRoles={['app_admin', 'super_admin']} fallback="/dashboard">
              <DeveloperRefunds />
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
