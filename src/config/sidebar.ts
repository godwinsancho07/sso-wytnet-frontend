/**
 * Central sidebar registry.
 *
 * Adding a new role = adding a new entry to `SIDEBAR_BY_ROLE`.
 * No layout code changes.
 *
 * Core principle: Role determines dashboard. Permission determines actions.
 */
import {
  Home, Users, Briefcase, Lock, Activity, Shield,
  AlertTriangle, BarChart3, Link2, Settings, KeySquare, Globe,
  BarChart2, Layers, ShoppingBag
} from 'lucide-react';

export interface SidebarItem {
  to?: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  /** Optional permission required to render this item. Frontend hint only — backend still enforces. */
  permission?: string;
  /** Section label (groups sidebar items) */
  section?: 'main' | 'self' | 'system';
  children?: { to: string; label: string; icon: React.ComponentType<{ className?: string }> }[];
}

export const SIDEBAR_BY_ROLE: Record<string, SidebarItem[]> = {
  super_admin: [
    // Platform
    { to: '/admin/dashboard',   label: 'Overview',          icon: Home,          section: 'main' },
    { to: '/admin/users',       label: 'Users',             icon: Users,         section: 'main' },
    { to: '/admin/clients',     label: 'OAuth Clients',     icon: Briefcase,     section: 'main' },
    { to: '/admin/plans',       label: 'Plans',             icon: Layers,        section: 'main' },
    { to: '/admin/revenue',     label: 'Revenue',           icon: BarChart3,     section: 'main' },
    { to: '/admin/roles',       label: 'Roles',             icon: Lock,          section: 'main' },
    { to: '/admin/sessions',    label: 'Sessions',          icon: Activity,      section: 'main' },
    { to: '/admin/security',    label: 'Security Center',   icon: Shield,        section: 'main' },
    { to: '/admin/providers',   label: 'Social Providers',  icon: Globe,         section: 'main' },
    { to: '/admin/reports',     label: 'Reports',           icon: BarChart2,     section: 'main' },
    // Marketplace Collapsible
    {
      label: 'Marketplace',
      icon: ShoppingBag,
      section: 'main',
      children: [
        { to: '/admin/marketplace/pending', label: 'Pending Approvals', icon: AlertTriangle },
        { to: '/admin/marketplace/all',     label: 'All Listings',      icon: Layers },
        { to: '/admin/marketplace/categories', label: 'Categories',     icon: Globe },
        { to: '/admin/marketplace/settings',  label: 'Settings',        icon: Settings },
      ]
    },
    { to: '/admin/settings',    label: 'Settings',          icon: Settings,      section: 'system' },
    // Self
    { to: '/profile',           label: 'My Profile',        icon: Users,         section: 'self' },
    { to: '/sessions',          label: 'My Sessions',       icon: Activity,      section: 'self' },
    { to: '/security',          label: 'My Security',       icon: KeySquare,     section: 'self' },
  ],

  app_admin: [
    { to: '/app-admin/dashboard', label: 'Overview',     icon: Home,         section: 'main' },
    { to: '/app-admin/clients',   label: 'My Apps',      icon: Briefcase,    section: 'main' },
    { to: '/app-admin/plans',     label: 'Plan & Credits', icon: Layers,       section: 'main' },
    { to: '/app-admin/credits',   label: 'Credit Logs',   icon: Activity,     section: 'main' },
    { to: '/applications',        label: 'Connected Apps', icon: Link2,       section: 'main' },
    // Marketplace Collapsible
    {
      label: 'Marketplace',
      icon: ShoppingBag,
      section: 'main',
      children: [
        { to: '/app-admin/marketplace/submit', label: 'Submit App',    icon: Shield },
        { to: '/app-admin/marketplace/listings', label: 'My Listings',  icon: Briefcase },
        { to: '/app-admin/marketplace/revenue', label: 'Revenue',      icon: BarChart3 },
        { to: '/app-admin/marketplace/subscribers', label: 'Subscribers', icon: Users },
        { to: '/app-admin/marketplace/refunds', label: 'Refunds',      icon: AlertTriangle },
      ]
    },
    // Self
    { to: '/profile',             label: 'Profile',      icon: Users,        section: 'self' },
    { to: '/sessions',            label: 'Sessions',     icon: Activity,     section: 'self' },
    { to: '/security',            label: 'Security',     icon: KeySquare,    section: 'self' },
  ],

  user: [
    { to: '/dashboard',     label: 'Dashboard',       icon: Home,    section: 'main' },
    { to: '/profile',       label: 'Profile',         icon: Users,   section: 'main' },
    { to: '/applications',  label: 'Connected Apps',  icon: Link2,   section: 'main' },
    { to: '/sessions',      label: 'Sessions',        icon: Activity,section: 'main' },
    { to: '/security',      label: 'Security',        icon: Lock,    section: 'main' },
    // Marketplace Collapsible
    {
      label: 'Marketplace',
      icon: ShoppingBag,
      section: 'main',
      children: [
        { to: '/marketplace/browse',       label: 'Browse Apps',      icon: Home },
        { to: '/marketplace/subscriptions', label: 'My Subscriptions', icon: Link2 },
        { to: '/marketplace/orders',        label: 'Purchase History', icon: Activity },
      ]
    },
  ],

};

/**
 * Pick the sidebar matching the highest-privileged role the user has.
 * Order: is_super_admin > app_admin > user.
 */
export function getSidebarByRole(permissions: { roles: string[]; is_super_admin?: boolean } | null): SidebarItem[] {
  if (!permissions) return SIDEBAR_BY_ROLE.user;
  if (permissions.is_super_admin || permissions.roles.includes('super_admin')) {
    return SIDEBAR_BY_ROLE.super_admin;
  }
  if (permissions.roles.includes('app_admin')) {
    return SIDEBAR_BY_ROLE.app_admin;
  }
  return SIDEBAR_BY_ROLE.user;
}

/** Brand label for the sidebar header */
export function getRoleLabel(permissions: { roles: string[]; is_super_admin?: boolean } | null): string {
  if (!permissions) return 'My Account';
  if (permissions.is_super_admin || permissions.roles.includes('super_admin')) {
    return 'Platform Admin';
  }
  if (permissions.roles.includes('app_admin')) {
    return 'App Admin';
  }
  return 'My Account';
}
