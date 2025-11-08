const RAW_API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  'http://localhost:3001/v1';

export const API_BASE_URL = RAW_API_BASE_URL.replace(/\/$/, '');

function buildApiUrl(path) {
  if (!path) return API_BASE_URL;
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL}${normalized}`;
}

export async function apiFetch(path, options = {}) {
  const url = buildApiUrl(path);
  const response = await fetch(url, options);

  if (!response.ok) {
    let errorPayload;
    try {
      errorPayload = await response.json();
    } catch (_) {
      errorPayload = await response.text().catch(() => '');
    }
    console.error(`[API ERROR] ${url}`, response.status, errorPayload);
    const error = new Error(
      (errorPayload && errorPayload.message) || `HTTP ${response.status}`
    );
    error.response = response;
    error.payload = errorPayload;
    throw error;
  }

  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return response.json();
  }
  return response.text();
}

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
    const headers = {
      ...this.getHeaders(),
      ...(options.headers || {}),
    };

    const config = {
      ...options,
      headers,
    };

    return apiFetch(endpoint, config);
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
