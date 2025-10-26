const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/v1';

class ApiClient {
  constructor() {
    this.baseURL = API_BASE_URL;
    this.token = null;
  }

  // 设置认证令牌
  setToken(token) {
    this.token = token;
  }

  // 清除认证令牌
  clearToken() {
    this.token = null;
  }

  // 获取请求头
  getHeaders() {
    const headers = {
      'Content-Type': 'application/json',
    };

    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    return headers;
  }

  // 通用请求方法
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const config = {
      headers: this.getHeaders(),
      ...options,
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`API request failed: ${endpoint}`, error);
      throw error;
    }
  }

  // GET 请求
  async get(endpoint) {
    return this.request(endpoint, { method: 'GET' });
  }

  // POST 请求
  async post(endpoint, data) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // PUT 请求
  async put(endpoint, data) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // DELETE 请求
  async delete(endpoint) {
    return this.request(endpoint, { method: 'DELETE' });
  }

  // 认证相关
  async login(email, password) {
    const response = await this.post('/auth/login', { email, password });
    if (response.success && response.data.token) {
      this.setToken(response.data.token);
    }
    return response;
  }

  async logout() {
    this.clearToken();
    return { success: true };
  }

  // 活动相关
  async getEvents() {
    return this.get('/events');
  }

  async getEvent(id) {
    return this.get(`/events/${id}`);
  }

  // 用户相关
  async getUserProfile() {
    return this.get('/users/profile');
  }

  async getUserTickets() {
    return this.get('/users/tickets');
  }

  async getUserOrders() {
    return this.get('/users/orders');
  }

  // 票务相关
  async verifyTicket(qrPayload) {
    return this.post('/tickets/verify', { qr_payload: qrPayload });
  }

  // 支付相关
  async createCheckoutSession(data) {
    return this.post('/payments/checkout', data);
  }
}

// 创建单例实例
const apiClient = new ApiClient();

export default apiClient;
