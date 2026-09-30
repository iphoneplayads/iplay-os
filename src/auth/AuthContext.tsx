import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { User } from '@supabase/supabase-js';
import type { AdminProfile } from '@/types/domain';
import { getActiveBackend, getSupabaseClient, missingCredentialsError } from '@/lib/supabase/client';

interface AuthState {
  /** 'mock' = backend local (dev): admin aberto, sem login real. */
  mode: 'mock' | 'supabase';
  user: User | null;
  profile: AdminProfile | null;
  isAdmin: boolean;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth fora do AuthProvider.');
  return ctx;
}

function friendlyAuthError(message: string): string {
  if (message.includes('Invalid login credentials')) return 'E-mail ou senha inválidos.';
  if (message.includes('Email not confirmed')) return 'E-mail ainda não confirmado. Fale com o responsável.';
  return 'Não foi possível entrar. Tente novamente.';
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const mode = getActiveBackend();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<AdminProfile | null>(null);
  const [loading, setLoading] = useState(mode === 'supabase');

  const loadProfile = useCallback(async (userId: string) => {
    const client = getSupabaseClient();
    if (!client) {
      setProfile(null);
      return;
    }
    const { data } = await client.from('profiles').select('*').eq('id', userId).maybeSingle();
    setProfile((data as AdminProfile | null) ?? null);
  }, []);

  useEffect(() => {
    if (mode === 'mock') return;
    const client = getSupabaseClient();
    if (!client) {
      setLoading(false);
      return;
    }
    let alive = true;
    client.auth.getSession().then(({ data }) => {
      if (!alive) return;
      const u = data.session?.user ?? null;
      setUser(u);
      if (u) void loadProfile(u.id).finally(() => alive && setLoading(false));
      else setLoading(false);
    });
    const { data: sub } = client.auth.onAuthStateChange((_event, session) => {
      const u = session?.user ?? null;
      setUser(u);
      if (u) void loadProfile(u.id);
      else setProfile(null);
    });
    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, [mode, loadProfile]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      const client = getSupabaseClient();
      if (!client) throw missingCredentialsError();
      const { data, error } = await client.auth.signInWithPassword({ email, password });
      if (error) throw new Error(friendlyAuthError(error.message));
      if (data.user) await loadProfile(data.user.id);
    },
    [loadProfile],
  );

  const signOut = useCallback(async () => {
    const client = getSupabaseClient();
    await client?.auth.signOut();
    setUser(null);
    setProfile(null);
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      mode,
      user,
      profile,
      isAdmin: mode === 'mock' ? true : profile?.role === 'admin',
      loading,
      signIn,
      signOut,
    }),
    [mode, user, profile, loading, signIn, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
