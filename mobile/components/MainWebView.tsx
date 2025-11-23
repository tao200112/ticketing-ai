/**
 * Main WebView wrapper for the mobile app.
 * Handles session-driven navigation, login interception, restricted routes,
 * cookie cleanup, and native logout fallbacks.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  SafeAreaView,
  Text,
  TouchableOpacity,
  StatusBar,
  StyleSheet,
  View,
} from 'react-native';
import Constants from 'expo-constants';
import {
  WebView,
  WebViewNavigation,
  WebViewErrorEvent,
  WebViewHttpErrorEvent,
} from 'react-native-webview';
import type { Session } from '@supabase/supabase-js';
import { useAuth } from '../context/AuthContext';

export const WEB_APP_URL = 'https://ticketing-ai-six.vercel.app';
const SOURCE_PARAM_VALUE = 'mobile-app';
const AUTH_EXACT_PATHS = ['/login', '/auth', '/auth/login', '/auth/sign-in', '/sign-in', '/oauth'];
const AUTH_PREFIX_PATHS = ['/auth/'];
const RESTRICTED_SEGMENTS = ['/merchant', '/admin'];

const WEB_APP_DOMAIN = (() => {
  try {
    return new URL(WEB_APP_URL).hostname;
  } catch {
    return '';
  }
})();

const SUPABASE_PROJECT_REF = (() => {
  const supabaseUrl =
    (process.env.EXPO_PUBLIC_SUPABASE_URL as string) ||
    (Constants.expoConfig?.extra?.supabaseUrl as string) ||
    '';

  if (!supabaseUrl) {
    return '';
  }

  try {
    const hostname = new URL(supabaseUrl).hostname;
    return hostname.split('.')[0] || '';
  } catch {
    return '';
  }
})();

const SUPABASE_BROWSER_STORAGE_KEY = SUPABASE_PROJECT_REF
  ? `sb-${SUPABASE_PROJECT_REF}-auth-token`
  : '';

type MainWebViewProps = {
  session: Session;
};

const buildMobileBridgeUrl = (session: Session): string => {
  const params = new URLSearchParams({ source: SOURCE_PARAM_VALUE });
  const accessToken = session?.access_token;
  const refreshToken = session?.refresh_token;

  if (accessToken && refreshToken) {
    params.append('access_token', accessToken);
    params.append('refresh_token', refreshToken);
    return `${WEB_APP_URL}/mobile-bridge?${params.toString()}`;
  }

  return `${WEB_APP_URL}?${params.toString()}`;
};

const isRestrictedPath = (url: string): boolean => {
  try {
    const pathname = new URL(url).pathname.toLowerCase();
    return RESTRICTED_SEGMENTS.some((segment) => pathname.includes(segment));
  } catch {
    const lowerUrl = url.toLowerCase();
    return RESTRICTED_SEGMENTS.some((segment) => lowerUrl.includes(segment));
  }
};

const shouldForceNativeLogin = (url: string): boolean => {
  try {
    const pathname = new URL(url).pathname.toLowerCase();
    if (AUTH_EXACT_PATHS.includes(pathname)) {
      console.log('[MainWebView] Detected auth route, forcing native login:', pathname);
      return true;
    }

    if (AUTH_PREFIX_PATHS.some((prefix) => pathname.startsWith(prefix))) {
      console.log('[MainWebView] Detected auth prefix route, forcing native login:', pathname);
      return true;
    }

    return false;
  } catch (error) {
    console.warn('[MainWebView] Failed to parse URL in shouldForceNativeLogin:', url, error);
    return false;
  }
};

const externalSchemeHandler = (url: string): boolean => {
  if (!url) {
    return false;
  }

  const lowerUrl = url.toLowerCase();
  const isExternalScheme =
    lowerUrl.startsWith('mailto:') ||
    lowerUrl.startsWith('tel:') ||
    lowerUrl.startsWith('sms:') ||
    lowerUrl.startsWith('partytix://') ||
    lowerUrl.startsWith('intent://');

  if (!isExternalScheme) {
    return false;
  }

  const targetUrl =
    lowerUrl.startsWith('intent://') && url.includes('https://')
      ? url.replace('intent://', 'https://')
      : url;

  Linking.openURL(targetUrl).catch((error) => {
    console.error('[MainWebView] Failed to open external link', targetUrl, error);
  });

  return true;
};

const buildClearSessionScript = (): string => {
  const cookieNames = [
    SUPABASE_BROWSER_STORAGE_KEY,
    `${SUPABASE_BROWSER_STORAGE_KEY}.0`,
    `${SUPABASE_BROWSER_STORAGE_KEY}.1`,
  ].filter(Boolean);

  const domainCleanupLine = WEB_APP_DOMAIN
    ? `document.cookie = name + "=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=.${WEB_APP_DOMAIN};";`
    : '';

  const storageCleanupBlock = SUPABASE_BROWSER_STORAGE_KEY
    ? `
        var storageKey = '${SUPABASE_BROWSER_STORAGE_KEY}';
        try { localStorage.removeItem(storageKey); } catch (_) {}
        try { localStorage.removeItem(storageKey + '-persist'); } catch (_) {}
        try { sessionStorage.removeItem(storageKey); } catch (_) {}
      `
    : '';

  return `
    (function() {
      try {
        var cookieNames = ${JSON.stringify(cookieNames)};
        cookieNames.forEach(function(name) {
          document.cookie = name + "=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/;";
          ${domainCleanupLine}
        });
        ${storageCleanupBlock}
      } catch (error) {
        console.error('[MainWebView] Failed to clear web session', error);
      }
      true;
    })();
  `;
};

export default function MainWebView({ session }: MainWebViewProps) {
  const { signOut } = useAuth();
  const webViewRef = useRef<WebView>(null);
  const loggingOutRef = useRef(false);
  const [isLoading, setIsLoading] = useState(true);
  const [webError, setWebError] = useState<string | null>(null);

  const webViewUrl = useMemo(() => {
    const url = buildMobileBridgeUrl(session);
    console.log(
      '[MainWebView] Bootstrapping WebView with:',
      url.replace(/access_token=[^&]+/, 'access_token=***').replace(/refresh_token=[^&]+/, 'refresh_token=***')
    );
    return url;
  }, [session?.access_token, session?.refresh_token]);

  const clearWebviewBrowserSession = useCallback(() => {
    if (!webViewRef.current) {
      return;
    }
    console.log('[MainWebView] Clearing web session (cookies + storage)');
    webViewRef.current.injectJavaScript(buildClearSessionScript());
  }, []);

  useEffect(() => {
    return () => {
      clearWebviewBrowserSession();
    };
  }, [clearWebviewBrowserSession]);

  useEffect(() => {
    setIsLoading(true);
  }, [webViewUrl]);

  const forceNativeLogout = useCallback(
    async (reason: string) => {
      if (loggingOutRef.current) {
        return;
      }
      loggingOutRef.current = true;
      console.warn('[MainWebView] Forcing native logout:', reason);
      setWebError(null);
      clearWebviewBrowserSession();
      try {
        await signOut();
      } catch (error) {
        console.error('[MainWebView] Native sign out failed', error);
      } finally {
        loggingOutRef.current = false;
      }
    },
    [clearWebviewBrowserSession, signOut]
  );

  const handleRestrictedNavigation = useCallback(
    (url: string, navState?: WebViewNavigation, showAlert?: boolean) => {
      if (!url) {
        return false;
      }

      if (shouldForceNativeLogin(url)) {
        webViewRef.current?.stopLoading();
        if (showAlert) {
          Alert.alert(
            '会话已过期',
            '检测到网页尝试进入登录流程，已返回原生登录页面。',
            [{ text: '我知道了' }]
          );
        }
        void forceNativeLogout(`Blocked auth route: ${url}`);
        return true;
      }

      if (isRestrictedPath(url)) {
        webViewRef.current?.stopLoading();
        Alert.alert(
          '功能受限',
          '商家与后台页面仅能在桌面端使用。',
          [
            {
              text: '我知道了',
              onPress: () => {
                if (navState?.canGoBack) {
                  webViewRef.current?.goBack();
                }
              },
            },
          ]
        );
        return true;
      }

      return false;
    },
    [forceNativeLogout]
  );

  const handleShouldStartLoadWithRequest = useCallback(
    (request: WebViewNavigation) => {
      const targetUrl = request?.url;
      if (!targetUrl) {
        return false;
      }

      console.log('[MainWebView] shouldStartLoad', targetUrl);

      if (externalSchemeHandler(targetUrl)) {
        return false;
      }

      if (handleRestrictedNavigation(targetUrl)) {
        return false;
      }

      return true;
    },
    [handleRestrictedNavigation]
  );

  const handleNavigationStateChange = useCallback(
    (navState: WebViewNavigation) => {
      const targetUrl = navState?.url;
      if (!targetUrl) {
        return;
      }

      console.log('[MainWebView] navStateChange', targetUrl);

      // Once we navigate away from the bridge/login screens, consider the page loaded so the spinner doesn't block taps.
      if (!targetUrl.includes('/mobile-bridge')) {
        setIsLoading(false);
      }

      if (externalSchemeHandler(targetUrl)) {
        webViewRef.current?.stopLoading();
        return;
      }

      handleRestrictedNavigation(targetUrl, navState, true);
    },
    [handleRestrictedNavigation]
  );

  const handleWebError = useCallback(
    (event: WebViewErrorEvent | WebViewHttpErrorEvent) => {
      console.error('[MainWebView] WebView error:', event.nativeEvent);
      setIsLoading(false);
      setWebError('加载网页失败，请检查网络或稍后重试。');
    },
    []
  );

  const handleRetry = useCallback(() => {
    console.log('[MainWebView] Retrying WebView load after error');
    setWebError(null);
    setIsLoading(true);
    webViewRef.current?.reload();
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <WebView
        ref={webViewRef}
        source={{ uri: webViewUrl }}
        style={styles.webview}
        javaScriptEnabled
        domStorageEnabled
        sharedCookiesEnabled
        thirdPartyCookiesEnabled
        onShouldStartLoadWithRequest={handleShouldStartLoadWithRequest}
        onNavigationStateChange={handleNavigationStateChange}
        originWhitelist={['*']}
        setSupportMultipleWindows={false}
        onLoadStart={() => {
          setWebError(null);
          setIsLoading(true);
        }}
        onLoadEnd={() => setIsLoading(false)}
        onError={handleWebError}
        onHttpError={handleWebError}
      />
      {isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#7C3AED" />
        </View>
      )}
      {webError && (
        <View style={styles.errorOverlay}>
          <View style={styles.errorBox}>
            <Text style={styles.errorTitle}>加载失败</Text>
            <Text style={styles.errorMessage}>{webError}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
              <Text style={styles.retryButtonText}>重新加载</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  webview: {
    flex: 1,
    backgroundColor: '#000',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
  },
  errorOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    paddingHorizontal: 24,
  },
  errorBox: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: '#111',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 8,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 14,
    color: '#ccc',
    marginBottom: 16,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#7C3AED',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

