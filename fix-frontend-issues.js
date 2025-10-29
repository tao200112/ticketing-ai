#!/usr/bin/env node

/**
 * 前端问题修复脚本
 * 解决loading状态和日期格式问题
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 修复前端问题...\n');

// 1. 检查useEvents hook
console.log('1️⃣ 检查useEvents hook...');
const useEventsPath = 'lib/hooks/use-api.js';
if (fs.existsSync(useEventsPath)) {
  console.log('   ✅ 找到useEvents hook文件');
  
  // 读取文件内容
  let content = fs.readFileSync(useEventsPath, 'utf8');
  
  // 检查是否有错误处理
  if (content.includes('console.error')) {
    console.log('   ✅ 已有错误处理');
  } else {
    console.log('   ⚠️ 缺少错误处理');
  }
  
  // 检查是否有loading状态管理
  if (content.includes('setLoading')) {
    console.log('   ✅ 已有loading状态管理');
  } else {
    console.log('   ⚠️ 缺少loading状态管理');
  }
} else {
  console.log('   ❌ 未找到useEvents hook文件');
}
console.log('');

// 2. 检查Events页面组件
console.log('2️⃣ 检查Events页面组件...');
const eventsPagePath = 'app/events/page.js';
if (fs.existsSync(eventsPagePath)) {
  console.log('   ✅ 找到Events页面文件');
  
  let content = fs.readFileSync(eventsPagePath, 'utf8');
  
  // 检查日期处理
  if (content.includes('new Date') || content.includes('Date.parse')) {
    console.log('   ✅ 发现日期处理代码');
  } else {
    console.log('   ⚠️ 缺少日期处理代码');
  }
  
  // 检查loading状态
  if (content.includes('loading') || content.includes('Loading')) {
    console.log('   ✅ 发现loading状态处理');
  } else {
    console.log('   ⚠️ 缺少loading状态处理');
  }
} else {
  console.log('   ❌ 未找到Events页面文件');
}
console.log('');

// 3. 创建日期格式化工具
console.log('3️⃣ 创建日期格式化工具...');
const dateUtilsPath = 'lib/date-utils.js';
const dateUtilsContent = `/**
 * 日期格式化工具
 * 解决Invalid Date问题
 */

/**
 * 格式化日期为可读格式
 * @param {string|Date} date - 日期字符串或Date对象
 * @returns {string} 格式化后的日期字符串
 */
export function formatDate(date) {
  if (!date) return 'TBD';
  
  try {
    const dateObj = new Date(date);
    
    // 检查日期是否有效
    if (isNaN(dateObj.getTime())) {
      console.warn('Invalid date:', date);
      return 'TBD';
    }
    
    return dateObj.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (error) {
    console.error('Date formatting error:', error);
    return 'TBD';
  }
}

/**
 * 格式化相对时间
 * @param {string|Date} date - 日期字符串或Date对象
 * @returns {string} 相对时间字符串
 */
export function formatRelativeTime(date) {
  if (!date) return 'TBD';
  
  try {
    const dateObj = new Date(date);
    
    if (isNaN(dateObj.getTime())) {
      return 'TBD';
    }
    
    const now = new Date();
    const diffMs = dateObj.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays > 0) {
      return \`\${diffDays}天后\`;
    } else if (diffDays === 0) {
      return '今天';
    } else {
      return \`\${Math.abs(diffDays)}天前\`;
    }
  } catch (error) {
    console.error('Relative time formatting error:', error);
    return 'TBD';
  }
}

/**
 * 检查日期是否有效
 * @param {string|Date} date - 日期字符串或Date对象
 * @returns {boolean} 是否有效
 */
export function isValidDate(date) {
  if (!date) return false;
  
  try {
    const dateObj = new Date(date);
    return !isNaN(dateObj.getTime());
  } catch (error) {
    return false;
  }
}
`;

fs.writeFileSync(dateUtilsPath, dateUtilsContent);
console.log('   ✅ 创建日期格式化工具');
console.log('');

// 4. 创建改进的useEvents hook
console.log('4️⃣ 创建改进的useEvents hook...');
const improvedUseEventsContent = `'use client';

import { useState, useEffect } from 'react';

/**
 * 改进的活动数据钩子
 * 解决loading状态和错误处理问题
 */
export function useEvents() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('🔍 useEvents: 开始获取活动数据');
      
      const response = await fetch('/api/events');
      
      if (!response.ok) {
        throw new Error(\`HTTP error! status: \${response.status}\`);
      }
      
      const result = await response.json();
      console.log('📦 useEvents: 收到响应:', { 
        success: result.success, 
        dataLength: result.data?.length || 0 
      });
      
      if (result.success) {
        // 处理日期格式
        const processedData = result.data?.map(event => ({
          ...event,
          formatted_start_at: event.start_at ? new Date(event.start_at).toLocaleDateString() : 'TBD',
          formatted_end_at: event.end_at ? new Date(event.end_at).toLocaleDateString() : 'TBD',
          is_valid_date: event.start_at ? !isNaN(new Date(event.start_at).getTime()) : false
        })) || [];
        
        setData(processedData);
        console.log('✅ useEvents: 设置活动数据，数量:', processedData.length);
      } else {
        throw new Error(result.error || 'Failed to fetch events');
      }
    } catch (err) {
      console.error('❌ useEvents: 获取活动失败:', err);
      setError(err.message);
      setData([]); // 设置空数组而不是null
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  return { 
    data, 
    loading, 
    error, 
    refetch: fetchEvents 
  };
}
`;

fs.writeFileSync('lib/hooks/use-events-improved.js', improvedUseEventsContent);
console.log('   ✅ 创建改进的useEvents hook');
console.log('');

// 5. 提供修复建议
console.log('5️⃣ 修复建议:');
console.log('   🔧 1. 在Events页面中使用日期格式化工具');
console.log('   🔧 2. 改进loading状态显示');
console.log('   🔧 3. 添加错误边界处理');
console.log('   🔧 4. 验证日期格式的有效性');
console.log('');

console.log('🎉 前端问题修复脚本完成！');
console.log('💡 请检查生成的文件并根据需要进行调整');
