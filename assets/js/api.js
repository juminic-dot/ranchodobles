const API_BASE = '';

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
    cancel(id) {
      return API.request(`/api/bookings/${id}`, {
        method: 'DELETE'
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
    }
  },

  // Expenses
  expenses: {
    get() {
      return API.request('/api/expenses');
    },
    pay(id) {
      return API.request(`/api/expenses/${id}/pay`, {
        method: 'POST'
      });
    }
  },

  // Admin
  admin: {
    getUsers(status) {
      const query = status ? `?status=${encodeURIComponent(status)}` : '';
      return API.request(`/api/admin/users${query}`);
    },
    approveUser(id) {
      return API.request(`/api/admin/users/${id}/approve`, {
        method: 'PATCH'
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
    getStats() {
      return API.request('/api/admin/stats');
    }
  }
};

window.API = API;
