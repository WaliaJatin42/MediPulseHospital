const http = require('http');

async function sendRequest({ method, path, headers = {}, body = null }) {
  return new Promise((resolve, reject) => {
    const opts = {
      hostname: 'localhost',
      port: 5000,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };
    const req = http.request(opts, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data), headers: res.headers });
        } catch (e) {
          resolve({ status: res.statusCode, body: data, headers: res.headers });
        }
      });
    });
    req.on('error', reject);
    if (body) req.write(typeof body === 'string' ? body : JSON.stringify(body));
    req.end();
  });
}

async function runTests() {
  console.log('====================================================');
  console.log(' MediPulse Hospital API - VAPT & Route Security Test');
  console.log('====================================================\n');

  // Login as SuperAdmin to get valid token
  const loginRes = await sendRequest({
    method: 'POST',
    path: '/api/v1/auth/login',
    body: { email: 'superadmin@hospital.com', password: 'SuperAdmin123!' }
  });

  const superAdminToken = loginRes.body?.token || loginRes.body?.accessToken;

  const tests = [
    {
      name: 'Test 1: Script tag in body (<script>alert(1)</script>)',
      payload: { method: 'POST', path: '/api/v1/auth/login', body: { email: '<script>alert(1)</script>', password: 'pass' } },
      expectedStatus: 400
    },
    {
      name: 'Test 2: Img onerror in body (<img src=x onerror=alert(1)>)',
      payload: { method: 'POST', path: '/api/v1/auth/login', body: { email: 'test@example.com', password: '<img src=x onerror=alert(1)>' } },
      expectedStatus: 400
    },
    {
      name: 'Test 3: CSS Style tag in body (<style>body{background:red}</style>)',
      payload: { method: 'POST', path: '/api/v1/auth/login', body: { email: 'test@example.com', password: '<style>body{background:red}</style>' } },
      expectedStatus: 400
    },
    {
      name: 'Test 4: CSS @import injection (@import url("http://evil.com/style.css"))',
      payload: { method: 'POST', path: '/api/v1/auth/login', body: { email: 'test@example.com', password: '@import url("http://evil.com/style.css")' } },
      expectedStatus: 400
    },
    {
      name: 'Test 5: Javascript pseudo-protocol (javascript:alert(1))',
      payload: { method: 'POST', path: '/api/v1/auth/login', body: { email: 'javascript:alert(1)', password: 'pass' } },
      expectedStatus: 400
    },
    {
      name: 'Test 6: NoSQL injection in body ($gt operator)',
      payload: { method: 'POST', path: '/api/v1/auth/login', body: { email: { '$gt': '' }, password: 'pass' } },
      expectedStatus: 400
    },
    {
      name: 'Test 7: Prototype pollution in body (__proto__)',
      payload: { method: 'POST', path: '/api/v1/auth/login', body: '{"__proto__": {"isAdmin": true}, "email": "test@example.com", "password": "pass"}' },
      expectedStatus: 400
    },
    {
      name: 'Test 8: Script tag in query string (?search=<script>)',
      payload: { method: 'GET', path: '/api/v1/health?search=<script>alert(1)</script>' },
      expectedStatus: 400
    },
    {
      name: 'Test 9: Double URL-encoded script in query string (%253Cscript%253E)',
      payload: { method: 'GET', path: '/api/v1/health?search=%253Cscript%253Ealert(1)%253C%252Fscript%253E' },
      expectedStatus: 400
    },
    {
      name: 'Test 10: HTML entity encoded script in body (&lt;script&gt;)',
      payload: { method: 'POST', path: '/api/v1/auth/login', body: { email: '&lt;script&gt;alert(1)&lt;/script&gt;', password: 'pass' } },
      expectedStatus: 400
    },
    {
      name: 'Test 11: Security Headers (X-Content-Type-Options: nosniff & no X-Powered-By)',
      payload: { method: 'GET', path: '/api/v1/health' },
      customCheck: (res) => {
        const noXPB = !res.headers['x-powered-by'];
        const nosniff = res.headers['x-content-type-options'] === 'nosniff';
        return noXPB && nosniff;
      }
    },
    {
      name: 'Test 12: Route Protection - Unauthenticated GET /api/v1/users blocked with 401',
      payload: { method: 'GET', path: '/api/v1/users' },
      expectedStatus: 401
    },
    {
      name: 'Test 13: Route Protection - Unauthenticated GET /api/v1/salary blocked with 401',
      payload: { method: 'GET', path: '/api/v1/salary' },
      expectedStatus: 401
    },
    {
      name: 'Test 14: Route Protection - Unauthenticated GET /api/v1/payroll blocked with 401',
      payload: { method: 'GET', path: '/api/v1/payroll' },
      expectedStatus: 401
    },
    {
      name: 'Test 15: Route Protection - Unauthenticated GET /api/v1/attendance blocked with 401',
      payload: { method: 'GET', path: '/api/v1/attendance' },
      expectedStatus: 401
    },
    {
      name: 'Test 16: Route Protection - Tampered JWT Token blocked with 401',
      payload: { method: 'GET', path: '/api/v1/users', headers: { Authorization: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.tampered.signature' } },
      expectedStatus: 401
    },
    {
      name: 'Test 17: VAPT Input Guard on Protected Route - Script in user name blocked with 400',
      payload: {
        method: 'POST',
        path: '/api/v1/users',
        headers: { Authorization: `Bearer ${superAdminToken}` },
        body: {
          name: '<script>alert(1)</script>',
          email: 'hacked@hospital.com',
          password: 'Password123!',
          department: 'Cardiology',
          role: 'user'
        }
      },
      expectedStatus: 400
    },
    {
      name: 'Test 18: VAPT Input Guard on Protected Route - CSS style in user designation blocked with 400',
      payload: {
        method: 'POST',
        path: '/api/v1/users',
        headers: { Authorization: `Bearer ${superAdminToken}` },
        body: {
          name: 'Jane Doe',
          email: 'janedoe@hospital.com',
          password: 'Password123!',
          designation: '<style>body{display:none}</style>',
          department: 'Cardiology',
          role: 'user'
        }
      },
      expectedStatus: 400
    },
    {
      name: 'Test 19: Payload Size DoS Mitigation - Large body (>10kb) rejected with 413',
      payload: {
        method: 'POST',
        path: '/api/v1/auth/login',
        body: {
          email: 'superadmin@hospital.com',
          password: 'A'.repeat(25000)
        }
      },
      expectedStatus: 413
    },
    {
      name: 'Test 20: Clean authenticated request with SuperAdmin token succeeds with 200',
      payload: {
        method: 'GET',
        path: '/api/v1/users',
        headers: { Authorization: `Bearer ${superAdminToken}` }
      },
      expectedStatus: 200
    }
  ];

  let passed = 0;
  for (const t of tests) {
    try {
      const res = await sendRequest(t.payload);
      let ok = false;
      if (t.customCheck) {
        ok = t.customCheck(res);
      } else {
        ok = res.status === t.expectedStatus;
      }
      console.log((ok ? '✓ PASS: ' : '✗ FAIL: ') + t.name + ' -> Status: ' + res.status);
      if (ok) passed++;
      else console.log('   Response body / details:', res.body);
    } catch (err) {
      console.log('✗ ERROR: ' + t.name + ' -> ' + err.message);
    }
  }
  console.log(`\n====================================================`);
  console.log(` Comprehensive VAPT Test Results: ${passed}/${tests.length} tests passed!`);
  console.log('====================================================\n');
}

runTests();
