/**
 * MediPulse Hospital Management System — Frontend Authentication API Client
 * OpenAPI Swagger Source: http://localhost:5000/api-docs/#/Authentication
 * Specification: Session lifecycle, password reset, TOTP MFA, Google OAuth, and Branch Switching.
 * 
 * All project files are in pure JavaScript (no TypeScript).
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';

/**
 * Metadata catalog of all Authentication endpoints used on the Frontend.
 * Used for documentation, developer inspection, and interactive testing in the UI.
 */
export const AUTH_ENDPOINTS_CATALOG = [
  {
    id: 'login',
    method: 'POST',
    path: '/api/v1/auth/login',
    summary: 'Sign in with email and password',
    description: 'Authenticates user, sets HTTP-only session cookie, and returns JWT access token.',
    payload: { email: 'superadmin@hospital.com', password: 'SuperAdmin123!' },
    authRequired: false,
    category: 'Session Lifecycle'
  },
  {
    id: 'refresh',
    method: 'POST',
    path: '/api/v1/auth/refresh',
    summary: 'Refresh access token',
    description: 'Rotates expired JWT access token using refresh token or session cookie.',
    payload: { refreshToken: 'string (optional if cookie exists)' },
    authRequired: false,
    category: 'Session Lifecycle'
  },
  {
    id: 'logout',
    method: 'POST',
    path: '/api/v1/auth/logout',
    summary: 'Sign out and clear session',
    description: 'Invalidates session token and clears HTTP-only authentication cookies.',
    payload: null,
    authRequired: true,
    category: 'Session Lifecycle'
  },
  {
    id: 'changePassword',
    method: 'POST',
    path: '/api/v1/auth/change-password',
    summary: 'Change password for active user',
    description: 'Updates credentials while enforcing password complexity rules.',
    payload: { currentPassword: 'Hospital123!', newPassword: 'NewSecurePass123!' },
    authRequired: true,
    category: 'Password Management'
  },
  {
    id: 'forgotPassword',
    method: 'POST',
    path: '/api/v1/auth/forgot-password',
    summary: 'Request password reset token',
    description: 'Generates secure cryptographic reset token and dispatches reset notification.',
    payload: { email: 'user@hospital.com' },
    authRequired: false,
    category: 'Password Management'
  },
  {
    id: 'resetPassword',
    method: 'POST',
    path: '/api/v1/auth/reset-password',
    summary: 'Reset password with token',
    description: 'Applies new password using valid, unexpired reset token.',
    payload: { token: 'hex_token_here', newPassword: 'NewPassword123!' },
    authRequired: false,
    category: 'Password Management'
  },
  {
    id: 'googleAuth',
    method: 'GET',
    path: '/api/v1/auth/google',
    summary: 'Trigger Google OAuth 2.0 flow',
    description: 'Redirects client to Google OAuth consent screen for single sign-on.',
    payload: null,
    authRequired: false,
    category: 'OAuth 2.0 & SSO'
  },
  {
    id: 'mfaSetup',
    method: 'POST',
    path: '/api/v1/auth/mfa/setup',
    summary: 'Generate TOTP MFA secret & QR code',
    description: 'Generates base32 TOTP secret and otpauth URI for Google Authenticator.',
    payload: null,
    authRequired: true,
    category: 'Multi-Factor Auth (MFA)'
  },
  {
    id: 'mfaVerify',
    method: 'POST',
    path: '/api/v1/auth/mfa/verify',
    summary: 'Verify 6-digit TOTP code and enable MFA',
    description: 'Confirms first-time TOTP setup and returns one-time emergency recovery codes.',
    payload: { code: '123456' },
    authRequired: true,
    category: 'Multi-Factor Auth (MFA)'
  },
  {
    id: 'mfaDisable',
    method: 'POST',
    path: '/api/v1/auth/mfa/disable',
    summary: 'Disable two-factor authentication',
    description: 'Disables TOTP MFA after verifying the current 6-digit code or password.',
    payload: { code: '123456' },
    authRequired: true,
    category: 'Multi-Factor Auth (MFA)'
  },
  {
    id: 'mfaChallenge',
    method: 'POST',
    path: '/api/v1/auth/mfa/challenge',
    summary: 'Solve 2FA challenge during login',
    description: 'Validates TOTP code against temporary MFA challenge token to issue full access token.',
    payload: { mfaToken: 'challenge_token', code: '123456' },
    authRequired: false,
    category: 'Multi-Factor Auth (MFA)'
  },
  {
    id: 'mfaRecoveryRegenerate',
    method: 'POST',
    path: '/api/v1/auth/mfa/recovery-codes/regenerate',
    summary: 'Regenerate emergency recovery codes',
    description: 'Creates a new set of 8-character single-use emergency recovery codes.',
    payload: null,
    authRequired: true,
    category: 'Multi-Factor Auth (MFA)'
  },
  {
    id: 'getSessions',
    method: 'GET',
    path: '/api/v1/auth/sessions',
    summary: 'List active device sessions',
    description: 'Returns array of all active devices, IP addresses, and user-agent sessions.',
    payload: null,
    authRequired: true,
    category: 'Session Lifecycle'
  },
  {
    id: 'deleteSession',
    method: 'DELETE',
    path: '/api/v1/auth/sessions/:id',
    summary: 'Terminate specific remote session',
    description: 'Revokes a specific session by ID to immediately log out that device.',
    payload: null,
    authRequired: true,
    category: 'Session Lifecycle'
  },
  {
    id: 'logoutAll',
    method: 'POST',
    path: '/api/v1/auth/logout-all',
    summary: 'Revoke all device sessions',
    description: 'Immediately invalidates all active sessions and refresh tokens across all devices.',
    payload: null,
    authRequired: true,
    category: 'Session Lifecycle'
  },
  {
    id: 'switchBranch',
    method: 'POST',
    path: '/api/v1/auth/switch-branch',
    summary: 'Switch active hospital branch context',
    description: 'Issues updated JWT token scoped to Central Campus (MPH-CEN) or South Campus (MPH-SOU).',
    payload: { branchId: '6acfe10f404812432abadc09' },
    authRequired: true,
    category: 'Branch Context'
  },
  {
    id: 'getMe',
    method: 'GET',
    path: '/api/v1/users/me',
    summary: 'Get currently authenticated user',
    description: 'Retrieves active user profile, assigned department, roles, and branch scope.',
    payload: null,
    authRequired: true,
    category: 'User Profile'
  },
  {
    id: 'patientLogin',
    method: 'POST',
    path: '/api/v1/patient-auth/login',
    summary: 'Patient Portal OTP/Password login',
    description: 'Patient authentication endpoint issuing patient_portal audience token.',
    payload: { identifier: 'eleanor.gray@example.com', password: 'Patient123!' },
    authRequired: false,
    category: 'Patient Portal'
  }
];

// In-memory / localStorage token helper
export const getToken = () => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('medipulse_access_token');
};

export const setToken = (token) => {
  if (typeof window === 'undefined') return;
  if (token) {
    localStorage.setItem('medipulse_access_token', token);
  } else {
    localStorage.removeItem('medipulse_access_token');
  }
};

export const getStoredUser = () => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('medipulse_user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const setStoredUser = (user) => {
  if (typeof window === 'undefined') return;
  if (user) {
    localStorage.setItem('medipulse_user', JSON.stringify(user));
  } else {
    localStorage.removeItem('medipulse_user');
  }
};

/**
 * Universal JSON Fetch wrapper with automatic credentials, auth header, and error normalization
 */
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
    credentials: 'include' // Sends HTTP-only cookie automatically
  };

  try {
    const res = await fetch(url, config);
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
    console.error(`[API Error] ${options.method || 'GET'} ${endpoint}:`, err);
    throw err;
  }
}

/**
 * Authentication API Service Object
 */
export const authApi = {
  // 1. Session Lifecycle
  login: async (email, password) => {
    const res = await request('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    if (res.accessToken) {
      setToken(res.accessToken);
    }
    if (res.user) {
      setStoredUser(res.user);
    }
    return res;
  },

  refresh: async (refreshToken) => {
    const res = await request('/api/v1/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken })
    });
    if (res.accessToken) setToken(res.accessToken);
    return res;
  },

  logout: async () => {
    try {
      await request('/api/v1/auth/logout', { method: 'POST' });
    } finally {
      setToken(null);
      setStoredUser(null);
    }
  },

  // 2. Password Lifecycle
  changePassword: async (currentPassword, newPassword) => {
    return request('/api/v1/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword })
    });
  },

  forgotPassword: async (email) => {
    return request('/api/v1/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email })
    });
  },

  resetPassword: async (token, newPassword) => {
    return request('/api/v1/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, newPassword })
    });
  },

  // 3. Multi-Factor Authentication (TOTP 2FA)
  setupMfa: async () => {
    return request('/api/v1/auth/mfa/setup', { method: 'POST' });
  },

  verifyMfa: async (code) => {
    return request('/api/v1/auth/mfa/verify', {
      method: 'POST',
      body: JSON.stringify({ code })
    });
  },

  disableMfa: async (code) => {
    return request('/api/v1/auth/mfa/disable', {
      method: 'POST',
      body: JSON.stringify({ code })
    });
  },

  solveMfaChallenge: async (token, code) => {
    const res = await request('/api/v1/auth/mfa/challenge', {
      method: 'POST',
      body: JSON.stringify({
        challengeToken: token,
        mfaToken: token,
        code: String(code).trim()
      })
    });
    if (res.accessToken) setToken(res.accessToken);
    if (res.user) setStoredUser(res.user);
    return res;
  },

  regenerateRecoveryCodes: async () => {
    return request('/api/v1/auth/mfa/recovery-codes/regenerate', { method: 'POST' });
  },

  // 4. Session & Token Management
  getSessions: async () => {
    return request('/api/v1/auth/sessions', { method: 'GET' });
  },

  deleteSession: async (sessionId) => {
    return request(`/api/v1/auth/sessions/${sessionId}`, { method: 'DELETE' });
  },

  logoutAll: async () => {
    const res = await request('/api/v1/auth/logout-all', { method: 'POST' });
    setToken(null);
    setStoredUser(null);
    return res;
  },

  // 5. Branch Context Switching
  switchBranch: async (branchId) => {
    const res = await request('/api/v1/auth/switch-branch', {
      method: 'POST',
      body: JSON.stringify({ branchId })
    });
    if (res.accessToken) setToken(res.accessToken);
    return res;
  },

  // 6. Current User Profile
  getMe: async () => {
    return request('/api/v1/users/me', { method: 'GET' });
  },

  // 7. Patient Portal Login
  patientLogin: async (identifier, password) => {
    const res = await request('/api/v1/patient-auth/login', {
      method: 'POST',
      body: JSON.stringify({ identifier, password })
    });
    if (res.token || res.accessToken) {
      setToken(res.token || res.accessToken);
    }
    if (res.patient) {
      setStoredUser({ ...res.patient, isPatient: true });
    }
    return res;
  },

  // 8. Google OAuth Redirect URL
  getGoogleAuthUrl: () => {
    return `${API_BASE}/api/v1/auth/google`;
  }
};

export default authApi;
