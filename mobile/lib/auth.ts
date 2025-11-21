/**
 * Authentication functions
 * Native Google login implementation
 */

import 'react-native-url-polyfill/auto';

import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import Constants from 'expo-constants';

import { supabase } from './supabase.native';

WebBrowser.maybeCompleteAuthSession();

function getRedirectUri() {
  const isExpoGo = Constants.appOwnership === 'expo';
  const redirectUri = isExpoGo
    ? AuthSession.makeRedirectUri({ useProxy: true } as AuthSession.AuthSessionRedirectUriOptions & {
        useProxy: true;
      })
    : AuthSession.makeRedirectUri({
        scheme: 'partytix',
        path: 'auth-callback',
      });

  console.log(
    '[App] Redirect type:',
    isExpoGo ? 'Expo Go (proxy)' : 'Standalone (partytix://auth-callback)'
  );
  console.log('[Debug] Final redirectUri =', redirectUri);

  return redirectUri;
}

/**
 * Native Google login function for mobile
 * Uses system browser for OAuth authentication, returns to app via deep link
 */
export async function signInWithGoogle() {
  try {
    console.log('[Auth] signInWithGoogle start');
    const redirectUri = getRedirectUri();
    console.log('[OAuth] Redirect URI:', redirectUri);

    const supabaseConfigUrl =
      process.env.EXPO_PUBLIC_SUPABASE_URL ||
      Constants.expoConfig?.extra?.supabaseUrl;

    if (!supabaseConfigUrl) {
      throw new Error('Missing Supabase URL');
    }

    const authUrl = `${supabaseConfigUrl}/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent(
      redirectUri
    )}`;
    console.log('[OAuth] Auth URL:', authUrl);

    const startAsync = (AuthSession as any).startAsync;
    if (typeof startAsync !== 'function') {
      throw new Error('AuthSession.startAsync is not available');
    }

    const result = await startAsync({ authUrl });
    console.log('[OAuth] AuthSession result:', JSON.stringify(result, null, 2));

    if (result.type !== 'success') {
      throw new Error(`Auth session did not succeed. type=${result.type}`);
    }

    const { access_token, refresh_token } = result.params || {};

    if (!access_token || !refresh_token) {
      throw new Error('Missing access_token or refresh_token in OAuth result');
    }

    const { data, error } = await supabase.auth.setSession({
      access_token,
      refresh_token,
    });

    if (error) {
      console.error('[Auth] supabase.auth.setSession error:', error);
      throw error;
    }

    console.log('[Auth] Supabase session set');
    return data.session;
  } catch (error) {
    console.error('[Auth] signInWithGoogle error:', error);
    throw error instanceof Error ? error : new Error('Unknown error');
  }
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

