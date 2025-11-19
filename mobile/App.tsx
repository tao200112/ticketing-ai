/**
 * PartyTix Mobile App
 * 集成原生 Google 登录，不再使用 WebView 登录
 */

import React, { useRef, useState, useEffect } from 'react';
import { SafeAreaView, StyleSheet, Alert, Platform, View, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { WebView, WebViewNavigation } from 'react-native-webview';
import { Linking } from 'react-native';
import { AuthProvider, useAuth } from './context/AuthContext';
import LoginScreen from './screens/LoginScreen';
import ForgotPasswordScreen from './screens/ForgotPasswordScreen';

/**
 * Web App URL 配置
 * 开发阶段使用：https://ticketing-ai-six.vercel.app
 * 将来可以改为正式域名，例如：https://partytix.com
 */
const WEB_APP_URL = 'https://ticketing-ai-six.vercel.app';

/**
 * 检查 URL 是否包含商家或管理员路径
 */
const isRestrictedPath = (url: string): boolean => {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname.toLowerCase();
    return pathname.includes('/merchant') || pathname.includes('/admin');
  } catch {
    // 如果 URL 解析失败，检查字符串中是否包含路径
    return url.toLowerCase().includes('/merchant') || url.toLowerCase().includes('/admin');
  }
};

/**
 * 主应用内容组件（需要 Auth Context）
 */
function AppContent() {
  const { session, loading } = useAuth();
  const webViewRef = useRef<WebView>(null);
  const [currentUrl, setCurrentUrl] = useState(WEB_APP_URL);
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  // 处理深链回调（OAuth 重定向）
  useEffect(() => {
    const handleDeepLink = async (event: { url: string }) => {
      const url = event.url;
      console.log('Deep link received:', url);
      
      // 处理 OAuth 回调
      if (url.includes('auth-callback')) {
        // 解析 URL 参数
        try {
          const urlObj = new URL(url);
          const code = urlObj.searchParams.get('code');
          const error = urlObj.searchParams.get('error');
          
          if (error) {
            console.error('OAuth error:', error);
            Alert.alert('登录失败', 'Google 登录失败，请重试');
            return;
          }
          
          if (code) {
            // Supabase SDK 会自动处理 code 交换 token
            // 我们只需要等待 onAuthStateChange 回调更新 session
            console.log('OAuth code received, waiting for session update...');
          }
        } catch (err) {
          console.error('Failed to parse deep link URL:', err);
        }
      }
    };

    // 监听初始 URL（如果 App 是通过深链启动的）
    Linking.getInitialURL().then((url) => {
      if (url) {
        handleDeepLink({ url });
      }
    });

    // 监听后续的深链
    const subscription = Linking.addEventListener('url', handleDeepLink);

    return () => {
      subscription.remove();
    };
  }, []);

  // Web 平台：直接重定向到目标 URL
  useEffect(() => {
    if (Platform.OS === 'web') {
      // 检查当前 URL 是否包含受限路径
      if (typeof window !== 'undefined') {
        const checkAndRedirect = () => {
          const currentPath = window.location.pathname;
          if (isRestrictedPath(window.location.href)) {
            alert('商家和管理员功能请在网页版使用。');
            window.location.href = WEB_APP_URL;
            return;
          }
        };

        // 监听 URL 变化
        const originalPushState = history.pushState;
        history.pushState = function (...args) {
          originalPushState.apply(history, args);
          setTimeout(checkAndRedirect, 0);
        };

        window.addEventListener('popstate', checkAndRedirect);
        checkAndRedirect();

        // 直接重定向到目标 URL（如果不在目标 URL）
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
   * 拦截导航请求，阻止访问商家/管理员路径（iOS 和部分 Android）
   */
  const handleShouldStartLoadWithRequest = (request: { url: string }): boolean => {
    if (isRestrictedPath(request.url)) {
      Alert.alert(
        '功能不可用',
        '商家和管理员功能请在网页版使用。',
        [{ text: '确定', onPress: () => {} }]
      );
      return false; // 阻止导航
    }
    return true; // 允许导航
  };

  /**
   * 处理导航状态变化（Android 补充方案）
   */
  const handleNavigationStateChange = (navState: WebViewNavigation) => {
    const url = navState.url;
    setCurrentUrl(url);
    
    // 如果导航到受限路径，阻止并返回上一页
    if (isRestrictedPath(url)) {
      Alert.alert(
        '功能不可用',
        '商家和管理员功能请在网页版使用。',
        [
          {
            text: '确定',
            onPress: () => {
              // 返回上一页或首页
              webViewRef.current?.goBack();
            },
          },
        ]
      );
    }
  };

  // 加载中状态
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar style="light" />
        <ActivityIndicator size="large" color="#7C3AED" />
      </View>
    );
  }

  // 未登录：显示原生登录页面或忘记密码页面
  if (!session) {
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

  // Web 平台：使用 iframe 或直接重定向
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

  // 移动平台：已登录，显示 WebView
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <WebView
        ref={webViewRef}
        source={{ uri: WEB_APP_URL }}
        style={styles.webview}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        sharedCookiesEnabled={true}
        thirdPartyCookiesEnabled={true}
        onShouldStartLoadWithRequest={handleShouldStartLoadWithRequest}
        onNavigationStateChange={handleNavigationStateChange}
        // 允许所有来源的导航（除了被拦截的路径）
        originWhitelist={['*']}
        // 处理错误
        onError={(syntheticEvent) => {
          const { nativeEvent } = syntheticEvent;
          console.warn('WebView error: ', nativeEvent);
        }}
        // 处理加载状态
        onLoadStart={() => {
          console.log('WebView started loading');
        }}
        onLoadEnd={() => {
          console.log('WebView finished loading');
        }}
      />
    </SafeAreaView>
  );
}

/**
 * 根组件：包装 AuthProvider
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
