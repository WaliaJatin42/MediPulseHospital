# MediPulse Hospital Management Backend System

Enterprise-grade hospital management backend system built with **Node.js**, **Express**, and **MongoDB**. Defines responsibilities, access control, and dedicated REST API modules across **7 Hospital Departments** (HR, Pharmacy, Security, Finance, Support, Legal, Technical) with a 3-tier hierarchy (**Admin**, **Supervisor**, **User**) governed by a hospital-wide **Superadmin**.

---

## 🏛️ Department Responsibilities & Access Matrix

| Capability | Superadmin | HR Admin | HR Supervisor | Other Dept Admin | Other Dept Supervisor | User (Staff) |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| **View all users hospital-wide** | ✅ Yes | ❌ No | ❌ No | ❌ No | ❌ No | ❌ No |
| **Create supervisors and users** | ✅ Yes | ✅ Yes (Any dept) | ✅ Yes (Users only) | ❌ No | ❌ No | ❌ No |
| **View/manage users they created** | ✅ Yes (All) | ✅ Yes | ✅ Yes | ❌ No | ❌ No | ❌ No |
| **View own department users** | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Yes (Read-only) | ✅ Yes (Read-only) | ❌ No |
| **Assign or edit salary records** | ✅ Yes | ✅ Yes (Created users) | ✅ Yes (Created users) | ❌ No | ❌ No | ❌ No |
| **View own salary** | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Yes |
| **View/edit all attendance** | ✅ Yes | ❌ No | ❌ No | ❌ No | ❌ No | ❌ No |
| **View attendance of department** | ✅ Yes | ✅ Yes (Created users) | ✅ Yes (Created users) | ✅ Yes (Own dept) | ✅ Yes (Own dept) | Own only |
| **Run payroll** | ✅ Yes | ❌ No | ❌ No | ❌ No | ❌ No | ❌ No |
| **View audit logs** | ✅ Yes (All) | Own actions | Own actions | Own actions | Own actions | ❌ No |

### Scoping Rules Enforced in Middleware & Queries:
1. **Global Scope**: Superadmin sees all documents hospital-wide.
2. **Creator Scope**: HR roles (Admin & Supervisor) see only documents where `createdBy` equals their own user ID for personnel management and salary assignment.
3. **Department Scope**: Non-HR Department Admins and Supervisors read only records where `department` matches theirs, with no user creation or salary assignment privileges.
4. **Self Scope**: Regular staff/users read and update only their own profile, attendance, and pay slips.
5. **Tamper-Evident Audit Logging**: Every write action generates an append-only audit log entry in MongoDB (`AuditLog`).

---

## 🔑 Default Seeded Accounts

Run `npm run seed` to initialize all 7 departments, role hierarchy accounts, and domain records:

| Role / Department | Email | Default Password |
|---|---|---|
| **Superadmin (Hospital-Wide)** | `superadmin@hospital.com` | `SuperAdmin123!` |
| **HR Admin** | `hr.admin@hospital.com` | `Hospital123!` |
| **HR Supervisor** | `hr.supervisor@hospital.com` | `Hospital123!` |
| **Pharmacy Admin** | `pharmacy.admin@hospital.com` | `Hospital123!` |
| **Pharmacy Supervisor** | `pharmacy.supervisor@hospital.com` | `Hospital123!` |
| **Security Admin** | `security.admin@hospital.com` | `Hospital123!` |
| **Finance Admin** | `finance.admin@hospital.com` | `Hospital123!` |
| **Support Admin** | `support.admin@hospital.com` | `Hospital123!` |
| **Legal Admin** | `legal.admin@hospital.com` | `Hospital123!` |
| **Technical Admin** | `technical.admin@hospital.com` | `Hospital123!` |

*(All other department staff accounts are created with password `Hospital123!`)*

---

## 📡 REST API Modules & Endpoints

All endpoints are accessible via both `/api/v1/...` and `/api/...`.

### 1. Authentication (`/api/v1/auth`)
- `POST /login` - Sign in with email and password
- `POST /logout` - Invalidate refresh token and clear cookies
- `POST /refresh` - Refresh access token
- `POST /change-password` - Change password for authenticated staff
- `POST /forgot-password` - Request password reset token
- `POST /reset-password` - Reset password with token
- `GET /google` & `GET /google/callback` - Google OAuth 2.0 flow

### 2. User & Hiring Management (`/api/v1/users`)
- `POST /` - Create supervisor or user (Superadmin & HR roles; includes `employeeId`, `department`, `role`, `designation`, `shiftPolicy`, `salary`)
- `GET /` - Scope-filtered hospital staff directory (Pagination, search, filters)
- `GET /me` - Get authenticated user profile
- `PATCH /me` - Update personal profile (phone, avatar, name)
- `GET /:id` - Get user details (Scope guarded)
- `PATCH /:id` - Update user profile, designation, or department transfer
- `PATCH /:id/status` - Activate, deactivate, or terminate user account
- `DELETE /:id` - Soft delete user account

### 3. Salary Records (`/api/v1/salaries`)
- `POST /` - Assign salary structure (`basic`, `allowances`, `deductions`, `effectiveFrom`)
- `GET /` - List salary structures (Scope-filtered)
- `GET /me` - View own compensation details
- `GET /:userId` - Get salary details by user ID or salary ID
- `PATCH /:id` - Revise salary structure (Creates immutable revision `#N`, maintains historical record)

### 4. Attendance (9-Hour Work Policy) (`/api/v1/attendance`)
- `POST /check-in` - Daily check-in (Evaluates 15-minute grace period against 09:15 AM threshold)
- `POST /check-out` - Daily check-out (Evaluates 9-hour work policy: `>= 9h` present, `4.5h - 9h` half-day, `< 4.5h` short-hours)
- `GET /me` - View personal monthly attendance history
- `GET /` - List scope-filtered attendance logs
- `PATCH /:id` - Superadmin manual attendance correction (Mandatory audit reason required)
- `GET /summary` - Monthly attendance summary counts (`present`, `late`, `halfDay`, `shortHours`, `absent`, `onLeave`)

### 5. Automated Monthly Payroll (`/api/v1/payroll`)
- `POST /run` - Trigger monthly payroll run (Superadmin only; supports dry-run, idempotent)
- `GET /` - List payroll runs and distribution statuses
- `GET /:runId` - Per-employee payslip breakdown for run
- `GET /me` - View own historical payslips
- `GET /me/:month/payslip` - View own payslip for specific month
- `POST /:runId/approve` - Approve payroll run (Superadmin only)
- `POST /:runId/reverse` - Reverse payroll run with mandatory audit reason (Superadmin only)
- *Automated Scheduler*: Runs automatically on date `01` of every month at `00:00` via node-cron.

### 6. Audit Logging (`/api/v1/audit-logs`)
- `GET /` - List tamper-evident audit logs (Superadmin: hospital-wide; others: own actions)
- `GET /:id` - View specific audit log entry
- *Append-only Guarantee*: Mongoose pre-hooks strictly forbid update and deletion operations.

### 7. Department Management (`/api/v1/departments`)
- `GET /` - List all 7 hospital departments
- `GET /:id` - Get department details by ID or code
- `POST /` - Create department (Superadmin only)
- `PATCH /:id` - Update department configurations (Superadmin only)
- `GET /:id/staff` - List staff members belonging to department

---

## 🏥 Department Specific Modules

### 3.1 HR (Human Resources) (`/api/v1/hr` & `/api/v1/leaves`)
- **Hiring Pipeline**: `POST /hr/hires`, `GET /hr/hires`, `PATCH /hr/hires/:id` (Stages: offer, accepted, joined, rejected)
- **Leave Requests**: `POST /leaves` (Staff request), `GET /leaves`, `PATCH /leaves/:id/decision` (Approve/reject)
- **Leave Balances**: `GET /leaves/balance/me` (Annual, sick, casual entitlement tracking)
- **Holidays**: `POST /hr/holidays`, `GET /hr/holidays`
- **Employee Documents**: `POST /hr/employees/:id/documents` (Contracts, ID proofs, certificates)
- **Offboarding**: `POST /hr/employees/:id/exit` (Clearance checklist across IT, Security, Finance, Support)
- **HR Reports**: `GET /hr/reports/headcount`, `GET /hr/reports/attrition`, `GET /hr/reports/attendance-compliance`

### 3.2 Pharmacy (`/api/v1/pharmacy`)
- **Medicines Catalog**: `POST /pharmacy/medicines`, `GET`, `PATCH`, `DELETE` (Admin)
- **Stock Batches**: `POST /pharmacy/stock` (Receive batch with `batchNo`, `expiryDate`, `quantity`, `cost`), `GET /pharmacy/stock`
- **Dispensing**: `POST /pharmacy/dispense` (FEFO First-Expired-First-Out auto deduction, logs who dispensed)
- **Alerts**: `GET /pharmacy/alerts/low-stock` & `GET /pharmacy/alerts/expiring` (90-day threshold)
- **Suppliers & Purchase Orders**: CRUD on `/pharmacy/suppliers` & `/pharmacy/purchase-orders` (Admin approves)
- **Returns & Wastage**: `POST /pharmacy/returns`, `POST /pharmacy/wastage`
- **Controlled Substances Register**: `GET /pharmacy/controlled-log` (Read-only regulatory audit log)

### 3.3 Security (`/api/v1/security`)
- **Visitor Management**: `POST /security/visitors` (Check-in & badge issue), `PATCH /security/visitors/:id/checkout`, `GET /security/visitors`
- **Incidents**: `POST /security/incidents`, `GET`, `PATCH /security/incidents/:id` (Resolution, evidence; immutable upon closure)
- **Shift Roster**: `POST /security/rosters`, `GET /security/rosters`, `GET /security/rosters/me`
- **Patrol Logs**: `POST /security/patrols` (Checkpoint scans), `GET /security/patrols`
- **Vehicle Logs**: `POST /security/vehicles` (Gate entry/exit), `GET /security/vehicles`
- **Access Control**: `GET /security/access-logs`
- **Emergency Alerts**: `POST /security/alerts` (Broadcasts emergency codes hospital-wide), `GET /security/alerts`

### 3.4 Finance (`/api/v1/finance`)
- **Budgets**: `POST /finance/budgets`, `GET`, `PATCH /finance/budgets/:id` (Departmental budget tracking)
- **Expenses**: `POST /finance/expenses` (Any department submits claims), `PATCH /finance/expenses/:id/decision` (Finance Admin approval)
- **Vendor Invoices & Payments**: CRUD on `/finance/invoices` & `POST /finance/payments`, `GET /finance/payments`
- **Payroll Review**: `GET /finance/payroll/:runId` (Review payroll ledger before release)
- **Disbursement Gate**: `POST /finance/payroll/:runId/disbursement-confirm` (Finance approval gate releases funds)
- **General Ledger**: `GET /finance/ledger` (Debit/Credit records)
- **Reconciliations**: `POST /finance/reconciliations`, `GET /finance/reconciliations`
- **Financial Reports**: `GET /finance/reports/expense-summary`, `GET /finance/reports/budget-vs-actual`, `GET /finance/reports/payroll-cost`

### 3.5 Support (`/api/v1/support`)
- **Service Requests**: `POST /support/requests` (Any staff submits ticket), `GET`, `PATCH /support/requests/:id`
- **Supervisor Assignment**: `PATCH /support/requests/:id/assign` (Supervisor assigns to user staff)
- **Feedback**: `POST /support/requests/:id/feedback`
- **Housekeeping Schedules**: `POST /support/schedules`, `GET /support/schedules`, `GET /support/schedules/me`
- **Supplies Inventory**: CRUD on `/support/supplies`, `POST /support/supplies/:id/issue`
- **Transport Bookings**: `POST /support/transport/bookings`, `GET`, `PATCH /support/transport/bookings/:id`
- **Support Reports**: `GET /support/reports/sla`, `GET /support/reports/workload`

### 3.6 Legal (`/api/v1/legal`)
- **Contracts**: `POST /legal/contracts`, `GET`, `PATCH /legal/contracts/:id` (Versioning & expiry tracking)
- **Review Requests**: `POST /legal/reviews` (Other departments submit agreements), `PATCH /legal/reviews/:id` (Legal decision)
- **Litigation & Cases**: `POST /legal/cases`, `GET`, `PATCH /legal/cases/:id` (Court hearings, malpractice defense)
- **Compliance & Licenses**: `POST /legal/licenses`, `GET`, `GET /legal/licenses/expiring` (60-day renewal alert)
- **Hospital Policies**: `POST /legal/policies`, `GET /legal/policies` (Published versions visible to all staff)
- **Confidential Documents**: `POST /legal/documents`, `GET /legal/documents`, `GET /legal/documents/:id` (Per-document access control lists and audited read logging)

### 3.7 Technical (`/api/v1/technical`)
- **Asset Inventory**: CRUD on `/technical/assets` (IT computers, servers, biomedical devices, serials, warranties)
- **Maintenance Schedules**: `POST /technical/maintenance`, `GET`, `PATCH /technical/maintenance/:id` (Preventive, corrective, calibration)
- **IT Support Tickets**: `POST /technical/tickets` (Any staff submits), `GET`, `PATCH /technical/tickets/:id`
- **Equipment Downtime**: `POST /technical/downtime`, `GET /technical/reports/downtime`
- **Software Licenses**: CRUD on `/technical/software-licenses`
- **System Health & Telemetry**: `GET /technical/system/health`, `GET /technical/system/backups`, `GET /technical/system/errors`
- **Audited Access Support**: `POST /technical/access-requests` (Superadmin or HR initiates), `PATCH /technical/access-requests/:id/execute` (Technical executes password reset / access provisioning through audited flow without exposing raw passwords)

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- MongoDB running on `mongodb://127.0.0.1:27017`

### Setup & Run
```bash
# 1. Install dependencies
npm install

# 2. Seed database with all 7 departments, roles, and sample data
npm run seed

# 3. Start development server
npm run dev

# 4. Run end-to-end HTTP integration test suite
node scripts/test_http_endpoints.js
```

### Interactive Swagger OpenAPI Documentation
Open your browser at:
`http://localhost:5000/api-docs`

---

## 🛡️ Additional API Specification (Gap Items Implemented)

### 1. Payroll Business Rules
- **Payroll Policies (`/api/v1/payroll-policies`)**: Versioned policy documents with effective dates, working hours, grace periods, overtime multipliers, and leave treatment rules.
- **Leave Management (`/api/v1/leave-types`, `/api/v1/leaves`)**: Configurable leave quotas, carry-forward, balance tracking, 2-level approvals, and audited adjustments.
- **Shift & Roster Engine (`/api/v1/shifts`, `/api/v1/rosters`)**: Midnight-crossing shift support (e.g., 22:00 to 07:00), shift allowances, roster assignments, and peer swap requests.
- **Overtime Management (`/api/v1/overtime`)**: Request submission, 2-level approvals, monthly caps, and monthly aggregation summaries.
- **Statutory Rules & Components (`/api/v1/salary-components`, `/api/v1/tax-slabs`, `/api/v1/statutory-rules`)**: Itemized earnings and deductions, progressive tax slabs, EPF/ESI statutory contributions, and statutory reports.
- **Salary Extras (`/api/v1/salaries/:userId/increments`, `/api/v1/bonuses`, `/api/v1/advances`, `/api/v1/reimbursements`, `/api/v1/arrears`, `/api/v1/payroll/adjustments`)**: Increments with revision history, auto-deducted advance schedules, expense reimbursements, retroactive arrears, and carry-forward payroll adjustments.
- **Exit & Final Settlement (`/api/v1/exits`)**: Clearance checklist across Technical, Pharmacy, and Finance departments, settlement calculation, approval, and account deactivation.
- **Attendance Corrections & Locking (`/api/v1/attendance/corrections`)**: 2-level correction approval with history trail; corrections on locked payroll months automatically generate carry-forward adjustments for the subsequent payroll run.

### 2. Access-Control Edge Cases
- **Orphaned Ownership Reassignment (`/api/v1/users/reassign`, `/api/v1/users/orphaned`)**: Reassigns staff when HR creators are deactivated; blocks creator deactivation without a designated replacement; audits complete ownership history (`/api/v1/users/:id/ownership-history`).
- **Creator Scope vs. Department Scope Isolation**: Department Admins querying staff receive public projections only (salary and financial details strictly excluded); Pharmacy Admin requesting salary of an HR-hired staff returns `403 Forbidden`; HR Supervisor requesting salary of staff created by another HR user returns `404 Not Found`; Superadmin and creator access full details via `/api/v1/users/:id/sensitive`.
- **Superadmin Protection Guard**: Prevents demotion or deletion of a Superadmin if fewer than 2 active Superadmins exist (`409 Conflict`).
- **Department Transfers & Role Changes (`/api/v1/users/:id/transfer`, `/api/v1/users/:id/role-change`)**: Non-destructive assignment history (`assignments[]`) with mid-month split-month payroll proration.

### 3. Security & Compliance
- **Login Protection & TOTP MFA (`/api/v1/auth/mfa/*`)**: Native RFC 6238 TOTP generation and verification, challenge-response login flow, and recovery code backups.
- **Account Lockout**: 5 failed login attempts trigger an automated 15-minute lockout with progressive delay; unlock endpoint via `/api/v1/auth/unlock/:userId`.
- **Field-Level Encryption & Masking**: Sensitive identifiers (`bankAccount`, `taxId`, `nationalId`) encrypted at rest with AES-256-GCM; account numbers masked to the last 4 digits in responses.
- **GDPR Privacy & Data Protection (`/api/v1/privacy/*`)**: Personal data bundle exports, erasure requests, and access logging for sensitive records.
- **Retention Policies & Legal Holds (`/api/v1/retention-policies`, `/api/v1/legal-holds`)**: Automated retention cycles with legal holds that freeze record destruction.
- **Cryptographic Audit Log Integrity (`/api/v1/audit-logs/verify`, `/api/v1/audit-logs/export`)**: SHA-256 cryptographic hash-chaining linking every audit log to its predecessor; HMAC-signed auditor exports.
- **Attendance Anti-Fraud (`/api/v1/work-locations`, `/api/v1/devices/*`, `/api/v1/attendance/anomalies`)**: GPS geofencing, IP allowlists, hardware device binding (max 2 devices), and automated anomaly flagging.

### 4. Missing Modules
- **Clinical Departments & Custom Roles (`/api/v1/roles`, `/api/v1/hr/licenses/expiring`)**: Support for Doctors, Nursing, Laboratory, and Radiology departments; custom designations (Consultant, Resident, Staff Nurse, Lab Technician); professional licensing expiry alerts; clinical variable procedure earnings.
- **Firebase Cloud Messaging (FCM) & Notifications Engine (`/api/v1/notifications/*`)**: 
  - Dual in-app inbox + real-time Firebase Push notification delivery.
  - Multi-platform device token registration (`POST /api/v1/notifications/fcm-token`, `DELETE /api/v1/notifications/fcm-token`).
  - Hospital-wide and department-scoped topic push broadcasts (`hospital_all`, `dept_pharmacy`, etc.).
  - Push delivery test endpoint (`POST /api/v1/notifications/test-fcm`).
  - Graceful fallback: runs in simulated push mode if `FIREBASE_SERVICE_ACCOUNT` credentials are not yet configured in `.env`.
- **Private File Storage (`/api/v1/files/*`)**: Pre-signed upload and download URLs, MIME type allowlists, and access logging on confidential files.
- **Hospital Reporting Engine (`/api/v1/reports/*`)**: Asynchronous report generation for headcount, attendance summaries, overtime, leave utilization, and payroll registers.
- **Holiday & Shift Calendar (`/api/v1/calendar/*`)**: Department-specific holidays, weekly offs, and working days calculations synchronized with attendance and payroll.

### 5. Engineering Concerns
- **Distributed Scheduler Locks (`/api/v1/jobs/*`)**: Redis/MongoDB TTL-backed distributed job locks (`JobLock`) preventing multi-instance cron race conditions; manual triggers and execution logs (`JobRun`).
- **Timezone & Regional Settings (`/api/v1/settings/system`)**: Timezone (`Asia/Kolkata`), currency (`INR`), financial year start, and date formats.
- **System Health & Readiness**: `/api/v1/health` (liveness), `/api/v1/health/ready` (readiness with MongoDB ping), and `/api/v1/version`.

---

## 📖 Interactive Swagger OpenAPI 3.0 Documentation

Access the live interactive Swagger UI at:
```
http://localhost:5000/api-docs
```

### How to Execute Requests in Swagger:
1. **Authorize Once**: Click the green **Authorize** button at the top right, enter your JWT access token, and click **Authorize**.
2. **Immediate Execution Ready**: "Try it out" is enabled by default across all 135+ endpoints.
3. **Pre-filled Runnable Request Bodies**: Every `POST`, `PUT`, and `PATCH` endpoint is pre-populated with valid JSON schemas and example payloads in the body editor.
4. **Interactive Parameters**: All path variables (`:id`, `:userId`, `:runId`) and query parameters (`?month=`, `?year=`, `?page=`, `?department=`) feature clean text input boxes.
5. **Run Live**: Simply adjust values and click the blue **Execute** button to test the endpoint live against the server!

---

## 🔥 Firebase Cloud Messaging (FCM) Setup

To connect to your live Firebase project for mobile and web push notifications:
1. Generate a Firebase Service Account key from the Firebase Console (`Project Settings > Service Accounts > Generate new private key`).
2. Add the JSON configuration to `.env`:
```env
# Option A: Inline JSON string
FIREBASE_SERVICE_ACCOUNT='{"type":"service_account","project_id":"...","private_key":"...","client_email":"..."}'

# Option B: Path to downloaded JSON key file
FIREBASE_CREDENTIALS_PATH='./serviceAccountKey.json'
```
*Note: If no credentials are provided in `.env`, the server automatically runs in simulation/mock mode without crashing, logging all push payloads cleanly for seamless local development.*

---

## 🧪 Comprehensive Verification Suite

Run the full gap specification test suite:
```bash
node scripts/test_gap_apis.js
```
*Executes 78 automated integration tests covering all 5 sections, cryptographic chaining, access control edge cases, and business logic with a 100% pass rate.*

