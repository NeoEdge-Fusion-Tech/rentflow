import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// JWT Authorization Interceptor
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  // Inject selected organization ID for super admins conditionally
  const selectedOrgId = localStorage.getItem('selectedOrganizationId');
  if (selectedOrgId && (!config.params || !('organization' in config.params))) {
    config.params = { 
      ...config.params, 
      organization: selectedOrgId // For django-filters and custom mixins compatibility
    };
  }

  return config;
});

export const CategoryService = {
  getAll: (params?: any) => api.get('/inventory/categories/', { params }),
  create: (data: any) => api.post('/inventory/categories/', data),
  update: (id: number, data: any) => api.put(`/inventory/categories/${id}/`, data),
  delete: (id: number) => api.delete(`/inventory/categories/${id}/`),
};

export const UserService = {
  getAll: (params?: any) => api.get('/users/team/', { params }),
  create: (data: any) => api.post('/users/team/', data),
  update: (id: number | string, data: any) => api.put(`/users/team/${id}/`, data),
  delete: (id: number | string) => api.delete(`/users/team/${id}/`),
  adminChangePassword: (id: number | string, data: any) => api.post(`/users/team/${id}/admin_change_password/`, data),
  adminTriggerReset: (id: number | string) => api.post(`/users/team/${id}/admin_trigger_reset/`),
  deactivate: (id: number | string) => api.post(`/users/team/${id}/deactivate/`),
};

export const ProductService = {
  getAll: (params?: any) => api.get('/inventory/products/', { params }),
  create: (data: any) => api.post('/inventory/products/', data),
  update: (id: number, data: any) => api.put(`/inventory/products/${id}/`, data),
  delete: (id: number) => api.delete(`/inventory/products/${id}/`),
  getAvailability: (id: string | number, start_date: string, end_date: string, exclude_booking_id?: number | string) => 
    api.get(`/inventory/products/${id}/availability/`, { params: { start_date, end_date, exclude_booking_id } }),
  scan: (data: { 
    serial_number: string; 
    action: 'pickup' | 'return' | 'verify'; 
    quantity?: number;
    qty_good?: number;
    qty_damaged?: number;
    condition?: string;
    condition_submitted?: boolean;
  }) => api.post('/inventory/scan/', data),
};

export const ProductUnitService = {
  create: (data: any) => api.post('/inventory/units/', data),
};

export const BookingService = {
  getAll: (params?: any) => api.get('/inventory/bookings/', { params }),
  get: (id: number | string) => api.get(`/inventory/bookings/${id}/`),
  create: (data: any) => api.post('/inventory/bookings/', data),
  update: (id: number | string, data: any) => api.put(`/inventory/bookings/${id}/`, data),
  patch: (id: number | string, data: any) => api.patch(`/inventory/bookings/${id}/`, data),
  delete: (id: number | string) => api.delete(`/inventory/bookings/${id}/`),
};

export const ClientService = {
  getAll: (params?: any) => api.get('/users/clients/', { params }),
  create: (data: any) => api.post('/users/clients/', data),
  update: (id: number | string, data: any) => api.patch(`/users/clients/${id}/`, data),
  delete: (id: number | string) => api.delete(`/users/clients/${id}/`),
};

export const AuthService = {
  login: (data: { username: string; password: string }) => api.post('/users/token/', data),
  register: (data: any) => api.post('/users/register/', data),
  verifyEmail: (data: { email: string; code: string }) => api.post('/users/verify-email/', data),
  triggerPasswordReset: (data: { email: string }) => api.post('/users/password-reset/trigger/', data),
  setPasswordReset: (data: any) => api.post('/users/password-reset/set/', data),
  getMe: () => api.get('/users/me/'),
  updateMe: (data: any) => api.patch('/users/me/', data),
  deleteMe: () => api.delete('/users/me/'),
};

export const PaymentService = {
  getAll: (params?: any) => api.get('/payment/payments/', { params }),
  createLink: (bookingId: number, amount: number) => 
    api.post('/payment/create_payment_link/', { booking_id: bookingId, amount }),
};

export const StatsService = {
  getTenantStats: (params?: any) => api.get('/inventory/stats/', { params }),
  getSuperAdminStats: () => api.get('/users/superadmin/stats/')
};

export const NotificationService = {
  getAll: () => api.get('/notification/notifications/'),
  markRead: (id: number) => api.post(`/notification/notifications/${id}/mark_read/`),
  markAllRead: () => api.post('/notification/notifications/mark_all_read/'),
};

export const CurrencyService = {
  getAll: (params?: any) => api.get('/users/currencies/', { params }),
  create: (data: any) => api.post('/users/currencies/', data),
  update: (id: number | string, data: any) => api.patch(`/users/currencies/${id}/`, data),
  delete: (id: number | string) => api.delete(`/users/currencies/${id}/`),
};

export const OrganizationService = {
  get: (id: number | string) => api.get(`/users/organizations/${id}/`),
  update: (id: number | string, data: any) => api.put(`/users/organizations/${id}/`, data),
  patch: (id: number | string, data: any) => api.patch(`/users/organizations/${id}/`, data),
};

export const SuperAdminService = {
  // Stats
  getStats: () => api.get('/users/superadmin/stats/'),

  // Organizations
  getOrganizations: (params?: any) => api.get('/users/superadmin/organizations/', { params }),
  getOrganization: (id: number | string) => api.get(`/users/superadmin/organizations/${id}/`),
  createOrganization: (data: any) => api.post('/users/superadmin/organizations/', data),
  updateOrganization: (id: number | string, data: any) => api.patch(`/users/superadmin/organizations/${id}/`, data),
  deleteOrganization: (id: number | string) => api.delete(`/users/superadmin/organizations/${id}/`),

  // Users
  getUsers: (params?: any) => api.get('/users/superadmin/users/', { params }),
  getUser: (id: number | string) => api.get(`/users/superadmin/users/${id}/`),
  createUser: (data: any) => api.post('/users/superadmin/users/', data),
  updateUser: (id: number | string, data: any) => api.patch(`/users/superadmin/users/${id}/`, data),
  deleteUser: (id: number | string) => api.delete(`/users/superadmin/users/${id}/`),
};
