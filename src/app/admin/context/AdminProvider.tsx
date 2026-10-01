'use client';

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { useAuth } from '@/lib/supabase/auth';

interface AdminContextType {
  // Modal management
  openModal: string | null;
  setOpenModal: (modalId: string | null) => void;
  open: (modalId: string) => void;
  close: () => void;
  isOpen: (modalId: string) => boolean;
  // Current user's profile — shared across the entire admin area
  role: string | null;
  roleLoading: boolean;
  profileName: string | null;
  profileAvatarUrl: string | null;
}

const AdminContext = createContext<AdminContextType | null>(null);

export function AdminProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();

  const [openModal, setOpenModal] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [roleLoading, setRoleLoading] = useState(true);
  const [profileName, setProfileName] = useState<string | null>(null);
  const [profileAvatarUrl, setProfileAvatarUrl] = useState<string | null>(null);

  const open = useCallback((modalId: string) => setOpenModal(modalId), []);
  const close = useCallback(() => setOpenModal(null), []);
  const isOpen = useCallback((modalId: string) => openModal === modalId, [openModal]);

  useEffect(() => {
    if (!user) {
      setRole(null);
      setProfileName(null);
      setProfileAvatarUrl(null);
      setRoleLoading(false);
      return;
    }
    setRoleLoading(true);
    fetch('/api/profile', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.data) {
          if (data.data.role) setRole(data.data.role);
          setProfileName(data.data.full_name ?? null);
          setProfileAvatarUrl(data.data.avatar_url ?? null);
        }
      })
      .catch(() => {})
      .finally(() => setRoleLoading(false));
  }, [user]);

  return (
    <AdminContext.Provider value={{ openModal, setOpenModal, open, close, isOpen, role, roleLoading, profileName, profileAvatarUrl }}>
      {children}
    </AdminContext.Provider>
  );
}

export function useAdminContext(): AdminContextType {
  const context = useContext(AdminContext);
  if (!context) {
    throw new Error('useAdminContext must be used within an AdminProvider');
  }
  return context;
}

export function useModal() {
  const { open, close, isOpen } = useAdminContext();
  return { open, close, isOpen };
}

/** Returns the current user's role and profile display data from the shared admin context. */
export function useAdminRole() {
  const { role, roleLoading, profileName, profileAvatarUrl } = useAdminContext();
  return { role, roleLoading, profileName, profileAvatarUrl };
}
