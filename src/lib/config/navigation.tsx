import { ReactElement } from 'react';
import {
  LayoutDashboard,
  Users,
  Settings,
  UtensilsCrossed,
  Tags,
  Globe,
  BarChart3,
} from 'lucide-react';
import { features } from './app';

export interface NavLink {
  href: string;
  icon: ReactElement;
  label: string;
  exact?: boolean;
  minRole?: 'admin' | 'super_admin';
}

export const MAIN_NAV_LINKS: NavLink[] = [
  { href: '/admin', icon: <LayoutDashboard size={18} />, label: 'Dashboard', exact: true },
  { href: '/admin/recipes', icon: <UtensilsCrossed size={18} />, label: 'Recipes' },
  { href: '/admin/categories', icon: <Tags size={18} />, label: 'Categories' },
  { href: '/admin/reports', icon: <BarChart3 size={18} />, label: 'Reports' },
  { href: '/admin/users', icon: <Users size={18} />, label: 'Users', minRole: 'admin' },
];

export interface AccountNavLink {
  href: string;
  label: string;
}

export const ACCOUNT_NAV_LINKS: AccountNavLink[] = [
  { href: '/account', label: 'Overview' },
  { href: '/account/recipe-box', label: 'Recipe box' },
  { href: '/account/profile', label: 'Profile' },
  { href: '/account/security', label: 'Security' },
  { href: '/account/data', label: 'Data & privacy' },
];

export const FRONTEND_NAV_LINKS: AccountNavLink[] = [
  { href: '/recipes', label: 'Recipes' },
  { href: '/recipes?time=30', label: 'Quick meals' },
  { href: '/recipes?cuisine=cypriot', label: 'Cypriot' },
  { href: '/what-we-having', label: 'What We Having?' },
];

export const BOTTOM_NAV_LINKS: NavLink[] = [
  { href: '/', icon: <Globe size={18} />, label: 'View site', exact: true },
  { href: '/admin/settings', icon: <Settings size={18} />, label: 'Settings' },
  ...(features.developer
    ? []
    : []),
];
