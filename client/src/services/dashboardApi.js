/**
 * MediPulse Hospital Management System — Dashboard API Client
 * OpenAPI Swagger Source: http://localhost:5000/api-docs
 * Comprehensive API service for Superadmin and Department Operations.
 */

import { getToken } from './authApi';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';

async function request(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const token = getToken();

  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  if (token && !headers['Authorization']) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const config = {
    ...options,
    headers,
    credentials: 'include'
  };

  try {
    let res = await fetch(url, config);

    // If transient proxy 500/502/503 happens during dev server reload, attempt a quick retry
    if ((res.status === 502 || res.status === 503 || res.status === 500) && options.retry !== false) {
      await new Promise((r) => setTimeout(r, 600));
      try {
        const retryRes = await fetch(url, config);
        if (retryRes.ok) {
          res = retryRes;
        }
      } catch (_) {}
    }

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      const errorMsg = data.message || data.error || `Request failed with status ${res.status}`;
      const err = new Error(errorMsg);
      err.status = res.status;
      err.data = data;
      throw err;
    }

    return data;
  } catch (err) {
    if (!options.silent) {
      console.warn(`[Dashboard API] ${options.method || 'GET'} ${endpoint} (${err.status || 500}): ${err.message}`);
    }
    throw err;
  }
}

export const dashboardApi = {
  // 1. User Management
  getUsers: async (params = {}) => {
    const query = new URLSearchParams();
    if (params.page) query.append('page', params.page);
    if (params.limit) query.append('limit', params.limit);
    if (params.role) query.append('role', params.role);
    if (params.department) query.append('department', params.department);
    if (params.search) query.append('search', params.search);
    const qs = query.toString() ? `?${query.toString()}` : '';
    return request(`/api/v1/users${qs}`);
  },

  createUser: async (userData) => {
    return request('/api/v1/users', {
      method: 'POST',
      body: JSON.stringify(userData)
    });
  },

  updateUser: async (id, userData) => {
    return request(`/api/v1/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(userData)
    });
  },

  updateUserStatus: async (id, status) => {
    return request(`/api/v1/users/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status })
    });
  },

  deleteUser: async (id) => {
    return request(`/api/v1/users/${id}`, {
      method: 'DELETE'
    });
  },

  // 2. Superadmin Governance
  createSuperadmin: async (data) => {
    return request('/api/v1/superadmins', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  demoteSuperadmin: async (id) => {
    return request(`/api/v1/superadmins/${id}/demote`, {
      method: 'PATCH'
    });
  },

  deleteSuperadmin: async (id) => {
    return request(`/api/v1/superadmins/${id}`, {
      method: 'DELETE'
    });
  },

  // 3. Audit Logs & Cryptographic Verification
  getAuditLogs: async (params = {}) => {
    const query = new URLSearchParams();
    if (params.page) query.append('page', params.page);
    if (params.limit) query.append('limit', params.limit || 20);
    if (params.action) query.append('action', params.action);
    const qs = query.toString() ? `?${query.toString()}` : '';
    return request(`/api/v1/audit-logs${qs}`);
  },

  verifyAuditLogs: async () => {
    return request('/api/v1/audit-logs/verify');
  },

  exportAuditLogs: async () => {
    return request('/api/v1/audit-logs/export', {
      method: 'POST'
    });
  },

  // 4. Hospital Departments
  getDepartments: async () => {
    return request('/api/v1/departments');
  },

  // 5. System Health Check
  getHealth: async () => {
    return request('/api/v1/health');
  },

  // 6. Clinical & Patients
  getPatients: async (params = {}) => {
    const query = new URLSearchParams();
    if (params.page) query.append('page', params.page);
    if (params.search) query.append('search', params.search);
    const qs = query.toString() ? `?${query.toString()}` : '';
    return request(`/api/v1/patients${qs}`);
  },

  // 7. Branches & Context
  getBranches: async () => {
    return request('/api/v1/branches');
  },

  switchBranch: async (branchId) => {
    return request('/api/v1/auth/switch-branch', {
      method: 'POST',
      body: JSON.stringify({ branchId })
    });
  },

  // 8. HR Department Module
  hr: {
    getHires: async () => request('/api/v1/hr/hires'),
    createHire: async (data) => request('/api/v1/hr/hires', { method: 'POST', body: JSON.stringify(data) }),
    updateHireStage: async (id, stage) => request(`/api/v1/hr/hires/${id}`, { method: 'PATCH', body: JSON.stringify({ stage }) }),
    getAttendanceCompliance: async () => request('/api/v1/hr/reports/attendance-compliance'),
    getHolidays: async () => request('/api/v1/hr/holidays')
  },

  // 9. Pharmacy Department Module
  pharmacy: {
    getMedicines: async () => request('/api/v1/pharmacy/medicines'),
    createMedicine: async (data) => request('/api/v1/pharmacy/medicines', { method: 'POST', body: JSON.stringify(data) }),
    getBatches: async () => request('/api/v1/pharmacy/batches'),
    dispense: async (data) => request('/api/v1/pharmacy/dispense', { method: 'POST', body: JSON.stringify(data) }),
    getExpiringAlerts: async () => request('/api/v1/pharmacy/alerts/expiring'),
    getLowStockAlerts: async () => request('/api/v1/pharmacy/alerts/low-stock'),
    getPurchaseOrders: async () => request('/api/v1/pharmacy/orders')
  },

  // 10. Security Department Module
  security: {
    getVisitors: async () => request('/api/v1/security/visitors'),
    checkInVisitor: async (data) => request('/api/v1/security/visitors', { method: 'POST', body: JSON.stringify(data) }),
    checkOutVisitor: async (id) => request(`/api/v1/security/visitors/${id}/checkout`, { method: 'PATCH' }),
    getIncidents: async () => request('/api/v1/security/incidents'),
    reportIncident: async (data) => request('/api/v1/security/incidents', { method: 'POST', body: JSON.stringify(data) }),
    broadcastAlert: async (data) => request('/api/v1/security/alerts', { method: 'POST', body: JSON.stringify(data) })
  },

  // 11. Finance Department Module
  finance: {
    getInvoices: async () => request('/api/v1/finance/invoices'),
    getBudgets: async () => request('/api/v1/finance/budgets'),
    getExpenses: async () => request('/api/v1/finance/expenses'),
    decideExpense: async (id, status) => request(`/api/v1/finance/expenses/${id}/decide`, { method: 'PATCH', body: JSON.stringify({ status }) }),
    getLedger: async () => request('/api/v1/finance/ledger')
  },

  // 12. Support & Facilities Module
  support: {
    getRequests: async () => request('/api/v1/support/requests'),
    createRequest: async (data) => request('/api/v1/support/requests', { method: 'POST', body: JSON.stringify(data) }),
    getHousekeeping: async () => request('/api/v1/support/housekeeping'),
    getTransportBookings: async () => request('/api/v1/support/transport')
  },

  // 13. Legal & Compliance Module
  legal: {
    getLicenses: async () => request('/api/v1/legal/licenses'),
    getContracts: async () => request('/api/v1/legal/contracts'),
    getCases: async () => request('/api/v1/legal/cases')
  },

  // 14. Technical & Biomedical Module
  technical: {
    getAssets: async () => request('/api/v1/technical/assets'),
    getMaintenanceList: async () => request('/api/v1/technical/maintenance'),
    getDowntimeReports: async () => request('/api/v1/technical/downtime')
  }
};

