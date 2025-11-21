/**
 * Authentication functions
 * Native Google login implementation
 */

import { useCallback } from 'react';
import 'react-native-url-polyfill/auto';

import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import Constants from 'expo-constants';

import { supabase } from '../supabase.native';

WebBrowser.maybeCompleteAuthSession();

const SUPABASE_URL =
  process.env.EXPO_PUBLIC_SUPABASE_URL || Constants.expoConfig?.extra?.supabaseUrl;

if (!SUPABASE_URL) {
  console.error('[Auth] Missing Supabase URL configuration');
}

export function getRedirectUri() {
  const redirectUri = AuthSession.makeRedirectUri({
    scheme: 'partytix',
    useProxy: true,
  } as AuthSession.AuthSessionRedirectUriOptions & { useProxy: true });

  console.log('[App] Using proxy redirect URI:', redirectUri);
  return redirectUri;
}

export async function signInWithGoogle() {
  console.log('[Auth] signInWithGoogle start');
  const redirectUri = getRedirectUri();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: redirectUri,
    },
  });

  if (error) {
    console.error('[Auth] supabase.auth.signInWithOAuth error:', error);
    throw error;
  }

  const authUrl = data?.url;
  if (!authUrl) {
    throw new Error('[OAuth] Missing authorization url from Supabase');
  }

  console.log('[OAuth] Opening auth session URL via startAsync:', authUrl);

  const result = await AuthSession.startAsync({ authUrl });
  console.log('[OAuth] AuthSession result:', JSON.stringify(result, null, 2));

  if (result.type !== 'success') {
    throw new Error(`[OAuth] Auth flow failed, result type=${result.type}`);
  }

  // Supabase onAuthStateChange will hydrate the session automatically.
  console.log('[AuthContext] Google OAuth completed, waiting for Supabase session');
  return result;
}

/**
 * Hook that exposes Google OAuth trigger
 */
export function useGoogleSignIn() {
  const startGoogleSignIn = useCallback(() => {
    return signInWithGoogle();
  }, []);

  return {
    signInWithGoogle: startGoogleSignIn,
  };
}

/**
 * Sign in with email and password
 */
export async function signInWithEmailPassword(email: string, password: string) {
  try {
    console.log('[Auth] Attempting email/password sign in for:', email);
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error('[Auth] Email/password sign in error:', error);
      return { error };
    }

    console.log(
      '[Auth] Email/password sign in successful, hasSession:',
      !!data.session,
      'userId:',
      data.session?.user?.id,
      'expiresAt:',
      data.session?.expires_at
    );

    // Verify session was saved by immediately getting it
    try {
      const { data: verifyData, error: verifyError } = await supabase.auth.getSession();
      if (verifyError) {
        console.error('[Auth] Failed to verify saved session:', verifyError);
      } else {
        console.log(
          '[Auth] Session verification: hasSession:',
          !!verifyData.session,
          'userId:',
          verifyData.session?.user?.id
        );
      }
    } catch (verifyErr) {
      console.error('[Auth] Error verifying session:', verifyErr);
    }

    return { data };
  } catch (error) {
    console.error('[Auth] signInWithEmailPassword error:', error);
    return { error: error instanceof Error ? error : new Error('Unknown error') };
  }
}

/**
 * Sign out
 */
export async function signOut() {
  try {
    console.log('[Auth] Signing out...');
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('[Auth] Sign out error:', error);
      return { error };
    }
    console.log('[Auth] Sign out successful');
    return { success: true };
  } catch (error) {
    console.error('[Auth] signOut error:', error);
    return { error: error instanceof Error ? error : new Error('Unknown error') };
  }
}

