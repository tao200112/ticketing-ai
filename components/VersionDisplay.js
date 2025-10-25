'use client';

import { useState, useEffect } from 'react';

/**
 * 🔢 版本显示组件
 * 显示当前应用的版本信息（Git SHA 或 Tag）
 */
export default function VersionDisplay({ 
  className = '', 
  showGitInfo = true,
  showBuildTime = true 
}) {
  const [versionInfo, setVersionInfo] = useState({
    version: 'loading...',
    gitSha: 'loading...',
    buildTime: 'loading...',
    environment: 'development'
  });

  useEffect(() => {
    // 从环境变量获取版本信息
    const version = process.env.NEXT_PUBLIC_APP_VERSION || 'dev';
    const gitSha = process.env.NEXT_PUBLIC_GIT_SHA || 'unknown';
    const buildTime = process.env.NEXT_PUBLIC_BUILD_TIME || new Date().toISOString();
    const environment = process.env.NODE_ENV || 'development';

    setVersionInfo({
      version,
      gitSha: gitSha.substring(0, 8), // 只显示前8位
      buildTime,
      environment
    });
  }, []);

  const formatBuildTime = (timeString) => {
    try {
      const date = new Date(timeString);
      return date.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return timeString;
    }
  };

  const getEnvironmentColor = (env) => {
    switch (env) {
      case 'production':
        return 'text-green-600 bg-green-100';
      case 'staging':
        return 'text-yellow-600 bg-yellow-100';
      case 'development':
        return 'text-blue-600 bg-blue-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <div className={`text-xs text-gray-500 ${className}`}>
      <div className="flex items-center gap-2 flex-wrap">
        {/* 版本号 */}
        <span className="font-mono">
          v{versionInfo.version}
        </span>
        
        {/* 环境标识 */}
        <span className={`px-2 py-1 rounded text-xs font-medium ${getEnvironmentColor(versionInfo.environment)}`}>
          {versionInfo.environment}
        </span>
        
        {/* Git 信息 */}
        {showGitInfo && (
          <span className="font-mono text-gray-400">
            #{versionInfo.gitSha}
          </span>
        )}
        
        {/* 构建时间 */}
        {showBuildTime && (
          <span className="text-gray-400">
            {formatBuildTime(versionInfo.buildTime)}
          </span>
        )}
      </div>
    </div>
  );
}

/**
 * 📱 移动端版本显示组件
 */
export function MobileVersionDisplay() {
  return (
    <VersionDisplay 
      className="fixed bottom-2 right-2 z-50"
      showGitInfo={false}
      showBuildTime={false}
    />
  );
}

/**
 * 🖥️ 桌面端版本显示组件
 */
export function DesktopVersionDisplay() {
  return (
    <VersionDisplay 
      className="mt-4"
      showGitInfo={true}
      showBuildTime={true}
    />
  );
}
