/**
 * Supabase native client (React Native specific)
 * Supports environment variables or app.json extra configuration
 */

import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

const supabaseUrl =
  (process.env.EXPO_PUBLIC_SUPABASE_URL as string) ||
  (Constants.expoConfig?.extra?.supabaseUrl as string);
const supabaseAnonKey =
  (process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY as string) ||
  (Constants.expoConfig?.extra?.supabaseAnonKey as string);

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase configuration. Please check EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY or app.json extra.supabaseUrl and extra.supabaseAnonKey'
  );
}

// Ensure only one Supabase client instance exists in the entire app
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false, // React Native doesn't need to detect session in URL
    // lock is handled internally by SDK, no manual configuration needed
  },
});

