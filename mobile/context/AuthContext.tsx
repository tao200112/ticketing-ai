/**
 * 认证上下文
 * 管理用户登录状态和认证相关操作
 */

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase.native';
import { signInWithGoogle, signInWithEmailPassword, signOut } from '../lib/auth';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithEmailPassword: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 获取初始 session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // 订阅认证状态变化
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSignInWithGoogle = async () => {
    try {
      const { error } = await signInWithGoogle();
      if (error) {
        console.error('Google sign in error:', error);
        throw error;
      }
      // Session 会通过 onAuthStateChange 自动更新
    } catch (error) {
      console.error('Google sign in failed:', error);
      throw error;
    }
  };

  const handleSignInWithEmailPassword = async (email: string, password: string) => {
    try {
      const { error } = await signInWithEmailPassword(email, password);
      if (error) {
        console.error('Email sign in error:', error);
        throw error;
      }
      // Session 会通过 onAuthStateChange 自动更新
    } catch (error) {
      console.error('Email sign in failed:', error);
      throw error;
    }
  };

  const handleSignOut = async () => {
    try {
      const { error } = await signOut();
      if (error) {
        console.error('Sign out error:', error);
        throw error;
      }
      // Session 会通过 onAuthStateChange 自动更新
    } catch (error) {
      console.error('Sign out failed:', error);
      throw error;
    }
  };

  const value: AuthContextType = {
    session,
    user,
    loading,
    signInWithGoogle: handleSignInWithGoogle,
    signInWithEmailPassword: handleSignInWithEmailPassword,
    signOut: handleSignOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

