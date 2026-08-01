import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL as string;

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// JWT Authorization Interceptor
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token') || sessionStorage.getItem('token');
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

// Simple In-Memory Cache for GET requests
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

const getCacheKey = (url: string, config?: any) => {
  return url + JSON.stringify(config?.params || {});
};

const originalGet = api.get.bind(api);
api.get = async (url: string, config?: any) => {
  // Skip caching for blob requests (like downloads)
  if (config?.responseType === 'blob') {
    return originalGet(url, config);
  }

  const key = getCacheKey(url, config);
  const cached = cache.get(key);
  
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return Promise.resolve({ 
      data: cached.data, 
      status: 200, 
      statusText: 'OK', 
      headers: {} as any, 
      config: config as any 
    });
  }
  
  const response = await originalGet(url, config);
  cache.set(key, { data: response.data, timestamp: Date.now() });
  return response;
};

// Clear cache on any mutation to ensure data consistency
api.interceptors.response.use((response) => {
  const method = response.config.method?.toLowerCase();
  if (method && ['post', 'put', 'patch', 'delete'].includes(method)) {
    cache.clear();
  }
  return response;
}, (error) => {
  return Promise.reject(error);
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
  getSubscriptionPlans: () => api.get('/users/subscription-plans/'),
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
  create: (data: any) => api.post('/users/clients/', data, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  update: (id: number | string, data: any) => api.patch(`/users/clients/${id}/`, data, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  delete: (id: number | string) => api.delete(`/users/clients/${id}/`),
};

export const VendorService = {
  getAll: (params?: any) => api.get('/users/vendors/', { params }),
  create: (data: any) => api.post('/users/vendors/', data, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  update: (id: number | string, data: any) => api.patch(`/users/vendors/${id}/`, data, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  delete: (id: number | string) => api.delete(`/users/vendors/${id}/`),
};

export const AuthService = {
  login: (data: { username: string; password: string }) => api.post('/users/token/', data),
  register: (data: any) => api.post('/users/register/', data),
  verifyEmail: (data: { email: string; code: string }) => api.post('/users/verify-email/', data),
  resendVerifyEmail: (data: { email: string }) => api.post('/users/resend-verification-email/', data),
  triggerPasswordReset: (data: { email: string }) => api.post('/users/password-reset/trigger/', data),
  setPasswordReset: (data: any) => api.post('/users/password-reset/set/', data),
  getMe: () => api.get('/users/me/'),
  updateMe: (data: any) => api.patch('/users/me/', data),
  deleteMe: () => api.delete('/users/me/'),
  changePassword: (data: any) => api.post('/users/change-password/', data),
};

export const PaymentService = {
  getAll: (params?: any) => api.get('/payment/payments/', { params }),
  create: (data: any) => api.post('/payment/payments/', data),
  createLink: (bookingId: number, amount: number) => 
    api.post('/payment/payments/create_payment_link/', { booking_id: bookingId, amount }),
  createSubscriptionLink: (plan_name: string) => 
    api.post('/payment/payments/create_subscription_link/', { plan_name }),
  getOrganizationSubscription: () => api.get('/payment/organization/subscription/'),
  getSubscriptionPayments: () => api.get('/payment/subscription-payments/'),
};

export const InvoiceService = {
  get: (id: number | string) => api.get(`/payment/invoices/${id}/`),
  getAll: (params?: any) => api.get('/payment/invoices/', { params }),
  prefillFromBooking: (bookingId: number | string) =>
    api.get('/payment/invoices/prefill/', { params: { booking_id: bookingId } }),
  getNextNumber: () => api.get('/payment/invoices/next_number/'),
  create: (data: any) => api.post('/payment/invoices/', data),
  update: (id: number | string, data: any) => api.put(`/payment/invoices/${id}/`, data),
  patch: (id: number | string, data: any) => api.patch(`/payment/invoices/${id}/`, data),
  delete: (id: number | string) => api.delete(`/payment/invoices/${id}/`),
  recordPayment: (id: number | string, data: { amount: number, notes?: string }) => 
    api.post(`/payment/invoices/${id}/record_payment/`, data),
  download: (id: number | string) => api.get(`/payment/invoices/${id}/download/`, { responseType: 'blob' }),
  generatePaymentLink: (id: number | string) => api.post(`/payment/invoices/${id}/generate_payment_link/`),
  emptyTrash: () => api.delete('/payment/invoices/empty_trash/'),
};

export const QuotationService = {
  get: (id: number | string) => api.get(`/payment/quotations/${id}/`),
  getAll: (params?: any) => api.get('/payment/quotations/', { params }),
  getNextNumber: () => api.get('/payment/quotations/next_number/'),
  create: (data: any) => api.post('/payment/quotations/', data),
  update: (id: number | string, data: any) => api.put(`/payment/quotations/${id}/`, data),
  patch: (id: number | string, data: any) => api.patch(`/payment/quotations/${id}/`, data),
  delete: (id: number | string) => api.delete(`/payment/quotations/${id}/`),
  download: (id: number | string) => api.get(`/payment/quotations/${id}/download/`, { responseType: 'blob' }),
  convertToInvoice: (id: number | string) => api.post(`/payment/quotations/${id}/convert_to_invoice/`),
  emptyTrash: () => api.delete('/payment/quotations/empty_trash/'),
};

export const ReceiptService = {
  get: (id: number | string) => api.get(`/payment/receipts/${id}/`),
  getAll: (params?: any) => api.get('/payment/receipts/', { params }),
  generate: (paymentId: number | string) => 
    api.post('/payment/receipts/generate/', { payment_id: paymentId }),
  update: (id: number | string, data: any) => api.patch(`/payment/receipts/${id}/`, data),
  download: (id: number | string) => api.get(`/payment/receipts/${id}/download/`, { responseType: 'blob' }),
};

export const EventService = {
  getAll: (params?: any) => api.get('/events/events/', { params }),
  get: (id: number | string) => api.get(`/events/events/${id}/`),
  create: (data: any) => api.post('/events/events/', data),
  update: (id: number | string, data: any) => api.put(`/events/events/${id}/`, data),
  patch: (id: number | string, data: any) => api.patch(`/events/events/${id}/`, data),
  delete: (id: number | string) => api.delete(`/events/events/${id}/`),
  getDashboardStats: (params?: any) => api.get('/events/dashboard-stats/', { params }),
  getMonthlyBreakdown: (params?: any) => api.get('/events/monthly-breakdown/', { params }),
};

export const ExpenseService = {
  getAll: (params?: any) => api.get('/events/expenses/', { params }),
  create: (data: any) => api.post('/events/expenses/', data),
  update: (id: number | string, data: any) => api.patch(`/events/expenses/${id}/`, data),
  delete: (id: number | string) => api.delete(`/events/expenses/${id}/`),
  duplicate: (data: { target_event: number | string; source_event?: number | string; source_expense?: number | string }) => api.post('/events/expenses/duplicate/', data),
};

export const GeneralExpenseService = {
  getAll: (params?: any) => api.get('/payment/general-expenses/', { params }),
  get: (id: string | number) => api.get(`/payment/general-expenses/${id}/`),
  create: (data: any) => api.post('/payment/general-expenses/', data),
  update: (id: string | number, data: any) => api.patch(`/payment/general-expenses/${id}/`, data),
  delete: (id: string | number) => api.delete(`/payment/general-expenses/${id}/`),
  getStats: (params?: any) => api.get('/payment/general-expenses/stats/', { params }),
};

export const ChecklistTaskService = {
  getAll: (params?: any) => api.get('/events/checklist-tasks/', { params }),
  create: (data: any) => api.post('/events/checklist-tasks/', data),
  update: (id: number | string, data: any) => api.patch(`/events/checklist-tasks/${id}/`, data),
  delete: (id: number | string) => api.delete(`/events/checklist-tasks/${id}/`),
  duplicate: (sourceEvent: number | string, targetEvent: number | string) =>
    api.post('/events/checklist-tasks/duplicate/', { source_event: sourceEvent, target_event: targetEvent }),
  download: (eventId: number | string) =>
    api.get('/events/checklist-tasks/download/', { params: { event_id: eventId }, responseType: 'blob' }),
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

export const BankAccountService = {
  getAll: (params?: any) => api.get('/users/bank-accounts/', { params }),
  create: (data: any) => api.post('/users/bank-accounts/', data),
  update: (id: number | string, data: any) => api.patch(`/users/bank-accounts/${id}/`, data),
  delete: (id: number | string) => api.delete(`/users/bank-accounts/${id}/`),
};

export const OrganizationService = {
  get: (id: number | string) => api.get(`/users/organizations/${id}/`),
  update: (id: number | string, data: any) => api.put(`/users/organizations/${id}/`, data),
  patch: (id: number | string, data: any) => api.patch(`/users/organizations/${id}/`, data),
  uploadLogo: (id: number | string, file: File) => {
    const formData = new FormData();
    formData.append('company_logo', file);
    return api.patch(`/users/organizations/${id}/`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
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
  setPassword: (id: number | string, data: { new_password: string }) => api.post(`/users/superadmin/users/${id}/set_password/`, data),
  deactivateUser: (id: number | string) => api.post(`/users/superadmin/users/${id}/deactivate/`),
};

export const SupportService = {
  submitFeedback: (data: { type: 'feedback' | 'contact' | 'rating'; rating?: number; subject?: string; message: string }) => 
    api.post('/users/feedback/', data),
};

export const FeedbackService = {
  getForms: (params?: any) => api.get('/feedback/forms/', { params }),
  getForm: (id: number | string) => api.get(`/feedback/forms/${id}/`),
  createForm: (data: any) => api.post('/feedback/forms/', data),
  updateForm: (id: number | string, data: any) => api.put(`/feedback/forms/${id}/`, data),
  deleteForm: (id: number | string) => api.delete(`/feedback/forms/${id}/`),
};

export const ProjectFeedbackService = {
  getAll: (params?: any) => api.get('/feedback/project-feedbacks/', { params }),
  get: (id: number | string) => api.get(`/feedback/project-feedbacks/${id}/`),
  create: (data: any) => api.post('/feedback/project-feedbacks/', data),
  delete: (id: number | string) => api.delete(`/feedback/project-feedbacks/${id}/`),
  getResponses: (id: number | string) => api.get(`/feedback/project-feedbacks/${id}/responses/`),
};

export const PublicFeedbackService = {
  getForm: (uuid: string) => api.get(`/feedback/public/${uuid}/`),
  submitResponse: (data: any) => api.post('/feedback/public/', data),
};
