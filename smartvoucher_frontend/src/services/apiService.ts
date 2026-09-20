import axios from 'axios';

export const API_BASE_URL = '/api';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
});

// Add a request interceptor
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

type LoginPayload = {
  username: string;
  password: string;
};

type TokenResponse = {
  access: string;
  refresh: string;
};

export const getAuthHeaders = (): Record<string, string> => {
  const token = localStorage.getItem('access_token');
  return token ? { 'Authorization': `Bearer ${token}` } : {};
};
export type WalletVoucher = {
  id: number;
  code: string;
  type: string;
  value: number;
  max_discount_amount: number;
  is_used: boolean;
  start_date: string;
  expiry_date: string;
  product_type: string;
  is_active: boolean;
};
export const authFetch = async (url: string, options: RequestInit = {}): Promise<Response> => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...getAuthHeaders(),
    ...((options.headers as Record<string, string>) || {}),
  };
  return fetch(url, { ...options, headers });
};

export const authApi = {
  async login(payload: LoginPayload): Promise<TokenResponse> {
    const response = await fetch(`${API_BASE_URL}/users/login/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error('Login failed');
    }

    const data = (await response.json()) as TokenResponse;
    localStorage.setItem('access_token', data.access);
    localStorage.setItem('refresh_token', data.refresh);
    return data;
  },
  async register(payload: any): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/users/register/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      let errorMsg = 'Đăng ký thất bại';
      try {
        const errData = await response.json();
        errorMsg = errData.message || errData.error || errorMsg;
      } catch { }
      throw new Error(errorMsg);
    }
    return response.json();
  },
  logout() {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
  },
  getAccessToken() {
    return localStorage.getItem('access_token');
  },
  getRefreshToken() {
    return localStorage.getItem('refresh_token');
  },
};

export const orderApi = {
  sync: async (payload: unknown) => (await api.post('/orders/sync/', payload)).data,
  cancel: async (payload: unknown) => (await api.post('/orders/cancel/', payload)).data,
  // ... các hàm cũ
  placeOrderWithVoucher: async (payload: any) => {
    // API này sẽ nhận cả thông tin đơn hàng và mã voucher
    return (await api.post('/vouchers/checkout/', payload)).data;
  },
};

export const voucherApi = {
  get: async (id: number | string) => (await api.get(`/vouchers/${id}/`)).data,
  apply: async (payload: unknown) => (await api.post('/vouchers/apply/', payload)).data,
  confirm: async (payload: unknown) => (await api.post('/vouchers/confirm/', payload)).data,
  statsOverview: async () => (await api.get('/vouchers/stats/overview/')).data,
  statsOverviewPublic: async () => (await api.get('/vouchers/stats/overview/public/')).data,
  statsRevenueChart: async (params: { group_by: string; start_date?: string; end_date?: string }) =>
    (await api.get('/vouchers/stats/revenue-chart/', { params })).data,
  topVouchers: async (params: { start_date: string; end_date: string; limit?: number }) =>
    (await api.get('/vouchers/stats/top-vouchers/', { params })).data,
  performance: async (params: { start_date: string; end_date: string; ordering?: string }) =>
    (await api.get('/vouchers/stats/performance/', { params })).data,
  list: async () => (await api.get('/vouchers/')).data,
  create: async (payload: unknown) => (await api.post('/vouchers/create-and-distribute/', payload)).data,
  update: async (id: number, payload: unknown) => (await api.patch(`/vouchers/${id}/`, payload)).data,
  delete: async (id: number) => (await api.delete(`/vouchers/${id}/`)).data,
  distribute: async (payload: unknown) => (await api.post('/vouchers/distribute/', payload)).data,
  eligibleUsers: async (voucherId: number) => (await api.get(`/vouchers/${voucherId}/eligible-users/`)).data,
  createAndDistribute: async (payload: unknown) => (await api.post('/vouchers/create-and-distribute/', payload)).data,
  recipients: async (id: number, params?: Record<string, unknown>) => (await api.get(`/vouchers/${id}/recipients/`, { params })).data,
  removeRecipient: async (voucherId: number, userId: number) => (await api.delete(`/vouchers/${voucherId}/recipients/${userId}/`)).data,
  deliveryLogs: async (id: number) => (await api.get(`/vouchers/${id}/delivery-logs/`)).data,
  resendEmail: async (voucherId: number, userId: number) => (await api.post(`/vouchers/${voucherId}/resend-email/`, { user_id: userId })).data,
  sendEmail: async (voucherId: number, email: string) => (await api.post(`/vouchers/${voucherId}/send-email/`, { email })).data,
  userHistory: async (userId: number) => (await api.get(`/vouchers/user/${userId}/history/`)).data,
};

export const customerApi = {
  list: async (params?: Record<string, unknown>) => (await api.get('/users/customers/', { params })).data,
};

export const staffApi = {
  list: async () => (await api.get('/users/staff/')).data,
  updateRole: async (userId: number, payload: unknown) => (await api.patch(`/users/${userId}/role/`, payload)).data,
  updateUser: async (userId: number, payload: unknown) => (await api.patch(`/users/${userId}/update/`, payload)).data,
  deleteUser: async (userId: number) => (await api.delete(`/users/${userId}/`)).data,
  toggleActive: async (userId: number) => (await api.patch(`/users/${userId}/toggle-active/`)).data,
};


// (Bổ sung thêm nếu ní muốn tách riêng mảng Wallet ra cho dễ quản lý)
export const walletApi = {
  getMyVouchers: async () => (await api.get('/users/vouchers-for-user/')).data,
};
export const userApi = {
  getMyVouchers: async (): Promise<WalletVoucher[]> => {
    const response = await api.get('/users/vouchers-for-user/');
    
    // Axios trả về response.data
    // Backend của ní lại bọc array trong biến "data" một lần nữa
    // Nên phải .data.data thì mới lấy được cái mảng thật sự
    return response.data.data || response.data; 
  },
};
export default api;
