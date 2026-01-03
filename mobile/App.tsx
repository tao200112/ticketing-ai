/**
 * PartyTix Mobile App
 * Full native implementation with React Navigation
 */

import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import * as Linking from 'expo-linking';
import { AuthProvider } from './context/AuthContext';
import RootNavigator from './navigation/RootNavigator';
import { parseDeepLink } from './lib/deep-link';
import { CONFIG } from './lib/config';

/**
 * Deep Link Handler Component
 * Handles Stripe checkout redirect and other deep links
 */
function DeepLinkHandler({ children }: { children: React.ReactNode }) {
  const [initialUrl, setInitialUrl] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Get initial URL when app opens
    Linking.getInitialURL().then((url) => {
      if (url) {
        setInitialUrl(url);
      }
      setIsReady(true);
    });

    // Listen for deep links when app is already open
    const subscription = Linking.addEventListener('url', handleDeepLink);

    return () => {
      subscription.remove();
    };
  }, []);

  const handleDeepLink = async (event: { url: string }) => {
    const { path, params } = parseDeepLink(event.url);
    
    console.log('[DeepLink] Received:', { path, params, url: event.url });

    // Handle Stripe checkout success callback
    if (path === 'success' || event.url.includes('success')) {
      const sessionId = params.session_id || 
                        new URLSearchParams(event.url.split('?')[1]).get('session_id');
      
      if (sessionId) {
        console.log('[DeepLink] Stripe checkout success, session_id:', sessionId);
        // Navigation will be handled by RootNavigator
        // The session_id will be passed through route params
      }
    }

    // Handle auth callback
    if (path === 'auth-callback') {
      console.log('[DeepLink] Auth callback received');
      // Auth context will handle this automatically via Supabase
    }
  };

  if (!isReady) {
    return null;
  }

  return <>{children}</>;
}

/**
 * Root component
 */
export default function App() {
  return (
    <AuthProvider>
      <DeepLinkHandler>
        <StatusBar style="light" />
        <RootNavigator />
      </DeepLinkHandler>
    </AuthProvider>
  );
}
