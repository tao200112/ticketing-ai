/**
 * Supabase 原生客户端（React Native 专用）
 * 使用 app.json 中的 extra 配置
 */

import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';

const supabaseUrl = Constants.expoConfig?.extra?.supabaseUrl as string;
const supabaseAnonKey = Constants.expoConfig?.extra?.supabaseAnonKey as string;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase configuration. Please check app.json extra.supabaseUrl and extra.supabaseAnonKey'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false, // React Native 不需要检测 URL 中的 session
  },
});

