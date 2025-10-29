/**
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
      return `${diffDays}天后`;
    } else if (diffDays === 0) {
      return '今天';
    } else {
      return `${Math.abs(diffDays)}天前`;
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
