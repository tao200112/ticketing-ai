import React, { useRef, useState, useEffect } from 'react';
import { SafeAreaView, StyleSheet, Alert, Platform, View, Text } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { WebView, WebViewNavigation } from 'react-native-webview';

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

export default function App() {
  const webViewRef = useRef<WebView>(null);
  const [currentUrl, setCurrentUrl] = useState(WEB_APP_URL);

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

  // 移动平台：使用 WebView
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
      {/* 
        未来扩展点：
        - 可以在这里添加底部 Tab 导航（使用 React Navigation）
        - 可以添加原生页面组件（登录、订单列表、票详情等）
        - 当前只渲染 WebView，结构已预留扩展空间
      */}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  webview: {
    flex: 1,
  },
});
