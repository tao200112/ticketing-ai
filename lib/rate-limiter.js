/**
 * 限流服务
 * 使用 Upstash Redis 实现分布式限流
 */

import { Redis } from '@upstash/redis';

class RateLimiter {
  constructor() {
    this.redis = new Redis({
      url: process.env.UPSTASH_REDIS_URL,
      token: process.env.UPSTASH_REDIS_TOKEN,
    });
  }

  /**
   * 检查是否超过限流
   * @param {string} key - 限流键（IP地址或邮箱）
   * @param {string} type - 限流类型（ip, email, action）
   * @param {string} action - 操作类型（register, login, reset_password, verify_email）
   * @param {number} maxAttempts - 最大尝试次数
   * @param {number} windowMinutes - 时间窗口（分钟）
   * @returns {Promise<{allowed: boolean, remaining: number, resetTime: number}>}
   */
  async checkLimit(key, type, action, maxAttempts = 5, windowMinutes = 15) {
    const redisKey = `rate_limit:${type}:${action}:${key}`;
    const windowSeconds = windowMinutes * 60;
    const now = Math.floor(Date.now() / 1000);
    const windowStart = now - windowSeconds;

    try {
      // 使用 Redis 管道操作
      const pipeline = this.redis.pipeline();
      
      // 删除过期的记录
      pipeline.zremrangebyscore(redisKey, 0, windowStart);
      
      // 获取当前窗口内的尝试次数
      pipeline.zcard(redisKey);
      
      // 添加当前尝试
      pipeline.zadd(redisKey, { score: now, member: `${now}-${Math.random()}` });
      
      // 设置过期时间
      pipeline.expire(redisKey, windowSeconds);
      
      const results = await pipeline.exec();
      const currentCount = results[1];
      
      const allowed = currentCount < maxAttempts;
      const remaining = Math.max(0, maxAttempts - currentCount - 1);
      const resetTime = now + windowSeconds;

      return {
        allowed,
        remaining,
        resetTime: new Date(resetTime * 1000).toISOString(),
        currentCount: currentCount + 1,
        maxAttempts
      };
    } catch (error) {
      console.error('❌ 限流检查失败:', error);
      // 如果 Redis 不可用，允许请求通过（降级策略）
      return {
        allowed: true,
        remaining: maxAttempts - 1,
        resetTime: new Date((now + windowSeconds) * 1000).toISOString(),
        currentCount: 1,
        maxAttempts
      };
    }
  }

  /**
   * 检查 IP 限流
   */
  async checkIPLimit(ip, action, maxAttempts = 10, windowMinutes = 15) {
    return this.checkLimit(ip, 'ip', action, maxAttempts, windowMinutes);
  }

  /**
   * 检查邮箱限流
   */
  async checkEmailLimit(email, action, maxAttempts = 5, windowMinutes = 15) {
    return this.checkLimit(email, 'email', action, maxAttempts, windowMinutes);
  }

  /**
   * 检查操作限流
   */
  async checkActionLimit(key, action, maxAttempts = 3, windowMinutes = 5) {
    return this.checkLimit(key, 'action', action, maxAttempts, windowMinutes);
  }

  /**
   * 获取限流状态
   */
  async getLimitStatus(key, type, action) {
    const redisKey = `rate_limit:${type}:${action}:${key}`;
    
    try {
      const now = Math.floor(Date.now() / 1000);
      const windowStart = now - (15 * 60); // 15分钟窗口
      
      const count = await this.redis.zcount(redisKey, windowStart, '+inf');
      const ttl = await this.redis.ttl(redisKey);
      
      return {
        count,
        ttl,
        windowStart: new Date(windowStart * 1000).toISOString(),
        windowEnd: new Date(now * 1000).toISOString()
      };
    } catch (error) {
      console.error('❌ 获取限流状态失败:', error);
      return {
        count: 0,
        ttl: -1,
        windowStart: new Date().toISOString(),
        windowEnd: new Date().toISOString()
      };
    }
  }

  /**
   * 重置限流
   */
  async resetLimit(key, type, action) {
    const redisKey = `rate_limit:${type}:${action}:${key}`;
    
    try {
      await this.redis.del(redisKey);
      return true;
    } catch (error) {
      console.error('❌ 重置限流失败:', error);
      return false;
    }
  }
}

// 创建单例实例
const rateLimiter = new RateLimiter();

export default rateLimiter;
