/**
 * 登录页面
 * 提供 Google 登录和邮箱密码登录
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useAuth } from '../context/AuthContext';

export default function LoginScreen() {
  const { signInWithGoogle, signInWithEmailPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    try {
      setGoogleLoading(true);
      await signInWithGoogle();
      // 成功后会通过 AuthContext 自动更新状态
    } catch (error: any) {
      Alert.alert('登录失败', error?.message || 'Google 登录失败，请重试');
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleEmailSignIn = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('输入错误', '请输入邮箱和密码');
      return;
    }

    try {
      setLoading(true);
      await signInWithEmailPassword(email.trim(), password);
      // 成功后会通过 AuthContext 自动更新状态
    } catch (error: any) {
      Alert.alert('登录失败', error?.message || '邮箱登录失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.content}>
          {/* Logo 和标题 */}
          <View style={styles.header}>
            <Text style={styles.title}>PartyTix</Text>
            <Text style={styles.subtitle}>欢迎回来</Text>
          </View>

          {/* Google 登录按钮 */}
          <TouchableOpacity
            style={[styles.googleButton, googleLoading && styles.buttonDisabled]}
            onPress={handleGoogleSignIn}
            disabled={googleLoading || loading}
          >
            {googleLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.googleButtonText}>Continue with Google</Text>
            )}
          </TouchableOpacity>

          {/* 分隔线 */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>或</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* 邮箱输入 */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>邮箱</Text>
            <TextInput
              style={styles.input}
              placeholder="请输入邮箱"
              placeholderTextColor="#999"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!loading && !googleLoading}
            />
          </View>

          {/* 密码输入 */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>密码</Text>
            <TextInput
              style={styles.input}
              placeholder="请输入密码"
              placeholderTextColor="#999"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              editable={!loading && !googleLoading}
            />
          </View>

          {/* 邮箱登录按钮 */}
          <TouchableOpacity
            style={[styles.emailButton, (loading || googleLoading) && styles.buttonDisabled]}
            onPress={handleEmailSignIn}
            disabled={loading || googleLoading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.emailButtonText}>登录</Text>
            )}
          </TouchableOpacity>

          {/* 提示文字 */}
          <Text style={styles.hint}>
            登录即表示您同意我们的服务条款和隐私政策
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  content: {
    padding: 24,
    maxWidth: 400,
    width: '100%',
    alignSelf: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#999',
  },
  googleButton: {
    backgroundColor: '#4285F4',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 24,
  },
  googleButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#333',
  },
  dividerText: {
    marginHorizontal: 16,
    color: '#666',
    fontSize: 14,
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    color: '#fff',
    marginBottom: 8,
    fontWeight: '500',
  },
  input: {
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#fff',
  },
  emailButton: {
    backgroundColor: '#7C3AED',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  emailButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  hint: {
    marginTop: 24,
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
});

