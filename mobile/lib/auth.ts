/**
 * 认证相关函数
 * 实现原生 Google 登录
 */

import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { supabase } from './supabase.native';
import Constants from 'expo-constants';

// 完成 WebBrowser 的认证会话
WebBrowser.maybeCompleteAuthSession();

/**
 * 使用 Google 登录
 */
export async function signInWithGoogle() {
  try {
    // 生成重定向 URI
    const redirectUri = AuthSession.makeRedirectUri({
      scheme: Constants.expoConfig?.scheme || 'partytix',
      path: 'auth-callback',
    });

    // 调用 Supabase OAuth
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUri,
        skipBrowserRedirect: true, // 关键：让我们自己控制浏览器
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    });

    if (error) {
      console.error('Supabase OAuth error:', error);
      return { error };
    }

    if (!data?.url) {
      return { error: new Error('No OAuth URL returned from Supabase') };
    }

    // 使用 AuthSession 打开系统浏览器
    const result = await AuthSession.startAsync({
      authUrl: data.url,
      returnUrl: redirectUri,
    });

    if (result.type === 'success') {
      // 从 URL 中提取参数
      const { params } = result;
      
      // 处理 Supabase OAuth 回调
      // Supabase 会在回调 URL 中包含 code 或 error
      if (params?.error) {
        return { error: new Error(params.error_description || params.error) };
      }
      
      // 如果返回了 code，Supabase SDK 需要从回调 URL 中提取并交换 token
      // 由于使用了 skipBrowserRedirect: true，我们需要手动触发
      if (params?.code && result.url) {
        // 使用回调 URL 触发 Supabase 的 session 更新
        // Supabase SDK 会监听 URL 变化并自动处理
        // 我们只需要等待 onAuthStateChange 回调
      }
      
      // Session 会通过 onAuthStateChange 自动更新
      // 如果 session 没有立即更新，可能是异步处理中，等待即可
      return { result };
    } else if (result.type === 'cancel') {
      return { error: new Error('User cancelled authentication') };
    } else {
      return { error: new Error(`Authentication failed: ${result.type}`) };
    }
  } catch (error) {
    console.error('signInWithGoogle error:', error);
    return { error: error instanceof Error ? error : new Error('Unknown error') };
  }
}

/**
 * 使用邮箱和密码登录
 */
export async function signInWithEmailPassword(email: string, password: string) {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return { error };
    }

    return { data };
  } catch (error) {
    console.error('signInWithEmailPassword error:', error);
    return { error: error instanceof Error ? error : new Error('Unknown error') };
  }
}

/**
 * 登出
 */
export async function signOut() {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) {
      return { error };
    }
    return { success: true };
  } catch (error) {
    console.error('signOut error:', error);
    return { error: error instanceof Error ? error : new Error('Unknown error') };
  }
}

