/**
 * Authentication context
 * Manages user login state and authentication operations
 */

import React, { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase.native';
import { 
  signInWithGoogle, 
  signInWithEmailPassword, 
  signUpWithEmailPassword,
  resetPassword as resetPasswordAuth,
  updatePassword as updatePasswordAuth,
  signOut 
} from '../lib/auth';

async function refreshSessionFromServer(
  mounted: boolean,
  setSessionFn: (session: Session | null) => void,
  setUserFn: (user: User | null) => void
) {
  try {
    const { data, error } = await supabase.auth.getSession();
    console.log('[AuthContext] getSession result:', {
      hasSession: !!data.session,
      error: error?.message,
    });

    if (!mounted) {
      return;
    }

    if (error) {
      console.error('[AuthContext] getSession error:', error);
      setSessionFn(null);
      setUserFn(null);
    } else {
      setSessionFn(data.session ?? null);
      setUserFn(data.session?.user ?? null);
    }
  } catch (initError) {
    console.error('[AuthContext] getSession unexpected error:', initError);
    if (!mounted) {
      return;
    }
    setSessionFn(null);
    setUserFn(null);
  }
}

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  isInitialized: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithEmailPassword: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, metadata?: { name?: string; age?: number }) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updatePassword: (newPassword: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);
  const isInitializedRef = useRef(false);

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      await refreshSessionFromServer(mounted, setSession, setUser);
      if (mounted) {
        setLoading(false);
        setIsInitialized(true);
        isInitializedRef.current = true;
      }
    };

    void init();

    const { data: subscription } = supabase.auth.onAuthStateChange(
      (event, nextSession) => {
        console.log('[AuthContext] onAuthStateChange:', {
          event,
          hasSession: !!nextSession,
          isInitialized: isInitializedRef.current,
        });

        if (!mounted) {
          return;
        }

        switch (event) {
          case 'INITIAL_SESSION':
            // Let getSession handle populating state to avoid double updates.
            if (!isInitializedRef.current) {
              void refreshSessionFromServer(mounted, setSession, setUser);
              setLoading(false);
            }
            break;
        case 'SIGNED_IN':
        case 'TOKEN_REFRESHED':
        case 'USER_UPDATED':
          setSession(nextSession ?? null);
          setUser(nextSession?.user ?? null);
            setLoading(false);
            break;
          case 'SIGNED_OUT':
            setSession(null);
            setUser(null);
            setLoading(false);
            break;
          default:
            break;
        }
      }
    );

    return () => {
      mounted = false;
      subscription?.subscription.unsubscribe();
    };
  }, []);

  const handleSignInWithGoogle = async () => {
    try {
      console.log('[AuthContext] Starting Google sign in...');
      await signInWithGoogle();
      // Session will be automatically updated via onAuthStateChange
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

  const handleSignUp = async (
    email: string,
    password: string,
    metadata?: { name?: string; age?: number }
  ) => {
    try {
      const { error } = await signUpWithEmailPassword(email, password, metadata);
      if (error) {
        console.error('[AuthContext] Sign up error:', error);
        throw error;
      }
      // Session will be automatically updated via onAuthStateChange
    } catch (error) {
      console.error('[AuthContext] Sign up failed:', error);
      throw error;
    }
  };

  const handleResetPassword = async (email: string) => {
    try {
      const { error } = await resetPasswordAuth(email);
      if (error) {
        console.error('[AuthContext] Reset password error:', error);
        throw error;
      }
    } catch (error) {
      console.error('[AuthContext] Reset password failed:', error);
      throw error;
    }
  };

  const handleUpdatePassword = async (newPassword: string) => {
    try {
      const { error } = await updatePasswordAuth(newPassword);
      if (error) {
        console.error('[AuthContext] Update password error:', error);
        throw error;
      }
    } catch (error) {
      console.error('[AuthContext] Update password failed:', error);
      throw error;
    }
  };

  const handleSignOut = async () => {
    console.log('[AuthContext] handleSignOut called');
    try {
      const { error } = await signOut();
      if (error) {
        console.error('[AuthContext] Sign out error:', error);
      }
    } catch (error) {
      console.error('[AuthContext] Sign out failed:', error);
    } finally {
      setSession(null);
      setUser(null);
      setLoading(false);
    }
  };

  const value: AuthContextType = {
    session,
    user,
    loading,
    isInitialized,
    signInWithGoogle: handleSignInWithGoogle,
    signInWithEmailPassword: handleSignInWithEmailPassword,
    signUp: handleSignUp,
    resetPassword: handleResetPassword,
    updatePassword: handleUpdatePassword,
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

