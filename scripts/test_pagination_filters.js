const BASE_URL = 'http://127.0.0.1:5000/api/v1';

async function request(endpoint, options = {}, token = null) {
  const url = endpoint.startsWith('http') ? endpoint : `${BASE_URL}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(url, { ...options, headers });
  let data;
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('json')) {
    data = await res.json();
  } else {
    data = await res.text();
  }
  return { status: res.status, headers: res.headers, data };
}

async function verifyPaginationAndFilters() {
  console.log('=== Verifying Pagination & Date Range Filtering Across Endpoints ===\n');

  // 1. Authenticate as Superadmin
  const loginRes = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      email: 'superadmin@hospital.com',
      password: 'SuperAdmin123!'
    })
  });
  const token = loginRes.data?.accessToken || loginRes.data?.token;

  if (!token) {
    console.error('Failed to authenticate as superadmin:', loginRes.data);
    process.exit(1);
  }

  const endpointsToTest = [
    { name: 'Patients', url: '/patients' },
    { name: 'Admissions', url: '/admissions' },
    { name: 'Orders', url: '/orders' },
    { name: 'Appointments', url: '/appointments' },
    { name: 'Users', url: '/users' },
    { name: 'Attendance', url: '/attendance' },
    { name: 'Leave Types', url: '/leave-types' },
    { name: 'Audit Logs', url: '/audit-logs' },
    { name: 'Medicines', url: '/pharmacy/medicines' },
    { name: 'Specialties', url: '/specialties' },
    { name: 'Doctor Profiles', url: '/doctors/profiles' },
    { name: 'Service Items', url: '/services' },
    { name: 'Tariffs', url: '/tariffs' },
    { name: 'Lab Samples', url: '/lab/worklist' },
    { name: 'Radiology Studies', url: '/radiology/worklist' },
    { name: 'Emergency Cases', url: '/emergency/board' }
  ];

  let passed = 0;

  for (const ep of endpointsToTest) {
    try {
      // Test page 1 with limit 2
      const resPage1 = await request(`${ep.url}?page=1&limit=2`, { method: 'GET' }, token);
      const body1 = resPage1.data;

      // Verify pagination fields
      const hasPaginationFields =
        body1.success === true &&
        typeof body1.total === 'number' &&
        body1.page === 1 &&
        body1.limit === 2 &&
        typeof body1.totalPages === 'number' &&
        typeof body1.hasMore === 'boolean' &&
        Array.isArray(body1.data);

      if (!hasPaginationFields) {
        console.error(`❌ FAIL: ${ep.name} missing standard pagination structure`, body1);
        continue;
      }

      // Test date range filter (from 2020 to 2030)
      const resDateRange = await request(`${ep.url}?page=1&limit=2&startDate=2020-01-01&endDate=2030-12-31`, { method: 'GET' }, token);
      const bodyDate = resDateRange.data;

      if (bodyDate.success && Array.isArray(bodyDate.data)) {
        console.log(`✔ PASS: ${ep.name.padEnd(20)} | Page: ${body1.page}/${body1.totalPages} | Limit: ${body1.limit} | Total: ${String(body1.total).padStart(3)} | Returned: ${body1.count} | Date Filter OK`);
        passed++;
      } else {
        console.error(`❌ FAIL: ${ep.name} date range filtering failed`);
      }
    } catch (err) {
      console.error(`❌ ERROR on ${ep.name}:`, err.message);
    }
  }

  console.log(`\n======================================================`);
  console.log(`Pagination & Filter Results: ${passed}/${endpointsToTest.length} Passed`);
  console.log(`======================================================\n`);
  
  if (passed === endpointsToTest.length) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

verifyPaginationAndFilters();
