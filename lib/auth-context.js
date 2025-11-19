'use client';

import { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { getSupabaseBrowserClient } from './supabase/client';

const AuthContext = createContext(undefined);

export function AuthProvider({ children }) {
  // Use browser singleton - ensures ONE GoTrueClient instance
  // All authentication state comes from Supabase - no localStorage.userSession
  const supabase = getSupabaseBrowserClient();
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const init = async () => {
      try {
        // Step 1: First check if there's an active session
        // getSession() reads from localStorage/cookies and does NOT throw errors when no session exists
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        
        if (!isMounted) {
          return;
        }

        // If there's an error getting the session, log it and set unauthenticated state
        if (sessionError) {
          console.warn('AuthContext: Error getting session:', sessionError);
          setSession(null);
          setUser(null);
          setLoading(false);
          return;
        }

        // Step 2: If no session exists, set unauthenticated state
        // DO NOT call getUser() when there's no session - it will throw AuthSessionMissingError
        if (!sessionData?.session) {
          setSession(null);
          setUser(null);
          setLoading(false);
          return;
        }

        // Step 3: Only when a session exists, call getUser() to fetch the user
        // This validates the session with the Supabase Auth server
        try {
          const { data: userData, error: userError } = await supabase.auth.getUser();
          
          if (!isMounted) {
            return;
          }

          if (userError) {
            // If getUser() fails, the session might be invalid
            // Log the error but use the session's user as fallback
            console.warn('AuthContext: Error getting user, using session user:', userError);
            setSession(sessionData.session);
            setUser(sessionData.session.user ?? null);
          } else {
            // getUser() succeeded - user is authenticated and validated
            setSession(sessionData.session);
            setUser(userData?.user ?? null);
          }
        } catch (getUserError) {
          // Catch any unexpected errors from getUser()
          console.warn('AuthContext: Exception getting user, using session user:', getUserError);
          setSession(sessionData.session);
          setUser(sessionData.session.user ?? null);
        }
      } catch (err) {
        // Catch any unexpected errors from getSession()
        console.warn('AuthContext: Exception during initialization:', err);
        setSession(null);
        setUser(null);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    init();

    // Subscribe to auth state changes
    // This will fire when user signs in, signs out, or session is refreshed
    const { data: authListener } = supabase.auth.onAuthStateChange((event, newSession) => {
      if (!isMounted) {
        return;
      }

      // Update session and user state based on the new session
      setSession(newSession);
      setUser(newSession?.user ?? null);
      setLoading(false);

      // Optionally redirect to /account when user signs in
      // Note: This is handled by individual pages/components, so we don't redirect here
      // to avoid conflicts with page-specific redirect logic
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
        // 使用 NEXT_PUBLIC_SITE_URL 或 window.location.origin 作为回调 URL
        const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || (typeof window !== 'undefined' ? window.location.origin : '');
        const defaultRedirectTo = siteUrl ? `${siteUrl.replace(/\/$/, '')}/auth/callback` : undefined;
        
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            ...options,
            emailRedirectTo: options.emailRedirectTo || defaultRedirectTo,
          },
        });
        
        if (error) {
          console.error('Registration error:', error);
          throw error;
        }
        
        // 如果注册成功，更新 session 和 user
        if (data.session) {
          // 有 session 说明注册成功且已自动登录
          setSession(data.session);
          setUser(data.user ?? data.session.user);
        } else {
          // 如果没有 session（需要邮箱验证），不设置任何状态
          // 等待用户点击邮箱验证链接后，Supabase 会自动处理会话
          setUser(null);
          setSession(null);
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