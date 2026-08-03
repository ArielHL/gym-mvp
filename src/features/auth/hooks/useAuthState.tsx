import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '@/services/supabase/client';
import { hasSupabaseConfig } from '@/lib/env';
import { createUserProfileIfMissing, fetchUserProfile } from '@/services/userService';

interface AuthContextValue {
  user: User | null;
  role: 'admin' | 'member';
  displayName: string;
  initializing: boolean;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  role: 'member',
  displayName: '',
  initializing: true
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<'admin' | 'member'>('member');
  const [displayName, setDisplayName] = useState('');
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    let mounted = true;

    if (!hasSupabaseConfig) {
      setInitializing(false);
      return () => {
        mounted = false;
      };
    }

    const syncUserData = async (nextUser: User | null) => {
      if (!mounted) {
        return;
      }

      setUser(nextUser);

      if (!nextUser) {
        setRole('member');
        setDisplayName('');
        setInitializing(false);
        return;
      }

      try {
        await createUserProfileIfMissing(nextUser);
        const profile = await fetchUserProfile(nextUser.id);
        setRole(profile?.role ?? 'member');
        setDisplayName(profile?.full_name ?? nextUser.user_metadata?.full_name ?? nextUser.email ?? '');
      } catch (error) {
        console.warn('syncUserData:', (error as Error).message);
        setRole('member');
        setDisplayName(nextUser.user_metadata?.full_name ?? nextUser.email ?? '');
      }
      setInitializing(false);
    };

    supabase.auth
      .getSession()
      .then(({ data }) => {
        syncUserData(data.session?.user ?? null).catch(() => {
          if (mounted) {
            setInitializing(false);
          }
        });
      })
      .catch(() => {
        if (mounted) {
          setInitializing(false);
        }
      });

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, session) => {
      syncUserData(session?.user ?? null).catch(() => {
        if (mounted) {
          setInitializing(false);
        }
      });
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const value = useMemo(
    () => ({ user, role, displayName, initializing }),
    [displayName, initializing, role, user]
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuthState = () => useContext(AuthContext);
