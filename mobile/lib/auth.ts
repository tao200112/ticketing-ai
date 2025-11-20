/**
 * Authentication functions
 * Native Google login implementation
 */

import 'react-native-url-polyfill/auto';

import * as WebBrowser from 'expo-web-browser';

import * as Linking from 'expo-linking';

import Constants from 'expo-constants';

import { supabase } from './supabase.native';

WebBrowser.maybeCompleteAuthSession();

/**
 * Native Google login function for mobile
 * Uses system browser for OAuth authentication, returns to app via deep link
 */
export async function signInWithGoogle() {
  try {
    // 1) Build redirect URI: exp://...auth-callback
    const redirectUri = Linking.createURL('auth-callback');

    console.log('[OAuth] redirectUri:', redirectUri);

    // 2) Request Supabase OAuth URL
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUri,
        skipBrowserRedirect: true,
      },
    });

    if (error) {
      console.error('[OAuth] Supabase OAuth error:', error);
      return { error };
    }

    if (!data?.url) {
      const err = new Error('No OAuth URL returned from Supabase');
      console.error('[OAuth] ', err);
      return { error: err };
    }

    console.log('[OAuth] Supabase OAuth URL:', data.url);

    // 3) Open system browser and wait for redirect
    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUri);

    console.log('[OAuth] openAuthSessionAsync result:', result);

    // 4) Handle result
    if (result.type !== 'success') {
      if (result.type === 'cancel') {
        return { error: new Error('User cancelled Google sign-in') };
      }
      return {
        error: new Error(
          `Auth session did not succeed. type=${result.type}`
        ),
      };
    }

    // When result.type === 'success', result contains url property
    const callbackUrl = (result as { type: 'success'; url: string }).url;

    if (!callbackUrl) {
      return {
        error: new Error('No callback URL returned from auth session'),
      };
    }

    // 5) Parse code from callbackUrl
    let code: string | null = null;

    // Try using URL class to parse
    try {
      const urlObj = new URL(callbackUrl);
      code = urlObj.searchParams.get('code');
    } catch {
      // URL parsing failed, use regex fallback
      const match = callbackUrl.match(/[?&]code=([^&]+)/);
      code = match ? decodeURIComponent(match[1]) : null;
    }

    if (!code) {
      console.error(
        `[OAuth] No auth code found in callback URL: ${callbackUrl}`
      );
      return { error: new Error('No auth code found in callback URL') };
    }

    console.log('[OAuth] Parsed auth code:', code);

    // 6) Exchange code for session
    const { data: sessionData, error: exchangeError } =
      await supabase.auth.exchangeCodeForSession(code);

    if (exchangeError) {
      console.error('[OAuth] exchangeCodeForSession error:', exchangeError);
      return { error: exchangeError };
    }

    console.log(
      '[OAuth] exchangeCodeForSession success, hasSession:',
      !!sessionData.session
    );

    return { data: sessionData };
  } catch (error) {
    console.error('[OAuth] signInWithGoogle error:', error);
    return { error: error instanceof Error ? error : new Error('Unknown error') };
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

    console.log('[Auth] Email/password sign in successful');
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

