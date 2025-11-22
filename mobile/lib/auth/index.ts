/**
 * Authentication functions
 * Native Google login implementation
 */

import 'react-native-url-polyfill/auto';

import * as WebBrowser from 'expo-web-browser';

import { supabase } from '../supabase.native';

WebBrowser.maybeCompleteAuthSession();

const NATIVE_REDIRECT_URI = 'partytix://auth-callback';

function getSearchParamsFromUrl(url: string) {
  const hashIndex = url.indexOf('#');
  if (hashIndex !== -1) {
    const fragment = url.substring(hashIndex + 1);
    return new URLSearchParams(fragment);
  }

  const queryIndex = url.indexOf('?');
  if (queryIndex !== -1) {
    const query = url.substring(queryIndex + 1);
    return new URLSearchParams(query);
  }

  return new URLSearchParams();
}

export async function handleOAuthRedirect(callbackUrl: string) {
  console.log('[Callback] Handling redirect URL:', callbackUrl);
  const params = getSearchParamsFromUrl(callbackUrl);
  console.log('[Callback] Parsed keys:', Array.from(params.keys()));

  const accessToken = params.get('access_token');
  const refreshToken = params.get('refresh_token');

  if (accessToken && refreshToken) {
    console.log('[Callback] Using access_token / refresh_token to set session');
    const { data, error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });

    if (error) {
      console.error('[Callback] setSession error:', error);
      return;
    }

    console.log(
      '[Callback] setSession success, user id:',
      data.session?.user?.id,
      'hasSession:',
      Boolean(data.session)
    );
    return;
  }

  const code = params.get('code');

  if (code) {
    console.log('[Callback] Exchanging code for session:', code);
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.error('[Callback] exchangeCodeForSession error:', error);
      return;
    }

    console.log(
      '[Callback] exchangeCodeForSession success, user id:',
      data.session?.user?.id,
      'hasSession:',
      Boolean(data.session)
    );
    return;
  }

  console.warn('[Callback] No usable params found in redirect URL');
}

export async function signInWithGoogle() {
  console.log('[Auth] signInWithGoogle start');
  console.log('[Auth] Using native redirect URI:', NATIVE_REDIRECT_URI);

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: NATIVE_REDIRECT_URI,
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

  console.log('[OAuth] Opening auth session via WebBrowser.openAuthSessionAsync:', authUrl);

  const result = await WebBrowser.openAuthSessionAsync(authUrl, NATIVE_REDIRECT_URI);
  console.log('[OAuth] WebBrowser result:', JSON.stringify(result, null, 2));

  if (result.type !== 'success') {
    throw new Error(`[OAuth] Auth flow failed, result type=${result.type}`);
  }

  if (result.url) {
    await handleOAuthRedirect(result.url);
  } else {
    console.warn('[Callback] OAuth result missing redirect URL');
  }

  console.log('[Callback] Browser returned to native redirect:', NATIVE_REDIRECT_URI);
  return result;
}

/**
 * Hook that exposes Google OAuth trigger
 */
export function useGoogleSignIn() {
  return {
    signInWithGoogle,
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

