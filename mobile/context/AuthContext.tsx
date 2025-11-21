/**
 * Authentication context
 * Manages user login state and authentication operations
 */

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase.native';
import { signInWithGoogle, signInWithEmailPassword, signOut } from '../lib/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
    let isInitialized = false;

    const init = async () => {
      try {
        // First, get session (this will trigger auto-refresh if needed)
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        
        if (isMounted) {
          
          console.log(
            '[AuthContext] event: INITIAL_SESSION hasSession:',
            !!sessionData.session,
            'error:',
            sessionError?.message
          );
          
          // If there's an error getting session (like invalid refresh token), clear it
          if (sessionError) {
            console.warn('[AuthContext] Error getting session, clearing:', sessionError.message);
            
            // If it's a refresh token error, clear AsyncStorage manually to ensure cleanup
            if (sessionError.message?.includes('Refresh Token') || sessionError.message?.includes('Invalid')) {
              try {
                // Get Supabase URL to build the storage key
                const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
                const projectId = supabaseUrl.split('//')[1]?.split('.')[0] || 'default';
                
                // Try to get all keys and filter for auth-related ones
                try {
                  const allKeys = await AsyncStorage.getAllKeys();
                  const authKeys = allKeys.filter(key => 
                    key.includes('auth') || key.includes('supabase') || key.includes('sb-')
                  );
                  if (authKeys.length > 0) {
                    await AsyncStorage.multiRemove(authKeys);
                    console.log('[AuthContext] Cleared auth keys from AsyncStorage:', authKeys);
                  }
                } catch (storageError) {
                  console.error('[AuthContext] Error clearing AsyncStorage:', storageError);
                }
                
                // Also call signOut to ensure Supabase client is cleaned up
                try {
                  await supabase.auth.signOut();
                } catch (signOutError) {
                  // Ignore signOut errors since session is already invalid
                  console.warn('[AuthContext] SignOut failed (expected):', signOutError);
                }
              } catch (clearError) {
                console.error('[AuthContext] Error clearing invalid session:', clearError);
              }
            } else {
              // For other errors, just sign out normally
              try {
                await supabase.auth.signOut();
              } catch (signOutError) {
                console.warn('[AuthContext] SignOut failed:', signOutError);
              }
            }
            
            setSession(null);
            setUser(null);
            setLoading(false);
            return;
          }
          
          // Verify session is valid
          if (sessionData.session) {
            // Check if session has user
            if (!sessionData.session.user) {
              console.warn('[AuthContext] Session exists but has no user, clearing session');
              await supabase.auth.signOut();
              setSession(null);
              setUser(null);
              setLoading(false);
              return;
            }
            
            // Check if session is expired
            const expiresAt = sessionData.session.expires_at;
            if (expiresAt) {
              const now = Math.floor(Date.now() / 1000);
              if (expiresAt <= now) {
                console.warn('[AuthContext] Session expired, clearing session. expiresAt:', expiresAt, 'now:', now);
                await supabase.auth.signOut();
                setSession(null);
                setUser(null);
                setLoading(false);
                return;
              }
              
              // Verify token is actually valid by calling getUser
              try {
                const { data: userData, error: userError } = await supabase.auth.getUser();
                if (userError || !userData.user) {
                  console.warn('[AuthContext] Token validation failed, clearing session. Error:', userError?.message);
                  await supabase.auth.signOut();
                  setSession(null);
                  setUser(null);
                  setLoading(false);
                  return;
                }
                
                // Session is valid
                console.log('[AuthContext] Valid session found, expiresAt:', expiresAt, 'seconds remaining:', expiresAt - now);
                setSession(sessionData.session);
                setUser(sessionData.session.user);
              } catch (verifyError) {
                console.error('[AuthContext] Error verifying token:', verifyError);
                await supabase.auth.signOut();
                setSession(null);
                setUser(null);
              }
            } else {
              // No expiration time, verify with getUser
              try {
                const { data: userData, error: userError } = await supabase.auth.getUser();
                if (userError || !userData.user) {
                  console.warn('[AuthContext] Token validation failed (no expiry), clearing session. Error:', userError?.message);
                  await supabase.auth.signOut();
                  setSession(null);
                  setUser(null);
                  setLoading(false);
                  return;
                }
                // Session appears valid
                console.warn('[AuthContext] Session has no expiration time, but user validation passed');
                setSession(sessionData.session);
                setUser(sessionData.session.user);
              } catch (verifyError) {
                console.error('[AuthContext] Error verifying token:', verifyError);
                await supabase.auth.signOut();
                setSession(null);
                setUser(null);
              }
            }
          } else {
            // No session
            setSession(null);
            setUser(null);
          }
          setLoading(false);
          isInitialized = true; // Mark as initialized after setting state
        }
      } catch (error) {
        console.error('[AuthContext] Error getting session:', error);
        if (isMounted) {
          setSession(null);
          setUser(null);
          setLoading(false);
          isInitialized = true; // Mark as initialized even on error
        }
      }
    };

    init();

    const { data: subscription } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('[AuthContext] onAuthStateChange event:', event, 'hasSession:', !!session, 'isInitialized:', isInitialized);
        
        // Skip initial SIGNED_OUT event if we're still initializing
        // This prevents unnecessary state updates during init, but allow SIGNED_IN events
        if (!isInitialized && event === 'SIGNED_OUT' && !session) {
          console.log('[AuthContext] Skipping initial SIGNED_OUT event during initialization');
          return;
        }
        
        if (isMounted) {
          // If session exists, verify it's valid before setting it
          if (session) {
            // Check if session has user
            if (!session.user) {
              console.warn('[AuthContext] onAuthStateChange: Session has no user, ignoring');
              return;
            }
            
            // Check if session is expired (but allow token refresh to happen)
            const expiresAt = session.expires_at;
            if (expiresAt) {
              const now = Math.floor(Date.now() / 1000);
              // Allow a small buffer for token refresh (5 seconds)
              if (expiresAt <= now - 5) {
                console.warn('[AuthContext] onAuthStateChange: Session expired, expiresAt:', expiresAt, 'now:', now);
                // Don't clear here, let it try to refresh first
                // Only clear if refresh fails (handled by getSession)
              }
            }
            
            console.log('[AuthContext] onAuthStateChange: Setting valid session, userId:', session.user.id, 'event:', event);
          } else {
            console.log('[AuthContext] onAuthStateChange: No session (signed out), event:', event);
          }
          
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

