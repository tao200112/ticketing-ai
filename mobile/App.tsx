/**
 * PartyTix Mobile App
 * Integrated native Google login, no longer uses WebView for login
 */

import React, { useState } from 'react';
import { StyleSheet, Platform, View, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider, useAuth } from './context/AuthContext';
import LoginScreen from './screens/LoginScreen';
import ForgotPasswordScreen from './screens/ForgotPasswordScreen';
import MainWebView, { WEB_APP_URL } from './components/MainWebView';

function AppContent() {
  const { session, loading, isInitialized } = useAuth();
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  if (!isInitialized || loading) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar style="light" />
        <ActivityIndicator size="large" color="#7C3AED" />
      </View>
    );
  }

  if (!session || !session.user) {
    console.log('[AuthContext] session is null, falling back to LoginScreen');
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

  return <MainWebView session={session} />;
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
  loadingContainer: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
