'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import apiClient from './api-client';
import { supabase } from './supabaseClient';

const AuthContext = createContext();

const SUPPORTED_ROLES = ['user', 'merchant', 'admin'];

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(null);
  const [bridging, setBridging] = useState(false);

  const persistSession = useCallback((userData, authToken) => {
    setUser(userData);
    setToken(authToken);
    if (authToken) {
      localStorage.setItem('auth_token', authToken);
      apiClient.setToken(authToken);
    }
    if (userData) {
      localStorage.setItem('userSession', JSON.stringify(userData));
    }
  }, []);

  const clearAuth = useCallback(() => {
    setUser(null);
    setToken(null);
    apiClient.clearToken();
    localStorage.removeItem('auth_token');
    localStorage.removeItem('userSession');
    localStorage.removeItem('merchantUser');
    localStorage.removeItem('merchantToken');
  }, []);

  const bridgeSupabaseSession = useCallback(async () => {
    if (!supabase) {
      console.warn('Auth check: Supabase client not initialised');
      return false;
    }

    try {
      setBridging(true);
      const { data: sessionInfo, error: sessionError } = await supabase.auth.getSession();
      console.log('Auth check: supabase session =', sessionInfo);

      if (sessionError) {
        console.error('Auth check: failed to read Supabase session', sessionError);
        return false;
      }

      const sessionUser = sessionInfo?.session?.user;
      if (!sessionUser || !sessionUser.email) {
        console.log('Auth check: no Supabase session user found');
        return false;
      }

      const preferredRole = sessionUser.user_metadata?.role;
      const role =
        preferredRole && SUPPORTED_ROLES.includes(preferredRole)
          ? preferredRole
          : 'user';

      const payload = {
        email: sessionUser.email,
        provider: sessionUser.app_metadata?.provider || 'google',
        userId: sessionUser.id,
        role,
        name:
          sessionUser.user_metadata?.full_name ||
          sessionUser.user_metadata?.name ||
          sessionUser.user_metadata?.display_name ||
          sessionUser.email
      }

      console.log('Auth check: calling login-from-supabase', payload)

      const response = await fetch('/api/auth/login-from-supabase', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        console.error('Auth check: login-from-supabase failed', await response.text());
        return false;
      }

      const result = await response.json();
      console.log('Auth check: login-from-supabase result', result)

      if (!result.success) {
        console.error('Auth check: bridging API returned failure', result);
        return false;
      }

      const { userSession, auth_token: authToken } = result;
      console.log('Auth check: bridged Supabase session to local token', {
        email: userSession?.email,
        role: userSession?.role,
      });

      persistSession(userSession, authToken);

      if (userSession.role === 'merchant') {
        localStorage.setItem('merchantUser', JSON.stringify(userSession))
        localStorage.setItem('merchantToken', 'merchant-logged-in')
      }

      return true;
    } catch (error) {
      console.error('Auth check: bridgeSupabaseSession error', error);
      return false;
    } finally {
      setBridging(false);
    }
  }, [persistSession]);

  useEffect(() => {
    const initAuth = async () => {
      try {
        setLoading(true);
        const storedToken = localStorage.getItem('auth_token');
        if (storedToken) {
          console.log('Auth check: local token found');
          setToken(storedToken);
          apiClient.setToken(storedToken);

          try {
            const response = await apiClient.getUserProfile();
            if (response.success) {
              persistSession(response.data, storedToken);
              return;
            }
            console.warn('Auth check: local token invalid, clearing session');
            clearAuth();
          } catch (error) {
            console.error('Token validation failed:', error);
            clearAuth();
          }
        } else {
          console.log('Auth check: no local token, checking Supabase session');
          const bridged = await bridgeSupabaseSession();
          if (bridged) {
            return;
          }
        }
      } catch (error) {
        console.error('Auth initialization failed:', error);
        clearAuth();
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, [bridgeSupabaseSession, clearAuth, persistSession]);

  const login = async (email, password) => {
    try {
      setLoading(true);
      const response = await apiClient.login(email, password);

      if (response.success) {
        const { user: userData, token: authToken } = response.data;
        persistSession(userData, authToken);
        return { success: true };
      }
      return { success: false, error: response.error };
    } catch (error) {
      console.error('Login failed:', error);
      return { success: false, error: 'LOGIN_FAILED' };
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await apiClient.logout();
      if (supabase) {
        await supabase.auth.signOut();
      }
      clearAuth();
      return { success: true };
    } catch (error) {
      console.error('Logout failed:', error);
      return { success: false, error: 'LOGOUT_FAILED' };
    }
  };

  const isAuthenticated = () => {
    return user !== null && token !== null;
  };

  const hasRole = (role) => {
    return user && user.role === role;
  };

  const isAdmin = () => hasRole('admin');
  const isMerchant = () => hasRole('merchant');

  const value = {
    user,
    token,
    loading: loading || bridging,
    login,
    logout,
    isAuthenticated,
    hasRole,
    isAdmin,
    isMerchant,
    refreshFromSupabase: bridgeSupabaseSession,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;
