'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { getSupabaseBrowser } from './supabase-browser';

const AuthContext = createContext(undefined);

export function AuthProvider({ children }) {
  // Use browser singleton - ensures ONE GoTrueClient instance
  const supabase = getSupabaseBrowser();
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const init = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (!isMounted) {
          return;
        }

        if (error) {
          console.error('AuthContext: failed to read Supabase session', error);
        }

        setSession(data?.session ?? null);
        setUser(data?.session?.user ?? null);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    init();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (!isMounted) {
        return;
      }
      setSession(newSession);
      setUser(newSession?.user ?? null);
      setLoading(false);
    });

    return () => {
      isMounted = false;
      authListener?.subscription.unsubscribe();
    };
  }, [supabase]);

  const loginWithPassword = useCallback(
    async (email, password) => {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        throw error;
      }
      setSession(data.session ?? null);
      setUser(data.user ?? data.session?.user ?? null);
      return data;
    },
    [supabase]
  );

  const registerWithPassword = useCallback(
    async (email, password, options = {}) => {
      try {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            ...options,
            emailRedirectTo: options.emailRedirectTo || (typeof window !== 'undefined' ? `${window.location.origin}/auth/verify-email` : undefined),
          },
        });
        
        if (error) {
          console.error('Registration error:', error);
          throw error;
        }
        
        // 如果注册成功，更新 session 和 user
        if (data.session) {
          setSession(data.session);
          setUser(data.user ?? data.session.user);
        } else if (data.user) {
          // 如果启用了邮箱验证，可能没有 session
          setUser(data.user);
        }
        
        return data;
      } catch (error) {
        console.error('Registration failed:', error);
        throw error;
      }
    },
    [supabase]
  );

  const loginWithGoogle = useCallback(
    async (options = {}) => {
      try {
        const origin = typeof window !== 'undefined' ? window.location.origin : '';
        const redirectTo = options.redirectTo || (origin ? `${origin}/auth/oauth-success` : undefined);
        
        const { data, error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            ...options,
            redirectTo,
            queryParams: {
              access_type: 'offline',
              prompt: 'consent',
              ...options.queryParams,
            },
          },
        });
        
        if (error) {
          console.error('Google login error:', error);
          throw error;
        }
        
        return data;
      } catch (error) {
        console.error('Google login failed:', error);
        throw error;
      }
    },
    [supabase]
  );

  const logout = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      throw error;
    }
    setSession(null);
    setUser(null);
  }, [supabase]);

  const value = useMemo(
    () => ({
      user,
      session,
      loading,
      loginWithPassword,
      registerWithPassword,
      loginWithGoogle,
      logout,
      supabase, // 导出 supabase 客户端以便在需要时使用
    }),
    [user, session, loading, loginWithPassword, registerWithPassword, loginWithGoogle, logout, supabase]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;