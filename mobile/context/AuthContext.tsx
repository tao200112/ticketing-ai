/**
 * Authentication context
 * Manages user login state and authentication operations
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
    let isMounted = true;

    const init = async () => {
      const { data } = await supabase.auth.getSession();
      if (isMounted) {
        console.log(
          '[AuthContext] event: INITIAL_SESSION hasSession:',
          !!data.session
        );
        setSession(data.session ?? null);
        setUser(data.session?.user ?? null);
        setLoading(false);
      }
    };

    init();

    const { data: subscription } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('[AuthContext] event:', event, 'hasSession:', !!session);
        if (isMounted) {
          setSession(session ?? null);
          setUser(session?.user ?? null);
          setLoading(false);
        }
      }
    );

    return () => {
      isMounted = false;
      subscription.subscription.unsubscribe();
    };
  }, []);

  const handleSignInWithGoogle = async () => {
    try {
      console.log('[AuthContext] Starting Google sign in...');
      const { error } = await signInWithGoogle();
      if (error) {
        console.error('[AuthContext] Google sign in error:', error);
        throw error;
      }
      // Session will be automatically updated via onAuthStateChange
      console.log('[AuthContext] Google sign in initiated, waiting for session update...');
    } catch (error) {
      console.error('[AuthContext] Google sign in failed:', error);
      throw error;
    }
  };

  const handleSignInWithEmailPassword = async (email: string, password: string) => {
    try {
      const { error } = await signInWithEmailPassword(email, password);
      if (error) {
        console.error('[AuthContext] Email sign in error:', error);
        throw error;
      }
      // Session will be automatically updated via onAuthStateChange
    } catch (error) {
      console.error('[AuthContext] Email sign in failed:', error);
      throw error;
    }
  };

  const handleSignOut = async () => {
    try {
      const { error } = await signOut();
      if (error) {
        console.error('[AuthContext] Sign out error:', error);
        throw error;
      }
      // Session will be automatically updated via onAuthStateChange
    } catch (error) {
      console.error('[AuthContext] Sign out failed:', error);
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

