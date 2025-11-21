/**
 * PartyTix Mobile App
 * Integrated native Google login, no longer uses WebView for login
 */

import React, { useRef, useState, useEffect, useMemo } from 'react';
import { SafeAreaView, StyleSheet, Platform, View, ActivityIndicator, Alert } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { WebView, WebViewNavigation } from 'react-native-webview';
import { AuthProvider, useAuth } from './context/AuthContext';
import { supabase } from './lib/supabase.native';
import LoginScreen from './screens/LoginScreen';
import ForgotPasswordScreen from './screens/ForgotPasswordScreen';

/**
 * Web App URL configuration
 * Development: https://ticketing-ai-six.vercel.app
 * Can be changed to production domain later, e.g., https://partytix.com
 */
const WEB_APP_URL = 'https://ticketing-ai-six.vercel.app';

/**
 * Build mobile-bridge URL with access_token and refresh_token
 * Always includes source=mobile-app parameter to identify mobile app environment
 * @param session Supabase session object
 * @returns mobile-bridge URL with token parameters or URL with source param
 */
const buildMobileBridgeUrl = (session: any): string => {
  const accessToken = session?.access_token;
  const refreshToken = session?.refresh_token;

  if (accessToken && refreshToken) {
    return (
      `${WEB_APP_URL}/mobile-bridge` +
      `?access_token=${encodeURIComponent(accessToken)}` +
      `&refresh_token=${encodeURIComponent(refreshToken)}` +
      `&source=mobile-app`
    );
  }

  // Even without tokens, include source=mobile-app to identify mobile app
  return `${WEB_APP_URL}?source=mobile-app`;
};

/**
 * Check if URL contains merchant or admin paths
 */
const isRestrictedPath = (url: string): boolean => {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname.toLowerCase();
    return pathname.includes('/merchant') || pathname.includes('/admin');
  } catch {
    // If URL parsing fails, check if string contains path
    return url.toLowerCase().includes('/merchant') || url.toLowerCase().includes('/admin');
  }
};

/**
 * Main app content component (requires Auth Context)
 */
function AppContent() {
  const { session, loading } = useAuth();
  const webViewRef = useRef<WebView>(null);
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  // Debug logging
  useEffect(() => {
    console.log('[App] Session state:', {
      hasSession: !!session,
      hasUser: !!session?.user,
      loading,
      sessionExpiresAt: session?.expires_at,
    });
  }, [session, loading]);


  // Web platform: redirect directly to target URL
  useEffect(() => {
    if (Platform.OS === 'web') {
      // Check if current URL contains restricted paths
      if (typeof window !== 'undefined') {
        const checkAndRedirect = () => {
          const currentPath = window.location.pathname;
          if (isRestrictedPath(window.location.href)) {
            alert('Merchant and admin features are only available on the web version.');
            window.location.href = WEB_APP_URL;
            return;
          }
        };

        // Listen for URL changes
        const originalPushState = history.pushState;
        history.pushState = function (...args) {
          originalPushState.apply(history, args);
          setTimeout(checkAndRedirect, 0);
        };

        window.addEventListener('popstate', checkAndRedirect);
        checkAndRedirect();

        // Redirect directly to target URL (if not already there)
        if (!window.location.href.includes(WEB_APP_URL.replace('https://', ''))) {
          window.location.href = WEB_APP_URL;
        }

        return () => {
          window.removeEventListener('popstate', checkAndRedirect);
        };
      }
    }
  }, []);

  /**
   * Intercept navigation requests, block access to merchant/admin paths (iOS and some Android)
   * Also prevent navigation to login page if we should use native login
   */
  const handleShouldStartLoadWithRequest = (request: { url: string }): boolean => {
    // Block restricted paths
    if (isRestrictedPath(request.url)) {
      Alert.alert(
        'Feature Unavailable',
        'Merchant and admin features are only available on the web version.',
        [{ text: 'OK', onPress: () => {} }]
      );
      return false; // Block navigation
    }

    // If navigating to web login page, this means web session is invalid
    // Clear native session and show native login screen instead
    if (request.url.includes('/auth/login') || request.url.includes('/login')) {
      // Only handle if it doesn't have source=mobile-app (which shows mobile app message)
      if (!request.url.includes('source=mobile-app')) {
        console.warn('[App] Blocked navigation to web login page. Clearing session and showing native login.');
        // Clear session and this will trigger re-render to show native login
        supabase.auth.signOut().then(() => {
          console.log('[App] Session cleared due to login page navigation');
        });
        return false; // Block navigation
      }
    }

    return true; // Allow navigation
  };

  /**
   * Handle navigation state changes (Android fallback)
   */
  const handleNavigationStateChange = (navState: WebViewNavigation) => {
    const url = navState.url;
    
    console.log('[App] WebView navigation:', url);
    
    // If navigating to restricted path, block and go back
    if (isRestrictedPath(url)) {
      Alert.alert(
        'Feature Unavailable',
        'Merchant and admin features are only available on the web version.',
        [
          {
            text: 'OK',
            onPress: () => {
              // Go back to previous page or home
              webViewRef.current?.goBack();
            },
          },
        ]
      );
      return;
    }

    // If navigating to login page, this means web session is invalid
    // Clear native session and show native login screen
    if (url.includes('/auth/login') || url.includes('/login')) {
      // Only handle if it doesn't have source=mobile-app (which shows mobile app message)
      if (!url.includes('source=mobile-app')) {
        console.warn('[App] WebView navigated to login page, session likely invalid. Clearing session and showing native login.');
        // Clear session and this will trigger re-render to show native login
        supabase.auth.signOut().then(() => {
          console.log('[App] Session cleared due to login page navigation');
        });
      }
    }
  };

  // Use useMemo to avoid repeatedly building URL (prevent infinite loops)
  // Only build URL if we have a valid session (will be used after session check)
  const webViewUrl = useMemo(() => {
    if (!session || !session.user) {
      // This should not be reached due to early return above, but for safety:
      return `${WEB_APP_URL}?source=mobile-app`;
    }
    const url = buildMobileBridgeUrl(session);
    console.log('[App] Built WebView URL:', url.replace(/access_token=[^&]+/, 'access_token=***').replace(/refresh_token=[^&]+/, 'refresh_token=***'));
    return url;
  }, [session]);

  // Loading state
  if (loading) {
    console.log('[App] Still loading, showing loading indicator');
    return (
      <View style={styles.loadingContainer}>
        <StatusBar style="light" />
        <ActivityIndicator size="large" color="#7C3AED" />
      </View>
    );
  }

  // Not logged in: show native login page or forgot password page
  if (!session || !session.user) {
    console.log('[App] No valid session, showing native LoginScreen');
    return (
      <View style={styles.container}>
        <StatusBar style="light" />
        {showForgotPassword ? (
          <ForgotPasswordScreen onBack={() => setShowForgotPassword(false)} />
        ) : (
          <LoginScreen onForgotPassword={() => setShowForgotPassword(true)} />
        )}
      </View>
    );
  }

  // Web platform: use iframe or direct redirect
  if (Platform.OS === 'web') {
    return (
      <View style={styles.container}>
        <StatusBar style="dark" />
        <iframe
          src={WEB_APP_URL}
          style={{
            width: '100%',
            height: '100%',
            border: 'none',
          }}
          title="PartyTix Web App"
        />
      </View>
    );
  }

  // Mobile platform: logged in, show WebView
  console.log('[App] Valid session exists, showing WebView');

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <WebView
        ref={webViewRef}
        source={{ uri: webViewUrl }}
        style={styles.webview}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        sharedCookiesEnabled={true}
        thirdPartyCookiesEnabled={true}
        onShouldStartLoadWithRequest={handleShouldStartLoadWithRequest}
        onNavigationStateChange={handleNavigationStateChange}
        // Allow navigation from all origins (except intercepted paths)
        originWhitelist={['*']}
        // Handle errors
        onError={(syntheticEvent) => {
          const { nativeEvent } = syntheticEvent;
          console.warn('[WebView] Error: ', nativeEvent);
        }}
        // Handle loading state
        onLoadStart={(syntheticEvent) => {
          const { nativeEvent } = syntheticEvent;
          console.log('[WebView] Started loading:', nativeEvent.url);
        }}
        onLoadEnd={(syntheticEvent) => {
          const { nativeEvent } = syntheticEvent;
          const url = nativeEvent.url;
          console.log('[WebView] Finished loading:', url);
          
          // Check if loaded page is login page (indicates web session is invalid)
          if (url.includes('/auth/login') || url.includes('/login')) {
            // Only handle if it doesn't have source=mobile-app (which shows mobile app message)
            if (!url.includes('source=mobile-app')) {
              console.warn('[WebView] Loaded login page, session likely invalid. Clearing session and showing native login.');
              // Clear session and this will trigger re-render to show native login
              supabase.auth.signOut().then(() => {
                console.log('[App] Session cleared due to login page load');
              });
            }
          }
        }}
      />
    </SafeAreaView>
  );
}

/**
 * Root component: wraps AuthProvider
 */
export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  webview: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
