import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '@/services/supabase/client';
import { hasSupabaseConfig } from '@/lib/env';
import { createUserProfileIfMissing, fetchUserProfile } from '@/services/userService';

interface AuthContextValue {
  user: User | null;
  role: 'admin' | 'member';
  displayName: string;
  avatarUrl: string | null;
  address: string | null;
  docNumber: string | null;
  initializing: boolean;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  role: 'member',
  displayName: '',
  avatarUrl: null,
  address: null,
  docNumber: null,
  initializing: true,
  refreshProfile: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<'admin' | 'member'>('member');
  const [displayName, setDisplayName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [docNumber, setDocNumber] = useState<string | null>(null);
  const [initializing, setInitializing] = useState(true);

  const applyProfile = (profile: { role?: string | null; full_name?: string | null; avatar_url?: string | null; address?: string | null; doc_number?: string | null } | null, fallbackUser: User | null) => {
    setRole(profile?.role === 'admin' ? 'admin' : 'member');
    setDisplayName(profile?.full_name ?? fallbackUser?.user_metadata?.full_name ?? fallbackUser?.email ?? '');
    setAvatarUrl(profile?.avatar_url ?? null);
    setAddress(profile?.address ?? null);
    setDocNumber(profile?.doc_number ?? null);
  };

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
        setAvatarUrl(null);
        setAddress(null);
        setDocNumber(null);
        setInitializing(false);
        return;
      }

      try {
        await createUserProfileIfMissing(nextUser);
        const profile = await fetchUserProfile(nextUser.id);
        applyProfile(profile, nextUser);
      } catch (error) {
        console.warn('syncUserData:', (error as Error).message);
        applyProfile(null, nextUser);
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

  const refreshProfile = async () => {
    const currentUser = user;
    if (!currentUser) {
      return;
    }
    try {
      const profile = await fetchUserProfile(currentUser.id);
      applyProfile(profile, currentUser);
    } catch (error) {
      console.warn('refreshProfile:', (error as Error).message);
    }
  };

  const value = useMemo(
    () => ({ user, role, displayName, avatarUrl, address, docNumber, initializing, refreshProfile }),
    [user, role, displayName, avatarUrl, address, docNumber, initializing, refreshProfile]
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuthState = () => useContext(AuthContext);