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

## 🏥 Clinical and Patient Operations (Document 3 Specification)

The clinical architecture extends the system to encompass full outpatient (OPD), inpatient (IPD), diagnostics, acute care, revenue management, and health standards interoperability across a **Two-Branch Network** (`MPH-CEN` Central Campus and `MPH-SOU` South Campus).

### 1. Two-Branch Network Architecture (`/api/v1/branches`, `/api/v1/inter-branch/*`)
- **Shared vs Branch-Owned Partitioning**:
  - **Shared Hospital-Wide**: Patients (global UHID, medical history, allergies), Staff/Doctors credentials, Service catalogs, Diagnostic test catalogs.
  - **Branch-Owned**: Encounters (Visits & Admissions), Bed allocation, Ward census, CPOE Orders, Diagnostic results, Billing accounts, Invoices, Cash counters, Inventory stock.
- **Branch Context in JWT Tokens (`POST /api/v1/auth/switch-branch`)**: Active branch ID (`activeBranchId`) is verified in JWT tokens and enforced at the database query layer (`req.branchFilter()`). Staff cannot access clinical encounters of an unauthorized branch.
- **Inter-Branch Stock Transfers (`POST /api/v1/inter-branch/stock-transfers`, `PATCH /api/v1/inter-branch/transfers/:id/receive`)**: Full ledger-based transfer state machine (`pending` -> `in_transit` -> `received`); idempotent with double-receive conflict prevention (`409 Conflict`).

### 2. Patient Identity & Access Model (`/api/v1/patients`, `/api/v1/care-teams`, `/api/v1/break-glass`)
- **Patient/Staff Separation**: Patients exist in their own collection (`Patient`) and have an isolated JWT audience (`aud: patient_portal`). Staff tokens are rejected on portal routes; portal tokens return `401 Unauthorized` on staff routes.
- **Global UHID & Duplicate Prevention (`POST /api/v1/patients`)**: Sequential non-gap branch prefixed UHID generation (`MPH-CEN-YYYY-XXXXXX`). Two-step duplicate check returns `409 Conflict` with potential matches (matching phone/DOB/name) before saving.
- **Wristband Barcode & QR Generation (`GET /api/v1/patients/:id/wristband`)**: Generates Code128 barcode payloads and JSON print commands for standard thermal patient wristband printers.
- **Treating Relationship & Care Teams (`/api/v1/care-teams`)**: Clinicians access clinical notes and records only for patients within their active care team or assigned ward.
- **Emergency Break-Glass Access (`POST /api/v1/break-glass`)**: 2-hour emergency override grant with mandatory justification. All break-glass events are audited and reviewable by Superadmin and Quality (`PATCH /api/v1/break-glass/:id/review`).
- **Patient Consents (`POST /api/v1/patients/:id/consents`, `PATCH /api/v1/consents/:id/revoke`)**: Comprehensive consent tracking for treatment, research, and data sharing.

### 3. Facility Masters & Bed Lifecycle (`/api/v1/facility/tree`, `/api/v1/beds/*`, `/api/v1/services/*`)
- **Facility Hierarchy Tree**: `Building` ➔ `Floor` ➔ `Ward` ➔ `Room` ➔ `Bed`.
- **Bed Census & Status Machine (`available`, `occupied`, `reserved`, `cleaning`, `maintenance`, `blocked`)**: 
  - Patient admission automatically transitions bed to `occupied`.
  - Patient discharge automatically sets bed to `cleaning` and assigns a Support housekeeping ticket.
  - Transition from `cleaning` to `available` is strictly restricted to **Support (Housekeeping)** and **Nursing** roles (`403 Forbidden` for other staff).
- **Dynamic Pricing Engine (`GET /api/v1/services/:id/price?payerId=&branchId=`)**: Resolves service tariffs taking into account branch price overrides, payer category (Cash, TPA, Corporate, Government Schemes), and effective date.

### 4. OPD Flow: Schedules, Appointments, Queue & EMR (`/api/v1/appointments`, `/api/v1/visits`, `/api/v1/notes`)
- **Doctor Schedules & Double-Booking Protection (`/api/v1/doctor-schedules`)**: Weekly slot templates with duration, max patient quotas, leave exceptions, and conflict prevention.
- **Queue Tokens & Public Waiting Room Display (`GET /api/v1/queues/display`)**: Check-in issues daily sequential queue tokens (`QueueToken`) and automatically posts consultation fee charges. The display feed is publicly accessible without authentication, exposing **only token numbers and doctor room identifiers** without any Patient Health Information (PHI).
- **OPD Visits & Automated BMI Calculation (`POST /api/v1/visits/:id/vitals`)**: Captures height, weight, BP, pulse, temp, SpO2; automatically calculates BMI (`weightKg / (heightM^2)`).
- **Cryptographic SOAP Note Locking (`PATCH /api/v1/notes/:id/sign`)**: Doctors digitally sign clinical notes. Signed notes are immutably locked with a **SHA-256 cryptographic signature hash**; post-signing modifications are strictly prohibited and must be recorded via audited addenda (`POST /api/v1/notes/:id/addendum`).
- **Longitudinal EMR Summary (`GET /api/v1/patients/:id/emr`)**: Consolidates active problems, allergies, past encounters, clinical notes, and prescription history into a single longitudinal timeline.

### 5. IPD Inpatient Workflow & Multi-Department Clearance (`/api/v1/admissions/*`)
- **Inpatient Admissions (`POST /api/v1/admissions`)**: Direct or emergency admissions assigning bed, primary doctor, diagnosis, and expected stay length. Opens patient billing ledger, occupies bed, and alerts dietary and nursing.
- **Bed Transfers (`POST /api/v1/admissions/:id/bed-transfer`)**: Timestamped room rent proration; previous bed automatically transitions to `cleaning`.
- **Nursing MAR & Inpatient Charts (`/api/v1/admissions/:id/vitals-chart`)**: Medication Administration Record (MAR), intake/output, and vitals charting.
- **4-Department Discharge Clearance Checklist (`PATCH /api/v1/admissions/:id/discharge/clearance/:dept`)**: Patient discharge is strictly blocked until **Doctor**, **Nursing**, **Pharmacy**, and **Billing** clearances are all approved (`409 Conflict`), unless explicitly overridden with reason by Superadmin.
- **Final Discharge (`POST /api/v1/admissions/:id/discharge`)**: Unlocks final financial invoice and releases inpatient bed to `cleaning`.

### 6. CPOE Unified Orders & Clinical Decision Support (`/api/v1/orders/*`, `/api/v1/clinical/checks/*`)
- **Unified Order Service**: Single order pipeline handling `lab`, `radiology`, `procedure`, `diet`, and `pharmacy` with priority levels (`routine`, `urgent`, `stat`).
- **Clinical Decision Support (CDS) Safety Screening**:
  - Drug-drug interaction risk screening (`POST /api/v1/clinical/checks/drug-interactions`).
  - Known patient allergy warnings (`POST /api/v1/clinical/checks/allergy`).
  - Duplicate active order detection within 24 hours.
- **Outbox Event Bus (`src/services/outboxService.js`)**: Completed clinical orders publish `order_completed` events to the transactional outbox, guaranteeing that billable charges are never dropped even if network disconnects occur.

### 7. Diagnostics (Laboratory & Radiology) (`/api/v1/lab/*`, `/api/v1/radiology/*`)
- **Laboratory**:
  - Barcoded sample collection (`POST /api/v1/lab/orders/:id/collect-sample`).
  - Laboratory accessioning and sample rejection handling.
  - Parameterized results entry with automated **Critical Value Alerts** for out-of-range panic values.
  - Pathologist validation (`PATCH /api/v1/lab/results/:id/validate`).
  - Controlled release to Patient Portal (`PATCH /api/v1/lab/results/:id/release`).
- **Radiology**:
  - Modality scheduling (`X-Ray`, `CT`, `MRI`, `Ultrasound`, `Mammography`).
  - Contrast screening checklists (pregnancy, contrast allergy, renal function).
  - PACS linking via Study UID and short-lived DICOM viewer URLs.
  - Radiation dose logging in mGy.
  - Radiologist impression drafting and digital sign-off.

### 8. Acute Care (Emergency, OT & Clinical Pharmacy) (`/api/v1/emergency/*`, `/api/v1/ot/*`)
- **Emergency Operations**:
  - ESI Level 1–5 triage grading. **Emergency treatment is never blocked by payment or missing ID.**
  - Real-time Hospital Code Blue / Code Red broadcasts via Firebase Cloud Messaging (FCM) to all emergency resuscitation teams.
- **Operation Theatre (OT)**:
  - Operating theatre master management.
  - Automated three-way surgical slot conflict detection preventing overlapping double-bookings for the **Theatre**, **Lead Surgeon**, or **Anesthetist** (`409 Conflict`).
  - WHO surgical safety checklist (Sign-in, Time-out, Sign-out).
  - Consumables and implant traceability logging (serial/batch numbers linked to patient).
- **Clinical Pharmacy Dispensing**:
  - First-Expiry-First-Out (FEFO) automated batch picking.
  - Dual-witness verification required for dispensing controlled drugs (narcotics).
  - Ward indents and pharmacy reverse billing on returned medications.

### 9. Billing, Invoices & Tiered Discounts (`/api/v1/billing/*`, `/api/v1/insurance/*`)
- **Ledger Accounts**: Automatic aggregation of OPD, IPD, lab, radiology, and pharmacy charges.
- **Non-Gap Sequential Financial Invoices (`POST /api/v1/billing/invoices`)**: Sequential non-gap invoice numbering per branch and financial year (`INV-CEN-2026-00001`, `INV-SOU-2026-00001`). Finalized invoices are cryptographically sealed against further edits.
- **Official Receipts (`POST /api/v1/billing/payments`)**: Supports multi-mode payments (Cash, Card, UPI, Cheque, Online) with sequential receipt numbers (`RCP-XXXXXX-XXX`).
- **Advance Deposits & Balance Monitoring (`POST /api/v1/billing/deposits`)**: Tracks advance deposits and notifies when balance falls below threshold.
- **Role-Tiered Discount Approval Hierarchy (`POST /api/v1/billing/discounts`)**:
  - **Billing Clerk**: Up to 5% discount.
  - **Billing Admin**: Up to 15% discount.
  - **Superadmin**: Required for discounts > 15%.
  - Unauthorized discounts return `403 Forbidden`. Requester cannot approve their own discount request.
- **Insurance & TPA Claims (`/api/v1/insurance/*`)**: Pre-authorizations, claim document submissions, queries, settlements, and automated cashless bill splitting.

### 10. Support Operations & Public Certificates (`/api/v1/certificates/*`, `/api/v1/bloodbank/*`, `/api/v1/quality/*`)
- **Blood Bank Inventory (`GET /api/v1/bloodbank/inventory`)**: Component stock management (PRBC, FFP, Platelets, Cryo) with ABO/Rh grouping and expiry tracking.
- **Ambulance & Patient Transport (`/api/v1/ambulance/*`)**: Fleet availability, trip dispatching, and real-time GPS telemetry logging.
- **Tamper-Evident Certificates (`/api/v1/certificates`, `/api/v1/certificates/verify/:code`)**: Medical fitness, birth, and death certificates generated with a unique 16-character verification code. Anyone (employers, courts, embassies) can verify the certificate's authenticity **publicly without authentication**.
- **Quality & Infection Control (`/api/v1/quality/*`)**: Patient safety incident reporting, Root Cause Analysis (RCA), and Corrective & Preventive Action (CAPA) tracking.

### 11. Patient Portal (`/api/v1/patient-auth/*`, `/api/v1/portal/*`)
- **Isolated Token Audience (`aud: patient_portal`)**: Enforces strict audience boundary separation; staff tokens cannot call portal endpoints and portal tokens cannot call staff endpoints.
- **OTP Verification Flow**: Fast login via registered mobile OTP (`Demo OTP: 123456`).
- **Patient Dashboard & Results**: View medical profile, booked appointments, and only **doctor-released diagnostic reports**.

### 12. FHIR R4 Interoperability Facade (`/api/v1/fhir/*`)
Exposes international healthcare standard HL7 FHIR R4 endpoints returning valid `application/fhir+json` searchset Bundles:
- `GET /api/v1/fhir/Patient` - FHIR R4 Patient resources.
- `GET /api/v1/fhir/Encounter` - FHIR R4 Encounter resources (OPD & IPD).
- `GET /api/v1/fhir/Observation` - FHIR R4 Observation resources (Vitals & Laboratory parameters).

---

## 📖 Interactive Swagger OpenAPI 3.0 Documentation

Access the live interactive Swagger UI at:
```
http://localhost:5000/api-docs
```

### How to Execute Requests in Swagger:
1. **Authorize Once**: Click the green **Authorize** button at the top right, enter your JWT access token, and click **Authorize**.
2. **Immediate Execution Ready**: "Try it out" is enabled by default across all 184+ endpoints.
3. **Pre-filled Runnable Request Bodies**: Every `POST`, `PUT`, and `PATCH` endpoint is pre-populated with valid JSON schemas and example payloads in the body editor.
4. **Interactive Parameters**: All path variables (`:id`, `:userId`, `:runId`, `:code`) and query parameters (`?q=`, `?branchId=`, `?date=`) feature clean text input boxes.
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

## 🧪 Comprehensive Verification Suites

### 1. Clinical and Patient Operations Test Suite (Document 3)
```bash
npm run seed:clinical
node scripts/test_clinical_apis.js
```
*Executes **76 automated integration tests** covering all 12 clinical domains with a **100% pass rate**:*
- Multi-branch context switching & stock transfers
- Patient registration, UHID generation & duplicate check preview
- Facility hierarchy tree, bed census & bed lifecycle permissions
- Doctor schedules, appointments & public waiting area display feed
- OPD visits, vitals with BMI & digitally locked SOAP notes
- IPD admissions, bed transfers & 4-department clearance checklist
- CPOE orders, clinical decision support & billing charge event bus
- Laboratory sample barcodes, pathologist validation & radiology PACS
- Emergency ESI 1-5 triage, hospital Code Blue FCM alerts & OT conflict checks
- Billing accounts, non-gap FY invoices & role-tiered discounts
- Support operations, blood bank & public certificate verification
- Patient portal token audience isolation & FHIR R4 interoperability facade

### 2. Department Responsibilities & Gap Items Test Suite (Documents 1 & 2)
```bash
node scripts/test_gap_apis.js
```
*Executes **78 automated integration tests** covering all 7 hospital departments, payroll policies, shift rosters, and cryptographic audit log chaining with a **100% pass rate**.*

**Combined Test Coverage: 154 / 154 Tests Passing (100% Success Rate)**


