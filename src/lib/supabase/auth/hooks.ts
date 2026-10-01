// lib/supabase/auth/hooks.ts
'use client';

import { useRouter } from 'next/navigation';
import { User, Session } from '@supabase/supabase-js';
import { useAuthContext } from './context';
import { createClient } from '@/lib/supabase/client';

interface UseAuthReturn {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  login: () => void;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
}

/**
 * Simple authentication hook for the boilerplate
 * Provides user state and auth actions
 */
export function useAuth(): UseAuthReturn {
  const { user, session, isLoading } = useAuthContext();
  const router = useRouter();

  const login = () => {
    router.push('/login');
  };

  const logout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  };

  return {
    user,
    session,
    isLoading,
    login,
    logout,
    isAuthenticated: !!user,
  };
}

/**
 * Get user ID from Supabase session
 */
export function useUserId(): string | undefined {
  const { user } = useAuth();
  return user?.id;
}

/**
 * Get user email from Supabase session
 */
export function useUserEmail(): string | undefined {
  const { user } = useAuth();
  return user?.email;
}
