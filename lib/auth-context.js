'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import apiClient from './api-client';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(null);

  // 初始化认证状态
  useEffect(() => {
    const initAuth = async () => {
      try {
        const storedToken = localStorage.getItem('auth_token');
        if (storedToken) {
          setToken(storedToken);
          apiClient.setToken(storedToken);
          
          // 验证令牌有效性
          try {
            const response = await apiClient.getUserProfile();
            if (response.success) {
              setUser(response.data);
            } else {
              // 令牌无效，清除
              clearAuth();
            }
          } catch (error) {
            console.error('Token validation failed:', error);
            clearAuth();
          }
        }
      } catch (error) {
        console.error('Auth initialization failed:', error);
        clearAuth();
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  // 登录
  const login = async (email, password) => {
    try {
      setLoading(true);
      const response = await apiClient.login(email, password);
      
      if (response.success) {
        const { user: userData, token: authToken } = response.data;
        setUser(userData);
        setToken(authToken);
        localStorage.setItem('auth_token', authToken);
        return { success: true };
      } else {
        return { success: false, error: response.error };
      }
    } catch (error) {
      console.error('Login failed:', error);
      return { success: false, error: 'LOGIN_FAILED' };
    } finally {
      setLoading(false);
    }
  };

  // 登出
  const logout = async () => {
    try {
      await apiClient.logout();
      clearAuth();
      return { success: true };
    } catch (error) {
      console.error('Logout failed:', error);
      return { success: false, error: 'LOGOUT_FAILED' };
    }
  };

  // 清除认证状态
  const clearAuth = () => {
    setUser(null);
    setToken(null);
    apiClient.clearToken();
    localStorage.removeItem('auth_token');
  };

  // 检查是否已登录
  const isAuthenticated = () => {
    return user !== null && token !== null;
  };

  // 检查用户角色
  const hasRole = (role) => {
    return user && user.role === role;
  };

  // 检查是否为管理员
  const isAdmin = () => {
    return hasRole('admin');
  };

  // 检查是否为商家
  const isMerchant = () => {
    return hasRole('merchant');
  };

  const value = {
    user,
    token,
    loading,
    login,
    logout,
    isAuthenticated,
    hasRole,
    isAdmin,
    isMerchant,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;
