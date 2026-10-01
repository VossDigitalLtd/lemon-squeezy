import { User, Session } from '@supabase/supabase-js';

// Auth context value
export interface AuthContextValue {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
}

// useAuth hook return type
export interface UseAuthReturn extends AuthContextValue {
  login: () => void;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
}
