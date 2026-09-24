// Auto-detect base path when hosted under a subfolder (e.g. /ranchos)
const getApiBase = () => {
  const parts = window.location.pathname.split('/').filter(Boolean);
  if (parts.length > 0 && !parts[0].includes('.') && parts[0] !== 'api') {
    return `/${parts[0]}`;
  }
  return '';
};
const API_BASE = getApiBase();

const API = {
  getToken() {
    return localStorage.getItem('ranchodobles_token');
  },

  setToken(token) {
    if (token) {
      localStorage.setItem('ranchodobles_token', token);
    } else {
      localStorage.removeItem('ranchodobles_token');
    }
  },

  clearToken() {
    localStorage.removeItem('ranchodobles_token');
  },

  async request(endpoint, options = {}) {
    const token = this.getToken();
    const headers = {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const config = {
      ...options,
      headers
    };

    if (config.body && typeof config.body === 'object' && !(config.body instanceof FormData)) {
      config.body = JSON.stringify(config.body);
    }

    try {
      const response = await fetch(`${API_BASE}${endpoint}`, config);
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          if (data.error && data.error.includes('pendiente')) {
            // Keep error message for pending users
          } else if (endpoint !== '/api/auth/login') {
            // Token expired or invalid
            this.clearToken();
            window.dispatchEvent(new CustomEvent('auth:expired'));
          }
        }
        const error = new Error(data.error || 'Ocurrió un error en el servidor');
        error.status = response.status;
        error.data = data;
        throw error;
      }

      return data;
    } catch (error) {
      throw error;
    }
  },

  // Auth endpoints
  auth: {
    login(email, password) {
      return API.request('/api/auth/login', {
        method: 'POST',
        body: { email, password }
      });
    },
    register(userData) {
      return API.request('/api/auth/register', {
        method: 'POST',
        body: userData
      });
    },
    me() {
      return API.request('/api/auth/me');
    },
    updateProfile(profileData) {
      return API.request('/api/auth/profile', {
        method: 'PUT',
        body: profileData
      });
    },
    changePassword(passData) {
      return API.request('/api/auth/change-password', {
        method: 'PUT',
        body: passData
      });
    },
    forgotPassword(identifier) {
      return API.request('/api/auth/forgot-password', {
        method: 'POST',
        body: { identifier }
      });
    },
    verifyResetToken(token) {
      return API.request('/api/auth/verify-reset-token', {
        method: 'POST',
        body: { token }
      });
    },
    resetPassword(token, newPassword, confirmPassword) {
      return API.request('/api/auth/reset-password', {
        method: 'POST',
        body: { token, newPassword, confirmPassword }
      });
    },
    logout() {
      return API.request('/api/auth/logout', {
        method: 'POST'
      }).catch(() => {});
    }
  },

  // Bookings
  bookings: {
    get(date) {
      const query = date ? `?date=${encodeURIComponent(date)}` : '';
      return API.request(`/api/bookings${query}`);
    },
    create(date, slot) {
      return API.request('/api/bookings', {
        method: 'POST',
        body: { date, slot }
      });
    },
    cancel(id, reason) {
      return API.request(`/api/bookings/${id}`, {
        method: 'DELETE',
        body: reason ? { reason } : undefined
      });
    },
    blockCourt(data) {
      return API.request('/api/bookings/admin/block', {
        method: 'POST',
        body: data
      });
    },
    unblockDay(date) {
      return API.request('/api/bookings/admin/unblock-day', {
        method: 'POST',
        body: { date }
      });
    }
  },

  // Visits
  visits: {
    get(params = {}) {
      const query = new URLSearchParams(params).toString();
      return API.request(`/api/visits${query ? '?' + query : ''}`);
    },
    create(visitData) {
      return API.request('/api/visits', {
        method: 'POST',
        body: visitData
      });
    },
    updateStatus(id, status) {
      return API.request(`/api/visits/${id}/status`, {
        method: 'PATCH',
        body: { status }
      });
    },
    delete(id) {
      return API.request(`/api/visits/${id}`, {
        method: 'DELETE'
      });
    },
    getInviteToken() {
      return API.request('/api/visits/invite-token');
    },
    verifyInvite(token) {
      return API.request(`/api/visits/verify-invite?token=${encodeURIComponent(token)}`);
    },
    scanLookup(data) {
      return API.request('/api/visits/scan-lookup', {
        method: 'POST',
        body: data
      });
    }
  },

  // News
  news: {
    get() {
      return API.request('/api/news');
    },
    create(newsData) {
      return API.request('/api/news', {
        method: 'POST',
        body: newsData
      });
    },
    delete(id) {
      return API.request(`/api/news/${id}`, {
        method: 'DELETE'
      });
    }
  },

  // Notifications
  notifications: {
    get() {
      return API.request('/api/notifications');
    },
    markAllRead() {
      return API.request('/api/notifications/read-all', {
        method: 'PATCH'
      });
    },
    getAdminBroadcasts() {
      return API.request('/api/notifications/admin/broadcasts');
    },
    broadcast(data) {
      return API.request('/api/notifications/broadcast', {
        method: 'POST',
        body: data
      });
    },
    deleteBroadcast(id) {
      return API.request(`/api/notifications/admin/${id}`, {
        method: 'DELETE'
      });
    },
    guardToAdmin(data) {
      return API.request('/api/notifications/guard-to-admin', {
        method: 'POST',
        body: data
      });
    },
    adminToGuard(data) {
      return API.request('/api/notifications/admin-to-guard', {
        method: 'POST',
        body: data
      });
    },
    adminNotifyResidents(data) {
      return API.request('/api/notifications/admin/notify-residents', {
        method: 'POST',
        body: data
      });
    }
  },

  // Expenses
  expenses: {
    get() {
      return API.request('/api/expenses');
    },
    getAdminAll() {
      return API.request('/api/expenses/admin/all');
    },
    pay(id, payload) {
      const body = typeof payload === 'object' && payload !== null ? payload : { reference: payload };
      return API.request(`/api/expenses/${id}/pay`, {
        method: 'POST',
        body
      });
    },
    getReceiptUrl(id, download = false) {
      const token = API.getToken();
      const query = token ? `?token=${encodeURIComponent(token)}${download ? '&download=1' : ''}` : (download ? '?download=1' : '');
      return `${API_BASE}/api/expenses/${id}/receipt${query}`;
    },
    updateStatus(id, status) {
      return API.request(`/api/expenses/${id}/status`, {
        method: 'PATCH',
        body: { status }
      });
    },
    emit(data) {
      return API.request('/api/expenses/admin/emit', {
        method: 'POST',
        body: data
      });
    },
    deleteAdmin(id) {
      return API.request(`/api/expenses/admin/${id}`, {
        method: 'DELETE'
      });
    }
  },

  // Admin
  admin: {
    getUsers(status, search) {
      const params = new URLSearchParams();
      if (status) params.append('status', status);
      if (search) params.append('search', search);
      const query = params.toString() ? `?${params.toString()}` : '';
      return API.request(`/api/admin/users${query}`);
    },
    createUser(userData) {
      return API.request('/api/admin/users', {
        method: 'POST',
        body: userData
      });
    },
    updateUser(id, userData) {
      return API.request(`/api/admin/users/${id}`, {
        method: 'PUT',
        body: userData
      });
    },
    approveUser(id, data) {
      return API.request(`/api/admin/users/${id}/approve`, {
        method: 'PATCH',
        body: data || undefined
      });
    },
    deleteUser(id) {
      return API.request(`/api/admin/users/${id}`, {
        method: 'DELETE'
      });
    },
    updateRole(id, role) {
      return API.request(`/api/admin/users/${id}/role`, {
        method: 'PATCH',
        body: { role }
      });
    },
    generateResetToken(id) {
      return API.request(`/api/admin/users/${id}/reset-token`, {
        method: 'POST',
        body: { sendEmail: true }
      });
    },
    getStats() {
      return API.request('/api/admin/stats');
    }
  },

  // Activity Logs (Audit trail for guard shifts and users)
  activityLogs: {
    get(params = {}) {
      const query = new URLSearchParams(params).toString();
      return API.request(`/api/activity-logs${query ? '?' + query : ''}`);
    },
    log(action, details = '') {
      return API.request('/api/activity-logs', {
        method: 'POST',
        body: { action, details }
      }).catch((err) => console.warn('[Activity Log Error]', err));
    }
  },

  // Guard Notices (Avisos a guardia y Notificaciones de guardia a vecinos)
  guardNotices: {
    get(status) {
      const query = status ? `?status=${encodeURIComponent(status)}` : '';
      return API.request(`/api/guard-notices${query}`);
    },
    create(data) {
      return API.request('/api/guard-notices', {
        method: 'POST',
        body: data
      });
    },
    updateStatus(id, data) {
      return API.request(`/api/guard-notices/${id}/status`, {
        method: 'PATCH',
        body: data
      });
    },
    getResidents() {
      return API.request('/api/guard-notices/residents');
    },
    notifyResident(data) {
      return API.request('/api/guard-notices/notify-resident', {
        method: 'POST',
        body: data
      });
    }
  }
};

window.API = API;
