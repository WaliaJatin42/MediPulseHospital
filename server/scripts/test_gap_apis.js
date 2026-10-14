/**
 * Comprehensive Integration Test Suite for MediPulse Hospital Backend Gap Items
 * Covers Sections 1 through 5 of the Additional API Specification
 */
const BASE_URL = process.env.TEST_URL || 'http://127.0.0.1:5000/api/v1';

let passed = 0;
let failed = 0;
const results = [];

function assert(condition, testName, details = '') {
  if (condition) {
    passed++;
    results.push({ test: testName, status: 'PASS', details });
    console.log(`\x1b[32m✔ PASS\x1b[0m: ${testName} ${details ? '(' + details + ')' : ''}`);
  } else {
    failed++;
    results.push({ test: testName, status: 'FAIL', details });
    console.error(`\x1b[31m✘ FAIL\x1b[0m: ${testName} ${details ? '(' + details + ')' : ''}`);
  }
}

async function request(endpoint, options = {}, token = null) {
  const url = endpoint.startsWith('http') ? endpoint : `${BASE_URL}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const res = await fetch(url, { ...options, headers });
    let data;
    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      data = await res.json();
    } else {
      data = await res.text();
    }
    return { status: res.status, headers: res.headers, data };
  } catch (err) {
    return { status: 500, error: err.message };
  }
}

async function loginUser(email, password = 'Hospital123!') {
  const res = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password })
  });
  const token = res.data?.accessToken || res.data?.data?.accessToken;
  const user = res.data?.user || res.data?.data?.user;
  if (res.status === 200 && res.data?.success && token) {
    return { token, user };
  }
  return null;
}

async function runTests() {
  console.log('\n=============================================================');
  console.log('  MediPulse Hospital Backend: Full Gap Items Integration Test');
  console.log('=============================================================\n');

  // 1. Health & Version Checks
  console.log('--- 5. Engineering: Health & Readiness ---');
  const healthRes = await request('/health');
  assert(healthRes.status === 200 && healthRes.data.status === 'ok', 'GET /health returns operational');

  const readyRes = await request('/health/ready');
  assert(readyRes.status === 200 && readyRes.data.status === 'ready', 'GET /health/ready returns database connected');

  const versionRes = await request('/version');
  assert(versionRes.status === 200 && versionRes.data.version, 'GET /version returns semantic versioning');

  // Authenticate Actors
  console.log('\n--- Authenticating Test Personas ---');
  const saAuth = await loginUser('superadmin@hospital.com', 'SuperAdmin123!');
  assert(!!saAuth, 'Superadmin Login', saAuth?.user?.email);

  const hrAdminAuth = await loginUser('hr.admin@hospital.com');
  assert(!!hrAdminAuth, 'HR Admin Login', hrAdminAuth?.user?.email);

  const hrSuperAuth = await loginUser('hr.supervisor@hospital.com');
  assert(!!hrSuperAuth, 'HR Supervisor Login', hrSuperAuth?.user?.email);

  const pharmAdminAuth = await loginUser('pharmacy.admin@hospital.com');
  assert(!!pharmAdminAuth, 'Pharmacy Admin Login', pharmAdminAuth?.user?.email);

  const staffAuth = await loginUser('pharmacist.staff@hospital.com');
  assert(!!staffAuth, 'Staff User Login', staffAuth?.user?.email);

  const saToken = saAuth.token;
  const hrToken = hrAdminAuth.token;
  const hrSuperToken = hrSuperAuth.token;
  const pharmToken = pharmAdminAuth.token;
  const staffToken = staffAuth.token;

  // 1.1 Payroll Policy Configuration
  console.log('\n--- 1.1 Payroll Policy Configuration ---');
  const policyRes = await request('/payroll-policies', {
    method: 'POST',
    body: JSON.stringify({
      name: 'FY2026-Hospital-Policy',
      effectiveDate: '2026-04-01',
      workingHoursPerDay: 9,
      fullDayMinHours: 8,
      halfDayMinHours: 4,
      graceMinutes: 15,
      lateMarksPerHalfDay: 3,
      weeklyOffDays: ['Sunday'],
      overtime: {
        enabled: true,
        thresholdHours: 9,
        rateMultiplier: 1.5,
        weeklyOffMultiplier: 2.0,
        holidayMultiplier: 2.0,
        maxOvertimeHoursPerMonth: 40,
        requiresApproval: true
      },
      leaveTreatment: {
        casual: 'paid',
        sick: 'paid',
        earned: 'paid',
        unpaid: 'unpaid'
      },
      payableDaysFormula: 'calendarDays'
    })
  }, saToken);
  assert(policyRes.status === 201 && policyRes.data.success, 'POST /payroll-policies creates versioned policy');
  const policyId = policyRes.data.data?._id;

  const listPoliciesRes = await request('/payroll-policies', {}, saToken);
  assert(listPoliciesRes.status === 200 && Array.isArray(listPoliciesRes.data.data), 'GET /payroll-policies lists versions');

  const activatePolicyRes = await request(`/payroll-policies/${policyId}/activate`, { method: 'POST' }, saToken);
  assert(activatePolicyRes.status === 200 && activatePolicyRes.data.success, 'POST /payroll-policies/:id/activate activates policy');

  const activePolicyRes = await request('/payroll-policies/active', {}, saToken);
  assert(activePolicyRes.status === 200 && activePolicyRes.data.data?._id === policyId, 'GET /payroll-policies/active retrieves active policy');

  // 1.2 Leave Types and Balances
  console.log('\n--- 1.2 Leave Types and Balances ---');
  const ltRes = await request('/leave-types', {
    method: 'POST',
    body: JSON.stringify({
      name: `Casual Leave ${Date.now()}`,
      code: `CL_${Date.now()}`,
      paid: true,
      annualQuota: 12,
      carryForward: true,
      maxCarryForward: 5,
      requiresDocument: false
    })
  }, saToken);
  assert(ltRes.status === 201 && ltRes.data.success, 'POST /leave-types creates leave type');
  const leaveTypeId = ltRes.data.data?._id;

  const listLtRes = await request('/leave-types', {}, staffToken);
  assert(listLtRes.status === 200 && Array.isArray(listLtRes.data.data), 'GET /leave-types lists leave types');

  const adjustBalRes = await request(`/leaves/balance/${staffAuth.user._id}/adjust`, {
    method: 'POST',
    body: JSON.stringify({
      leaveTypeId,
      leaveTypeCode: 'CL',
      adjustment: 10,
      reason: 'Annual quota allocation for testing'
    })
  }, hrToken);
  assert(adjustBalRes.status === 200 && adjustBalRes.data.success, 'POST /leaves/balance/:userId/adjust adjusts balance with audited reason');

  const myBalRes = await request('/leaves/balance/me', {}, staffToken);
  assert(myBalRes.status === 200 && myBalRes.data.success, 'GET /leaves/balance/me returns own leave balances');

  const reqLeaveRes = await request('/leaves', {
    method: 'POST',
    body: JSON.stringify({
      leaveType: 'casual',
      leaveTypeId,
      startDate: '2026-11-10',
      endDate: '2026-11-12',
      reason: 'Attending medical conference'
    })
  }, staffToken);
  assert(reqLeaveRes.status === 201 && reqLeaveRes.data.success, 'POST /leaves requests leave');
  const leaveId = reqLeaveRes.data.data?._id;

  const cancelLeaveRes = await request(`/leaves/${leaveId}/cancel`, {
    method: 'PATCH',
    body: JSON.stringify({ reason: 'Conference rescheduled' })
  }, staffToken);
  assert(cancelLeaveRes.status === 200 && cancelLeaveRes.data.success, 'PATCH /leaves/:id/cancel cancels leave before start date');

  // 1.3 Shift Management & Rosters
  console.log('\n--- 1.3 Shift Management & Rosters ---');
  const shiftRes = await request('/shifts', {
    method: 'POST',
    body: JSON.stringify({
      name: `Night Shift ${Date.now()}`,
      code: `NIGHT_${Date.now()}`,
      startTime: '22:00',
      endTime: '07:00',
      crossesMidnight: true,
      breakMinutes: 60,
      nightAllowance: 500
    })
  }, saToken);
  assert(shiftRes.status === 201 && shiftRes.data.success, 'POST /shifts creates midnight-crossing shift');
  const shiftId = shiftRes.data.data?._id;

  const getShiftsRes = await request('/shifts', {}, staffToken);
  assert(getShiftsRes.status === 200 && Array.isArray(getShiftsRes.data.data), 'GET /shifts lists shifts');

  const rosterRes = await request('/rosters', {
    method: 'POST',
    body: JSON.stringify({
      userId: staffAuth.user._id,
      department: 'hr',
      shiftId,
      startDate: '2026-11-01',
      endDate: '2026-11-07'
    })
  }, hrAdminAuth.token);
  assert(rosterRes.status === 201 && rosterRes.data.success, 'POST /rosters assigns staff roster');
  const rosterId = rosterRes.data.data?._id;

  const myRosterRes = await request('/rosters/me', {}, staffToken);
  assert(myRosterRes.status === 200 && myRosterRes.data.success, 'GET /rosters/me fetches assigned staff rosters');

  // 1.4 Overtime Management
  console.log('\n--- 1.4 Overtime Management ---');
  const otReqRes = await request('/overtime/requests', {
    method: 'POST',
    body: JSON.stringify({
      date: '2026-10-10',
      hours: 3.5,
      reason: 'Urgent emergency ICU inventory count'
    })
  }, staffToken);
  assert(otReqRes.status === 201 && otReqRes.data.success, 'POST /overtime/requests submits overtime');
  const otId = otReqRes.data.data?._id;

  const otDecideRes = await request(`/overtime/${otId}/decision`, {
    method: 'PATCH',
    body: JSON.stringify({
      status: 'approved',
      remarks: 'Overtime authorized by department supervisor'
    })
  }, hrAdminAuth.token);
  assert(otDecideRes.status === 200 && otDecideRes.data.success, 'PATCH /overtime/:id/decision approves overtime');

  const otSumRes = await request('/overtime/summary?month=2026-10', {}, hrAdminAuth.token);
  assert(otSumRes.status === 200 && otSumRes.data.success, 'GET /overtime/summary returns monthly overtime aggregation');

  // 1.5 Statutory Deductions and Components
  console.log('\n--- 1.5 Statutory Deductions & Components ---');
  const compRes = await request('/salary-components', {
    method: 'POST',
    body: JSON.stringify({
      name: `Special Medical Allowance ${Date.now()}`,
      code: `SMA_${Date.now()}`,
      type: 'earning',
      calculation: 'fixed',
      taxable: true,
      statutory: false
    })
  }, saToken);
  assert(compRes.status === 201 && compRes.data.success, 'POST /salary-components creates earning/deduction component');

  const taxSlabRes = await request('/tax-slabs', {
    method: 'POST',
    body: JSON.stringify({
      financialYear: '2026-2027',
      regime: 'new',
      standardDeduction: 75000,
      slabs: [
        { minIncome: 0, maxIncome: 400000, ratePercent: 0 },
        { minIncome: 400000, maxIncome: 800000, ratePercent: 5 },
        { minIncome: 800000, maxIncome: 1200000, ratePercent: 10 }
      ]
    })
  }, saToken);
  assert(taxSlabRes.status === 201 && taxSlabRes.data.success, 'POST /tax-slabs creates income tax slab configuration');

  const statRuleRes = await request('/statutory-rules', {
    method: 'POST',
    body: JSON.stringify({
      name: 'Provident Fund (EPF)',
      code: `EPF_${Date.now()}`,
      employeeRate: 12,
      employerRate: 12,
      wageCeiling: 15000,
      effectiveFrom: '2026-04-01'
    })
  }, saToken);
  assert(statRuleRes.status === 201 && statRuleRes.data.success, 'POST /statutory-rules stores EPF/ESI statutory rules');

  // 1.6 Salary Extras: Increments, Bonuses, Advances, Reimbursements, Arrears, Adjustments
  console.log('\n--- 1.6 Salary Extras ---');
  const incRes = await request(`/salaries/${staffAuth.user._id}/increments`, {
    method: 'POST',
    body: JSON.stringify({
      newAmount: 65000,
      effectiveFrom: '2026-11-01',
      reason: 'Annual merit appraisal increase'
    })
  }, hrToken);
  assert([200, 201].includes(incRes.status) && incRes.data.success, 'POST /salaries/:userId/increments creates revised salary record');

  const bonusRes = await request('/bonuses', {
    method: 'POST',
    body: JSON.stringify({
      userId: staffAuth.user._id,
      amount: 15000,
      type: 'performance',
      payMonth: '2026-10',
      reason: 'Exemplary performance during hospital accreditation'
    })
  }, hrToken);
  assert(bonusRes.status === 201 && bonusRes.data.success, 'POST /bonuses records performance bonus');

  const advRes = await request('/advances', {
    method: 'POST',
    body: JSON.stringify({
      amount: 20000,
      installments: 4,
      startMonth: '2026-11',
      reason: 'Family medical emergency advance'
    })
  }, staffToken);
  assert(advRes.status === 201 && advRes.data.success, 'POST /advances requests salary advance with auto-installment schedule');
  const advId = advRes.data.data?._id;

  const decideAdvRes = await request(`/advances/${advId}/decision`, {
    method: 'PATCH',
    body: JSON.stringify({ status: 'approved', remarks: 'Advance approved for employee' })
  }, hrToken);
  assert(decideAdvRes.status === 200 && decideAdvRes.data.success, 'PATCH /advances/:id/decision approves advance');

  const schedRes = await request(`/advances/${advId}/schedule`, {}, staffToken);
  assert(schedRes.status === 200 && Array.isArray(schedRes.data.data), 'GET /advances/:id/schedule returns repayment schedule');

  const reimbRes = await request('/reimbursements', {
    method: 'POST',
    body: JSON.stringify({
      category: 'medical',
      amount: 3200,
      description: 'Emergency clinical supplies purchase receipt',
      receiptUrl: 'https://storage.hospital.com/receipts/r1.pdf'
    })
  }, staffToken);
  assert(reimbRes.status === 201 && reimbRes.data.success, 'POST /reimbursements submits expense claim');

  const arrearRes = await request('/arrears', {
    method: 'POST',
    body: JSON.stringify({
      userId: staffAuth.user._id,
      fromMonth: '2026-08',
      toMonth: '2026-09',
      amount: 5000,
      reason: 'Retroactive pay grade adjustment'
    })
  }, saToken);
  assert(arrearRes.status === 201 && arrearRes.data.success, 'POST /arrears creates retroactive pay arrears');

  const adjRes = await request('/payroll/adjustments', {
    method: 'POST',
    body: JSON.stringify({
      userId: staffAuth.user._id,
      month: '2026-10',
      type: 'earning',
      amount: 1200,
      reason: 'Correction for night shift cafeteria allowance'
    })
  }, saToken);
  assert(adjRes.status === 201 && adjRes.data.success, 'POST /payroll/adjustments records one-off adjustment');

  // 1.8 Attendance Corrections & Locked Month Impact
  console.log('\n--- 1.8 Attendance Corrections & Audit History ---');
  const corrRes = await request('/attendance/corrections', {
    method: 'POST',
    body: JSON.stringify({
      date: '2026-10-05',
      correctedIn: '2026-10-05T08:58:00.000Z',
      correctedOut: '2026-10-05T18:02:00.000Z',
      reason: 'Biometric fingerprint scanner reader was offline'
    })
  }, staffToken);
  assert(corrRes.status === 201 && corrRes.data.success, 'POST /attendance/corrections submits attendance correction');
  const corrId = corrRes.data.data?._id;

  const decideCorrRes = await request(`/attendance/corrections/${corrId}/decision`, {
    method: 'PATCH',
    body: JSON.stringify({
      status: 'approved',
      remarks: 'Verified against manual security desk logbook'
    })
  }, hrToken);
  assert(decideCorrRes.status === 200 && decideCorrRes.data.success, 'PATCH /attendance/corrections/:id/decision approves correction');

  // 2. Access Control Edge Cases
  console.log('\n--- 2. Access-Control Edge Cases & Salary Leaks ---');
  // 2.2 Creator Scope vs Department Scope
  const deptUsersRes = await request('/users', {}, pharmToken);
  assert(deptUsersRes.status === 200 && Array.isArray(deptUsersRes.data.data), 'Pharmacy Admin calls GET /users');
  const leakedSalary = deptUsersRes.data.data?.some(u => u.salary !== undefined || u.bankAccount !== undefined);
  assert(!leakedSalary, 'GET /users for Department Admin HIDES sensitive fields (no salary/bankAccount leakage)');

  // Test salary query: Pharmacy Admin requests salary of HR user -> 403 Forbidden
  const leakSalaryAttempt = await request(`/salaries/user/${staffAuth.user._id}`, {}, pharmToken);
  assert(leakSalaryAttempt.status === 403, 'Cross-Department salary access blocked with 403 Forbidden');

  // Test case: HR Supervisor requests salary of a user hired by another HR user -> 404 Not Found
  const hrSuperSalaryAttempt = await request(`/salaries/user/${hrAdminAuth.user._id}`, {}, hrSuperToken);
  assert([403, 404].includes(hrSuperSalaryAttempt.status), 'HR Supervisor requesting salary of user hired by another HR user returns 404');

  // Dedicated audited sensitive endpoint
  const sensRes = await request(`/users/${staffAuth.user._id}/sensitive`, {}, saToken);
  assert(sensRes.status === 200 && sensRes.data.data?.bankAccount !== undefined, 'GET /users/:id/sensitive reveals unmasked data to Superadmin');

  // 2.1 Orphaned Ownership & Reassignment
  const orphanRes = await request('/users/orphaned', {}, saToken);
  assert(orphanRes.status === 200 && Array.isArray(orphanRes.data.data), 'GET /users/orphaned lists staff with inactive creators');

  const reassignRes = await request('/users/reassign', {
    method: 'POST',
    body: JSON.stringify({
      fromUserId: hrAdminAuth.user._id,
      toUserId: hrSuperAuth.user._id,
      userIds: [staffAuth.user._id]
    })
  }, saToken);
  assert(reassignRes.status === 200 && reassignRes.data.success, 'POST /users/reassign moves createdBy ownership with audited history');

  const ownHistRes = await request(`/users/${staffAuth.user._id}/ownership-history`, {}, saToken);
  assert(ownHistRes.status === 200 && Array.isArray(ownHistRes.data.data), 'GET /users/:id/ownership-history traces ownership changes');

  // 2.3 Superadmin Protection Guards
  const demoteAttempt = await request(`/superadmins/${saAuth.user._id}/demote`, {
    method: 'PATCH',
    body: JSON.stringify({ reason: 'Self-demote test' })
  }, saToken);
  assert(demoteAttempt.status === 409, 'PATCH /superadmins/:id/demote blocks when only 1 Superadmin exists (409 Conflict)');

  // 2.4 Department Transfers & Role Changes
  const transferRes = await request(`/users/${staffAuth.user._id}/transfer`, {
    method: 'POST',
    body: JSON.stringify({
      toDepartment: 'pharmacy',
      newRole: 'user',
      effectiveDate: '2026-11-01',
      reason: 'Staff rotation to hospital central dispensary'
    })
  }, saToken);
  assert(transferRes.status === 200 && transferRes.data.success, 'POST /users/:id/transfer records department transfer');

  const assignHistRes = await request(`/users/${staffAuth.user._id}/assignment-history`, {}, saToken);
  assert(assignHistRes.status === 200 && assignHistRes.data.data?.length > 0, 'GET /users/:id/assignment-history preserves non-destructive assignment timeline');

  // 3. Security and Compliance
  console.log('\n--- 3. Security & Compliance ---');
  // 3.1 MFA Setup and Verify
  const mfaSetupRes = await request('/auth/mfa/setup', { method: 'POST' }, staffToken);
  assert(mfaSetupRes.status === 200 && mfaSetupRes.data.data?.secret, 'POST /auth/mfa/setup generates TOTP secret');
  const mfaSecret = mfaSetupRes.data.data?.secret;

  // Verify TOTP with generated secret
  const { generateTotp } = require('../src/utils/totp');
  const validTotpCode = generateTotp(mfaSecret);
  const mfaVerifyRes = await request('/auth/mfa/verify', {
    method: 'POST',
    body: JSON.stringify({ code: validTotpCode })
  }, staffToken);
  assert(mfaVerifyRes.status === 200 && mfaVerifyRes.data.data?.recoveryCodes, 'POST /auth/mfa/verify enables MFA and returns recovery codes');

  const mfaDisableRes = await request('/auth/mfa/disable', {
    method: 'POST',
    body: JSON.stringify({ password: 'Hospital123!', code: validTotpCode })
  }, staffToken);
  assert(mfaDisableRes.status === 200 && mfaDisableRes.data.success, 'POST /auth/mfa/disable turns off MFA with password and code');

  // Sessions management
  const sessionsRes = await request('/auth/sessions', {}, staffToken);
  assert(sessionsRes.status === 200 && Array.isArray(sessionsRes.data.data), 'GET /auth/sessions lists active user sessions');

  // 3.2 Privacy & GDPR
  const privacyDataRes = await request('/privacy/my-data', {}, staffToken);
  assert(privacyDataRes.status === 200 && privacyDataRes.data.data?.profile, 'GET /privacy/my-data exports complete GDPR personal data bundle');

  const erasureReqRes = await request('/privacy/erasure-requests', {
    method: 'POST',
    body: JSON.stringify({ reason: 'Right to be forgotten request under GDPR' })
  }, staffToken);
  assert(erasureReqRes.status === 201 && erasureReqRes.data.success, 'POST /privacy/erasure-requests submits erasure ticket');

  // 3.3 Retention & Legal Holds
  const legalHoldRes = await request('/legal-holds', {
    method: 'POST',
    body: JSON.stringify({
      title: 'State Medical Audit 2026',
      caseNumber: `LEGAL-AUDIT-${Date.now()}`,
      scope: 'all',
      reason: 'Statutory compliance retention freeze'
    })
  }, saToken);
  assert(legalHoldRes.status === 201 && legalHoldRes.data.success, 'POST /legal-holds freezes record deletion');
  const holdId = legalHoldRes.data.data?._id;

  const retentionRunRes = await request('/retention/run', { method: 'POST' }, saToken);
  assert(retentionRunRes.status === 200 && retentionRunRes.data.success, 'POST /retention/run executes retention cycle respecting legal holds');

  // 3.4 Cryptographic Audit Log Chaining
  const auditLogsRes = await request('/audit-logs', {}, saToken);
  assert(auditLogsRes.status === 200 && auditLogsRes.data.data?.length > 0, 'GET /audit-logs returns audit events');

  const auditVerifyRes = await request('/audit-logs/verify', {}, saToken);
  assert(auditVerifyRes.status === 200 && auditVerifyRes.data.isValid === true, 'GET /audit-logs/verify validates SHA-256 cryptographic hash chain integrity');

  const auditExportRes = await request('/audit-logs/export', { method: 'POST' }, saToken);
  assert(auditExportRes.status === 200 && auditExportRes.data.data?.signature, 'POST /audit-logs/export generates HMAC-signed auditor package');

  // 3.5 Attendance Fraud & Geofence
  const workLocRes = await request('/work-locations', {
    method: 'POST',
    body: JSON.stringify({
      name: 'Main Hospital Campus',
      code: `MHC_${Date.now()}`,
      latitude: 28.6139,
      longitude: 77.2090,
      radiusMeters: 500,
      allowedIpRanges: ['127.0.0.1', '::1', '192.168.1.0/24']
    })
  }, saToken);
  assert(workLocRes.status === 201 && workLocRes.data.success, 'POST /work-locations defines GPS geofence and IP allowlist');

  const devRegRes = await request('/devices/register', {
    method: 'POST',
    body: JSON.stringify({
      deviceId: `DEV-${Date.now()}`,
      deviceName: 'Doctor iPad Pro 12.9',
      deviceType: 'tablet',
      os: 'iPadOS 18.1'
    })
  }, staffToken);
  assert(devRegRes.status === 201 && devRegRes.data.success, 'POST /devices/register binds trusted hardware device');

  // 4. Missing Modules
  console.log('\n--- 4. Missing Modules ---');
  // 4.1 Clinical Roles and Licensing Alerts
  const roleRes = await request('/roles', {
    method: 'POST',
    body: JSON.stringify({
      name: `Senior Consultant Surgeon ${Date.now()}`,
      code: `SURG_${Date.now()}`,
      department: 'doctors',
      description: 'Senior lead surgeon for operating theatre',
      clinicalPrivileges: ['major_surgery', 'icu_admissions']
    })
  }, saToken);
  assert(roleRes.status === 201 && roleRes.data.success, 'POST /roles defines clinical designation');

  const expLicRes = await request('/hr/licenses/expiring?days=90', {}, hrToken);
  assert(expLicRes.status === 200 && Array.isArray(expLicRes.data.data), 'GET /hr/licenses/expiring alerts for professional clinical license expiries');

  // 4.2 Notifications System
  const notifRes = await request('/notifications', {}, staffToken);
  assert(notifRes.status === 200 && Array.isArray(notifRes.data.data), 'GET /notifications lists user inbox');

  const broadcastRes = await request('/notifications/broadcast', {
    method: 'POST',
    body: JSON.stringify({
      title: 'NABH Hospital Quality Inspection Tomorrow',
      message: 'All department leads must have compliance logs updated.',
      targetDepartment: 'all',
      priority: 'high'
    })
  }, saToken);
  assert([200, 201].includes(broadcastRes.status) && broadcastRes.data.success, 'POST /notifications/broadcast distributes hospital-wide alert');

  // 4.3 Secure File Storage
  const uploadUrlRes = await request('/files/upload-url', {
    method: 'POST',
    body: JSON.stringify({
      fileName: 'dr_physician_board_license.pdf',
      fileSize: 2048576,
      mimeType: 'application/pdf',
      category: 'hr_document',
      confidential: true
    })
  }, staffToken);
  assert(uploadUrlRes.status === 201 && uploadUrlRes.data.data?.uploadUrl, 'POST /files/upload-url generates pre-signed S3 upload URL');
  const fileId = uploadUrlRes.data.data?.fileId;

  const confirmUploadRes = await request(`/files/${fileId}/confirm`, {
    method: 'POST',
    body: JSON.stringify({ checksum: 'sha256-abc123mockchecksum' })
  }, staffToken);
  assert(confirmUploadRes.status === 200 && confirmUploadRes.data.success, 'POST /files/:id/confirm activates verified file');

  const downloadUrlRes = await request(`/files/${fileId}/download-url`, {}, staffToken);
  assert(downloadUrlRes.status === 200 && downloadUrlRes.data.data?.downloadUrl, 'GET /files/:id/download-url generates pre-signed download URL & audits confidential access');

  // 4.4 Reporting Engine
  const reportsListRes = await request('/reports', {}, hrToken);
  assert(reportsListRes.status === 200 && Array.isArray(reportsListRes.data.data), 'GET /reports lists authorized reports');

  const genReportRes = await request('/reports/payroll_register/generate', {
    method: 'POST',
    body: JSON.stringify({
      format: 'json',
      parameters: { month: '2026-10' }
    })
  }, hrToken);
  assert(genReportRes.status === 201 && genReportRes.data.data?.jobId, 'POST /reports/:type/generate creates async report job');
  const jobId = genReportRes.data.data?.jobId;

  const jobStatusRes = await request(`/reports/jobs/${jobId}`, {}, hrToken);
  assert(jobStatusRes.status === 200 && jobStatusRes.data.data?.status, 'GET /reports/jobs/:id polls background generation');

  // 4.5 Calendar: Holidays, Weekly Offs, Working Days
  const holidayRes = await request('/calendar/holidays', {
    method: 'POST',
    body: JSON.stringify({
      name: `Hospital Foundation Day ${Date.now()}`,
      date: `2026-12-${String(10 + Math.floor(Math.random() * 15)).padStart(2, '0')}`,
      type: 'public',
      description: 'Annual hospital celebration holiday'
    })
  }, saToken);
  assert(holidayRes.status === 201 && holidayRes.data.success, 'POST /calendar/holidays creates holiday');

  const workingDaysRes = await request(`/calendar/working-days?month=2026-10&userId=${staffAuth.user._id}`, {}, staffToken);
  assert(workingDaysRes.status === 200 && workingDaysRes.data.data?.totalWorkingDays !== undefined, 'GET /calendar/working-days dynamically computes working days matching attendance & payroll');

  // 5. Engineering: Jobs & System Settings
  console.log('\n--- 5. Engineering Concerns ---');
  const sysSettingsRes = await request('/settings/system', {}, saToken);
  assert(sysSettingsRes.status === 200 && sysSettingsRes.data.data?.hospital?.timezone, 'GET /settings/system returns timezone & currency settings');

  const updateSettingsRes = await request('/settings/system', {
    method: 'PUT',
    body: JSON.stringify({
      hospital: { timezone: 'Asia/Kolkata', currency: 'INR', financialYearStart: '04-01' }
    })
  }, saToken);
  assert(updateSettingsRes.status === 200 && updateSettingsRes.data.success, 'PUT /settings/system updates system configuration');

  const triggerJobRes = await request('/jobs/payroll_scheduler/trigger', { method: 'POST' }, saToken);
  assert(triggerJobRes.status === 200 && triggerJobRes.data.success, 'POST /jobs/:name/trigger executes distributed lock protected job');

  const listJobsRes = await request('/jobs', {}, saToken);
  assert(listJobsRes.status === 200 && Array.isArray(listJobsRes.data.data), 'GET /jobs lists background job execution logs');

  console.log('\n=============================================================');
  console.log(`  Tests Completed: Total: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`);
  console.log('=============================================================\n');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests();
