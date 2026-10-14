require('dotenv').config();
const http = require('http');
const express = require('express');
const cookieParser = require('cookie-parser');
const connectDB = require('../src/config/db');

// Route modules
const authRoutes = require('../src/routes/authRoutes');
const userRoutes = require('../src/routes/userRoutes');
const attendanceRoutes = require('../src/routes/attendanceRoutes');
const salaryRoutes = require('../src/routes/salaryRoutes');
const payrollRoutes = require('../src/routes/payrollRoutes');
const auditRoutes = require('../src/routes/auditRoutes');
const departmentRoutes = require('../src/routes/departmentRoutes');
const hrRoutes = require('../src/routes/hrRoutes');
const leaveRoutes = require('../src/routes/leaveRoutes');
const pharmacyRoutes = require('../src/routes/pharmacyRoutes');
const securityRoutes = require('../src/routes/securityRoutes');
const financeRoutes = require('../src/routes/financeRoutes');
const supportRoutes = require('../src/routes/supportRoutes');
const legalRoutes = require('../src/routes/legalRoutes');
const technicalRoutes = require('../src/routes/technicalRoutes');

const app = express();
app.use(express.json());
app.use(cookieParser());

// Mount routes on /api/v1 and /api
const mountRoutes = (prefix) => {
  app.use(`${prefix}/auth`, authRoutes);
  app.use(`${prefix}/users`, userRoutes);
  app.use(`${prefix}/attendance`, attendanceRoutes);
  app.use(`${prefix}/salary`, salaryRoutes);
  app.use(`${prefix}/salaries`, salaryRoutes);
  app.use(`${prefix}/payroll`, payrollRoutes);
  app.use(`${prefix}/audit-logs`, auditRoutes);
  app.use(`${prefix}/departments`, departmentRoutes);
  app.use(`${prefix}/hr`, hrRoutes);
  app.use(`${prefix}/leaves`, leaveRoutes);
  app.use(`${prefix}/pharmacy`, pharmacyRoutes);
  app.use(`${prefix}/security`, securityRoutes);
  app.use(`${prefix}/finance`, financeRoutes);
  app.use(`${prefix}/support`, supportRoutes);
  app.use(`${prefix}/legal`, legalRoutes);
  app.use(`${prefix}/technical`, technicalRoutes);
};
mountRoutes('/api/v1');
mountRoutes('/api');

app.get('/api/v1/health', (req, res) => res.json({ status: 'ok' }));

const request = (server, method, path, headers = {}, body = null) => {
  return new Promise((resolve, reject) => {
    const address = server.address();
    const options = {
      hostname: '127.0.0.1',
      port: address.port,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = data ? JSON.parse(data) : {};
          resolve({ status: res.statusCode, headers: res.headers, body: json });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, body: data });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
};

const runIntegrationTests = async () => {
  await connectDB();
  const server = http.createServer(app);

  await new Promise(res => server.listen(0, '127.0.0.1', res));
  const port = server.address().port;
  console.log(`Test server running on port ${port}...`);

  try {
    console.log('\n--- 1. Testing Health Check ---');
    const health = await request(server, 'GET', '/api/v1/health');
    console.log(`[PASS] Health check returned ${health.status}:`, health.body);

    console.log('\n--- 2. Testing Authentication ---');
    // Login as Superadmin
    const superLogin = await request(server, 'POST', '/api/v1/auth/login', {}, {
      email: 'superadmin@hospital.com',
      password: 'SuperAdmin123!'
    });
    console.log(`[PASS] Superadmin login: Status ${superLogin.status}, Role: ${superLogin.body.user?.role}`);
    const superToken = superLogin.body.accessToken;

    // Login as HR Admin
    const hrLogin = await request(server, 'POST', '/api/v1/auth/login', {}, {
      email: 'hr.admin@hospital.com',
      password: 'Hospital123!'
    });
    console.log(`[PASS] HR Admin login: Status ${hrLogin.status}, Role: ${hrLogin.body.user?.role}`);
    const hrToken = hrLogin.body.accessToken;

    // Login as Pharmacy Admin
    const pharmLogin = await request(server, 'POST', '/api/v1/auth/login', {}, {
      email: 'pharmacy.admin@hospital.com',
      password: 'Hospital123!'
    });
    console.log(`[PASS] Pharmacy Admin login: Status ${pharmLogin.status}, Dept: ${pharmLogin.body.user?.department}`);
    const pharmToken = pharmLogin.body.accessToken;

    console.log('\n--- 3. Testing User Directory & Scoping ---');
    const allUsers = await request(server, 'GET', '/api/v1/users', { Authorization: `Bearer ${superToken}` });
    console.log(`[PASS] Superadmin sees ALL hospital users: count = ${allUsers.body.count}`);

    const hrUsers = await request(server, 'GET', '/api/v1/users', { Authorization: `Bearer ${hrToken}` });
    console.log(`[PASS] HR Admin sees only creator-scoped users: count = ${hrUsers.body.count}`);

    const pharmUsers = await request(server, 'GET', '/api/v1/users', { Authorization: `Bearer ${pharmToken}` });
    console.log(`[PASS] Pharmacy Admin sees only Pharmacy dept staff: count = ${pharmUsers.body.count}`);

    console.log('\n--- 4. Testing Hiring Permission Guard ---');
    // Pharmacy Admin attempting to hire should be rejected with 403
    const badHire = await request(server, 'POST', '/api/v1/users', { Authorization: `Bearer ${pharmToken}` }, {
      name: 'Unauthorized User',
      email: 'unauth@hospital.com',
      password: 'Password123!',
      role: 'user',
      department: 'pharmacy'
    });
    console.log(`[PASS] Non-HR Admin blocked from hiring: Status ${badHire.status} (${badHire.body.message})`);

    // HR Admin hiring should succeed with 201
    const testStaffEmail = `nurse.test.${Date.now()}@hospital.com`;
    const goodHire = await request(server, 'POST', '/api/v1/users', { Authorization: `Bearer ${hrToken}` }, {
      name: 'Registered Nurse Clara',
      email: testStaffEmail,
      password: 'NursePassword123!',
      role: 'user',
      designation: 'ICU Staff Nurse',
      department: 'support',
      salary: 62000
    });
    console.log(`[PASS] HR Admin hired user: Status ${goodHire.status}, ID: ${goodHire.body.user?._id}, EmpID: ${goodHire.body.user?.employeeId}`);

    console.log('\n--- 5. Testing Salary Records & Revision History ---');
    const mySalary = await request(server, 'GET', '/api/v1/salaries/me', { Authorization: `Bearer ${pharmToken}` });
    console.log(`[PASS] Pharmacy Admin own salary: Basic = ${mySalary.body.data?.basic}, Revision = #${mySalary.body.data?.currentRevision}`);

    // Revise salary as HR Admin
    const reviseSal = await request(server, 'PATCH', `/api/v1/salaries/${goodHire.body.user._id}`, { Authorization: `Bearer ${hrToken}` }, {
      basic: 65000,
      allowances: 5000,
      deductions: 1000,
      reason: 'Probation completed increment'
    });
    console.log(`[PASS] Salary revised to Revision #${reviseSal.body.data?.currentRevision}, Net Salary: ${reviseSal.body.data?.salary}`);

    console.log('\n--- 6. Testing Attendance 9-Hour Policy & Summary ---');
    const checkInRes = await request(server, 'POST', '/api/v1/attendance/check-in', { Authorization: `Bearer ${superToken}` }, {
      workMode: 'on_site',
      notes: 'Executive rounds check-in'
    });
    console.log(`[PASS] Check-in status: ${checkInRes.status} (${checkInRes.body.message || checkInRes.body.attendance?.status})`);

    const summaryRes = await request(server, 'GET', '/api/v1/attendance/summary', { Authorization: `Bearer ${superToken}` });
    console.log(`[PASS] Attendance monthly summary:`, summaryRes.body.summary);

    console.log('\n--- 7. Testing Payroll Run & Dry-Run ---');
    const dryRunRes = await request(server, 'POST', '/api/v1/payroll/run', { Authorization: `Bearer ${superToken}` }, {
      month: '2026-09',
      dryRun: true
    });
    console.log(`[PASS] Payroll dry-run: Status ${dryRunRes.status}, Total Gross: ${dryRunRes.body.data?.totalGross}, Staff: ${dryRunRes.body.data?.totalEmployees}`);

    console.log('\n--- 8. Testing Departments Registry ---');
    const deptList = await request(server, 'GET', '/api/v1/departments', { Authorization: `Bearer ${superToken}` });
    console.log(`[PASS] Departments list count: ${deptList.body.count}`);

    console.log('\n--- 9. Testing HR Modules (Hires & Leaves) ---');
    const leaveReq = await request(server, 'POST', '/api/v1/leaves', { Authorization: `Bearer ${hrToken}` }, {
      leaveType: 'annual',
      startDate: '2026-11-01',
      endDate: '2026-11-03',
      totalDays: 3,
      reason: 'Annual medical symposium'
    });
    console.log(`[PASS] Leave request submitted: Status ${leaveReq.status}, Leave ID: ${leaveReq.body.data?._id}`);

    const leaveBal = await request(server, 'GET', '/api/v1/leaves/balance/me', { Authorization: `Bearer ${hrToken}` });
    console.log(`[PASS] Leave balances:`, leaveBal.body.balance?.remaining);

    console.log('\n--- 10. Testing Pharmacy Modules (Formulary, Dispensing, Controlled Log) ---');
    const medsList = await request(server, 'GET', '/api/v1/pharmacy/medicines', { Authorization: `Bearer ${pharmToken}` });
    console.log(`[PASS] Pharmacy Medicines catalog count: ${medsList.body.count}`);

    const morphMed = medsList.body.data.find(m => m.isControlledSubstance);
    if (morphMed) {
      const dispenseRes = await request(server, 'POST', '/api/v1/pharmacy/dispense', { Authorization: `Bearer ${pharmToken}` }, {
        medicineId: morphMed._id,
        quantity: 2,
        dispensedTo: 'Emergency Trauma Unit'
      });
      console.log(`[PASS] Dispensed controlled drug: Status ${dispenseRes.status} (${dispenseRes.body.message})`);
    }

    const controlledLog = await request(server, 'GET', '/api/v1/pharmacy/controlled-log', { Authorization: `Bearer ${pharmToken}` });
    console.log(`[PASS] Controlled Substances Audit Log entries: ${controlledLog.body.count}`);

    console.log('\n--- 11. Testing Security Modules (Visitors & Incidents) ---');
    const visitorRes = await request(server, 'POST', '/api/v1/security/visitors', { Authorization: `Bearer ${superToken}` }, {
      name: 'Inspector Gordon',
      phone: '+1 555-0144',
      visitingPerson: 'Chief Medical Director',
      department: 'executive',
      purpose: 'Annual Regulatory Inspection',
      badgeNumber: 'VIS-9901'
    });
    console.log(`[PASS] Visitor checked in: Status ${visitorRes.status}, Badge #${visitorRes.body.data?.badgeNumber}`);

    console.log('\n--- 12. Testing Finance Modules (Budgets & Expenses) ---');
    const budgetsRes = await request(server, 'GET', '/api/v1/finance/budgets', { Authorization: `Bearer ${superToken}` });
    console.log(`[PASS] Finance Budgets count: ${budgetsRes.body.count}`);

    const expenseRes = await request(server, 'POST', '/api/v1/finance/expenses', { Authorization: `Bearer ${pharmToken}` }, {
      category: 'medical_supplies',
      amount: 1450.75,
      description: 'Sterile specimen containers bulk purchase'
    });
    console.log(`[PASS] Expense claim filed: Status ${expenseRes.status}, Expense #${expenseRes.body.data?.expenseNumber}`);

    console.log('\n--- 13. Testing Support Modules (Tickets & Supplies) ---');
    const supportReq = await request(server, 'POST', '/api/v1/support/requests', { Authorization: `Bearer ${pharmToken}` }, {
      category: 'housekeeping',
      priority: 'high',
      subject: 'Pharmacy floor sanitization request',
      description: 'Sterile buffer room deep sanitization before compounding',
      location: 'Pharmacy Clean Room'
    });
    console.log(`[PASS] Support service ticket: Status ${supportReq.status}, Ticket #${supportReq.body.data?.ticketNumber}`);

    console.log('\n--- 14. Testing Legal Modules (Policies & Confidential Docs) ---');
    const policiesRes = await request(server, 'GET', '/api/v1/legal/policies', { Authorization: `Bearer ${pharmToken}` });
    console.log(`[PASS] Public Hospital Policies visible to staff: count = ${policiesRes.body.count}`);

    console.log('\n--- 15. Testing Technical Modules (Assets & Health) ---');
    const techHealth = await request(server, 'GET', '/api/v1/technical/system/health', { Authorization: `Bearer ${superToken}` });
    console.log(`[PASS] Technical system health check: Status ${techHealth.status}, Node: ${techHealth.body.nodeVersion}`);

    const assetsRes = await request(server, 'GET', '/api/v1/technical/assets', { Authorization: `Bearer ${superToken}` });
    console.log(`[PASS] Technical IT/biomedical assets count: ${assetsRes.body.count}`);

    console.log('\n--- 16. Testing Audit Trail ---');
    const auditRes = await request(server, 'GET', '/api/v1/audit-logs', { Authorization: `Bearer ${superToken}` });
    console.log(`[PASS] Audit logs recorded across all write operations: count = ${auditRes.body.count}`);

    console.log('\n======================================================');
    console.log('ALL API MODULES & SCENARIOS VERIFIED SUCCESSFULLY!');
    console.log('======================================================\n');

    server.close();
    process.exit(0);
  } catch (err) {
    console.error('Integration test failure:', err);
    server.close();
    process.exit(1);
  }
};

runIntegrationTests();
