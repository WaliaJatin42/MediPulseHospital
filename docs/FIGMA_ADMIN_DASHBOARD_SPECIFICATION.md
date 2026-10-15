# MediPulse Hospital Management System
## Figma Admin Dashboard & Role-Wise UI/UX Functional Specification
### Complete 30-Tag Swagger OpenAPI 3.0 Traceability Blueprint

---

### Executive Document Metadata
- **Document Version:** 3.0.0 (Master Enterprise Specification)
- **Target Audience:** UI/UX Designers, Product Managers, Frontend Engineers, QA Automation
- **Design System Target:** Figma (Auto Layout 5.0, Component Variants, Design Tokens, Variables)
- **Application Type:** Enterprise Clinical & Multi-Branch Hospital Management ERP
- **Default Resolutions:** Desktop Primary (`1440px × 900px`), Laptop (`1280px × 800px`), Tablet (`1024px × 768px`), Patient Portal Mobile (`375px × 812px`)
- **API Coverage:** 100% of all 30 Swagger API Modules (`http://localhost:5000/api-docs`)

---

## 1. Global Design System & UI Foundation

### 1.1 Curated Color Palette & Tokens
The UI delivers a high-trust, sterile, hyper-legible, modern clinical aesthetic avoiding generic default colors.

| Token Name | Hex Code | HSL | Usage & Visual Meaning |
|---|---|---|---|
| `--color-brand-primary` | `#0A192F` | `hsl(216, 65%, 11%)` | Deep Hospital Navy (Sidebar, Primary Brand headers, High contrast) |
| `--color-brand-accent` | `#0D9488` | `hsl(173, 84%, 32%)` | Medical Teal (Primary CTAs, Active navigation, Key indicators) |
| `--color-brand-secondary` | `#0284C7` | `hsl(201, 96%, 39%)` | Clinical Sky Blue (Secondary buttons, Links, Information pills) |
| `--color-surface-bg` | `#F8FAFC` | `hsl(210, 40%, 98%)` | Crisp Off-White / Pale Slate (Application canvas background) |
| `--color-surface-card` | `#FFFFFF` | `hsl(0, 0%, 100%)` | Pure White (Data cards, Tables, Modals, Forms) |
| `--color-surface-sidebar` | `#0F172A` | `hsl(222, 47%, 11%)` | Dark Slate (Persistent collapsible navigation rail) |
| `--color-border-subtle` | `#E2E8F0` | `hsl(214, 32%, 91%)` | Dividers, Card borders, Input container borders |
| `--color-text-main` | `#0F172A` | `hsl(222, 47%, 11%)` | 900 Charcoal (Primary headings, Vital metrics, Patient names) |
| `--color-text-muted` | `#64748B` | `hsl(215, 16%, 47%)` | 500 Slate (Secondary captions, Timestamps, Table headers) |
| `--color-emergency-red` | `#E11D48` | `hsl(347, 77%, 50%)` | Critical Alert, Code Blue, Panic Values, Emergency Triage ESI-1 |
| `--color-warning-amber` | `#F59E0B` | `hsl(38, 92%, 50%)` | Pending Approvals, Moderate Risk, Expiring Batches, Triage ESI-3 |
| `--color-success-emerald` | `#10B981` | `hsl(160, 84%, 39%)` | Verified, Signed SOAP notes, Completed payments, Active status |
| `--color-purple-specialty`| `#7C3AED` | `hsl(263, 90%, 51%)` | Operation Theatre, Surgical Slots, Specialty Consultations |

### 1.2 Clinical Status & Bed Lifecycle Tokens
These status colors are defined in Figma as component variant tokens for status badges and room/bed indicator tiles:

| Domain | Status Name | Pill Background | Text Color | Icon / Indicator |
|---|---|---|---|---|
| **Bed Status** | `available` | `#ECFDF5` | `#065F46` | Green Circle Check |
| **Bed Status** | `occupied` | `#EFF6FF` | `#1E40AF` | Blue Patient Bed Icon |
| **Bed Status** | `reserved` | `#FEF3C7` | `#92400E` | Amber Clock Icon |
| **Bed Status** | `cleaning` | `#F3E8FF` | `#6B21A8` | Purple Sparkle / Broom Icon |
| **Bed Status** | `maintenance` | `#FEE2E2` | `#991B1B` | Red Wrench Icon |
| **Bed Status** | `isolation` | `#FFF1F2` | `#BE123C` | Pink Biohazard Shield |
| **Triage ESI-1** | `Resuscitation` | `#E11D48` | `#FFFFFF` | Pulsating Red Dot |
| **Triage ESI-2** | `Emergent` | `#F97316` | `#FFFFFF` | Orange Warning Triangle |
| **Triage ESI-3** | `Urgent` | `#FBBF24` | `#78350F` | Yellow Shield |
| **Triage ESI-4** | `Less Urgent`| `#38BDF8` | `#0C4A6E` | Cyan Info Dot |
| **Triage ESI-5** | `Non-Urgent` | `#94A3B8` | `#0F172A` | Grey Neutral Dot |
| **Clinical Note**| `Draft` | `#F1F5F9` | `#475569` | Pencil Icon |
| **Clinical Note**| `Signed & Locked`| `#ECFDF5` | `#047857` | Green Padlock + SHA-256 Seal |
| **Order Status** | `stat` (Priority) | `#FFE4E6` | `#9F1239` | Red Flashing Flame |

---

## 2. Universal Application Shell & Global Components

The Figma design uses an atomic layout shell consisting of 4 constant framing elements:

```
+-----------------------------------------------------------------------------------------------+
| TOP NAVIGATION BAR: [Logo: MediPulse] [Branch Selector] [Search Ctrl+K] [Break-Glass] [Alerts] [User] |
+-----------+-----------------------------------------------------------------------------------+
| SIDEBAR   | BREADCRUMBS & ACTION BAR: Path > Subpath          [+ Primary Action] [Export]    |
| (240px)   +-----------------------------------------------------------------------------------+
| Collapsed | UNIVERSAL FILTER BAR: [Search] [Date Range Picker] [Status Filter] [Clear]        |
| to 72px   +-----------------------------------------------------------------------------------+
|           | MAIN CONTENT STAGE:                                                               |
| - Nav 1   | [KPI Cards Row: Metric 1 | Metric 2 | Metric 3 | Metric 4]                         |
| - Nav 2   |                                                                                   |
| - Nav 3   | [Data Grid / Interactive Board / Clinical Workspace]                              |
| - Nav 4   |                                                                                   |
| - Nav 5   | PAGINATION FOOTER: Showing 1-20 of 142 items   [< 1 2 3 ... 8 >]  Rows: [20 v]   |
+-----------+-----------------------------------------------------------------------------------+
```

### 2.1 Top Navigation Bar (Fixed 64px Height)
1. **Hospital Logo & Brand Name**: MediPulse Hospital Management with branch badge (`Central Campus MPH-CEN` or `South Campus MPH-SOU`).
2. **Branch Switcher Dropdown**:
   - Displays active branch name and branch code.
   - Dropdown list with radio selection: `MPH-CEN: Central Main Hospital` and `MPH-SOU: South City Branch`.
   - On change: triggers token refresh (`POST /api/v1/auth/switch-branch`) and dynamic tenant-scoped data reload.
3. **Global Omni-Search Bar (`Ctrl + K`)**:
   - Quick search input with magnifying glass and keyboard badge `⌘K` / `Ctrl+K`.
   - Autocomplete dropdown categorizing results: Patients (by UHID, Name, Mobile), Staff (by Employee ID, Name), Invoices (by Invoice #), and CPOE Orders.
4. **Emergency "Break-Glass" Access Button**:
   - High-visibility button with red pulsating border and unlocked padlock icon.
   - Click opens the Break-Glass Justification Modal (`POST /api/v1/break-glass`).
5. **Real-Time Notification Drawer Trigger (FCM / Outbox)**:
   - Bell icon with unread count pill badge (e.g. `[ 3 ]`).
   - Click slides out the Notification Drawer showing live critical alerts: Panic Lab Results, Code Blue calls, Emergency Ward Indents, and Roster Swaps.
6. **User Profile & Role Pill**:
   - Circular staff avatar, Staff Name, Role pill badge (`Superadmin`, `Doctor`, `Nurse`, `Pharmacist`, etc.), and chevron dropdown (`My Profile`, `Security & 2FA`, `Attendance Punch Clock`, `Logout`).

### 2.2 Global Floating Emergency Alert Banner
- Positioned directly below Top Navigation when an active emergency code exists.
- Color: `#E11D48` (Flashing Crimson).
- Message: `[CODE BLUE ACTIVATED] Ward 3 - Bed 304B | Cardiac Arrest Response Team Dispatched at 02:44 AM | Lead: Dr. Aris Thorne`.
- Action: "Acknowledge" button and "Open Encounter" direct link.

### 2.3 Patient Sticky Identity Banner (For all Clinical Screens)
When viewing any patient-specific screen (EMR, Bed, MAR, Vitals, Invoices), a persistent 56px Patient Banner sits at the top:
- **Left**: Patient Photo, **Patient Full Name**, **UHID Tag** (`MPH-CEN-2026-000412`), **Age & Sex** (`45Y / Male`), **Blood Group** (`O+`).
- **Center**: **Allergy Pill** (`Penicillin, Sulfa` in bold crimson with warning icon), **Current Diagnosis** (`Acute Appendicitis - ICD-10 K35.80`).
- **Right**: **Location** (`ICU Bed 04`), **Attending Consultant** (`Dr. Sarah Jenkins`), **Code Status** (`Full Code / DNR`), **Fall Risk Badge** (`Moderate`).

---

## 3. Swagger OpenAPI 3.0 API-to-UI Traceability Matrix (All 30 Tags)

The table below provides a complete, 1-to-1 mapping from every Swagger API section to its dedicated Figma Frame ID, UI layout type, and generated visual mockups.

| # | Swagger Tag / Domain | Core Backend Functionalities | Primary Screen ID | Figma Frame Title | Visual Mockup Reference |
|---|---|---|---|---|---|
| **1** | **Authentication** | Session lifecycle, login, branch switch, TOTP MFA, Google OAuth, password reset | `AUTH-01`, `AUTH-02` | `AUTH-01-LOGIN-MFA`, `AUTH-02-RESET-PWD` | [login_mfa_screen.jpg](file:///d:/user_management_system/docs/mockups/login_mfa_screen_1792042760220.jpg) |
| **2** | **Clinical: Branches & Facility** | Two-branch context, facility hierarchy tree, bed census, room rent, bed lifecycle | `FAC-01`, `NUR-02` | `FAC-01-HIERARCHY-TREE`, `NUR-02-BED-GRID` | [nurse_ward_matrix.jpg](file:///d:/user_management_system/docs/mockups/nurse_ward_matrix_1792042471207.jpg) |
| **3** | **Clinical: Patients & Identity** | Registration, sequential non-gap UHID, duplicate check preview, wristbands, consents | `REC-02`, `REC-04` | `REC-02-PATIENT-INTAKE`, `REC-04-CONSENTS` | [patient_registration_intake.jpg](file:///d:/user_management_system/docs/mockups/patient_registration_intake_1792042786357.jpg) |
| **4** | **Clinical: Access & Care Teams** | Care team episode assignment, 2-hour break-glass override, sensitive record flags | `CARE-01`, `MODAL-BG` | `CARE-01-CARE-TEAMS`, `MODAL-BREAK-GLASS` | Layout Spec in Sec. 4.1 |
| **5** | **Clinical: OPD & Appointments** | Doctor schedule slots, double-booking prevention, queue tokens, public TV feed, SOAP notes, EMR | `REC-03`, `DOC-02` | `REC-03-QUEUE-DISPLAY`, `DOC-02-EMR-WORKSPACE` | [opd_queue_display.jpg](file:///d:/user_management_system/docs/mockups/opd_queue_display_1792042812311.jpg) & [doctor_emr_mockup.jpg](file:///d:/user_management_system/docs/mockups/doctor_emr_mockup_1792042447513.jpg) |
| **6** | **Clinical: CPOE & Safety Checks** | Unified orders (lab, radiology, pharmacy), drug-drug interaction alerts, allergy screening | `DOC-02` (Right Panel) | `DOC-02-CPOE-PANEL` | [doctor_emr_mockup.jpg](file:///d:/user_management_system/docs/mockups/doctor_emr_mockup_1792042447513.jpg) |
| **7** | **Clinical: Diagnostics & Lab** | Sample barcodes, accessioning, test results, pathologist validation, critical panic alerts, PACS | `LAB-02`, `RAD-02` | `LAB-02-RESULT-ENTRY`, `RAD-02-PACS-VIEWER` | [lab_results_panic_alert.jpg](file:///d:/user_management_system/docs/mockups/lab_results_panic_alert_1792042910838.jpg) & [radiology_pacs_viewer.jpg](file:///d:/user_management_system/docs/mockups/radiology_pacs_viewer_1792042940508.jpg) |
| **8** | **Clinical: IPD & Nursing** | Inpatient admissions, bed transfers, vitals charting, MAR, 4-department discharge checklist | `NUR-01` to `NUR-05` | `NUR-01-STATION`, `NUR-04-MAR-TIMELINE` | [nurse_ward_matrix.jpg](file:///d:/user_management_system/docs/mockups/nurse_ward_matrix_1792042471207.jpg) |
| **9** | **Clinical: Acute Care & Emergency** | ESI 1-5 triage, hospital Code Blue FCM broadcast, OT 3-way conflict checks, ICU flowsheets | `ACUTE-02`, `ACUTE-03` | `ACUTE-02-ER-TRIAGE`, `ACUTE-03-OT-CALENDAR` | [emergency_triage_board.jpg](file:///d:/user_management_system/docs/mockups/emergency_triage_board_1792042496506.jpg) |
| **10** | **Clinical: Billing & Revenue** | Ledger accounts, interim bills, deposits, sequential FY non-gap invoices, tiered discounts | `BILL-02`, `BILL-03` | `BILL-02-LEDGER-DESK`, `BILL-03-INVOICE` | [billing_tpa_workspace.jpg](file:///d:/user_management_system/docs/mockups/billing_tpa_workspace_1792042521268.jpg) |
| **11** | **Clinical: Support Services** | Blood bank stock, diet meal planning, ambulance GPS telemetry, certificates & public QR verification | `CERT-01`, `CERT-02`, `BLOOD-01`, `AMB-01` | `CERT-01-ISSUANCE`, `CERT-02-PUBLIC-VERIFY` | Layout Spec in Sec. 4.11 & 4.12 |
| **12** | **Clinical: Patient Portal** | Dedicated token audience (`aud: patient_portal`), mobile OTP login, lab reports, prescriptions, pay | `PORTAL-01` to `PORTAL-04` | `PORTAL-01-MOBILE-DASH`, `PORTAL-02-REPORTS` | Layout Spec in Sec. 4.13 |
| **13** | **Clinical: FHIR R4 Facade** | FHIR R4 standard resources (`/fhir/Patient`, `/fhir/Encounter`, `/fhir/Observation`) | `INT-01` | `INT-01-FHIR-CONSOLE` | Layout Spec in Sec. 4.14 |
| **14** | **Superadmin Governance** | Multi-branch overview, superadmin protection guard, executive KPIs | `SA-01` | `SA-01-EXECUTIVE-HUB` | [superadmin_dashboard_mockup.jpg](file:///d:/user_management_system/docs/mockups/superadmin_dashboard_mockup_1792042421459.jpg) |
| **15** | **User Management** | Staff accounts, creator-scoping vs department-scoping, branch transfers, ownership reassign | `SA-02` | `SA-02-STAFF-DIRECTORY` | Layout Spec in Sec. 4.15 |
| **16** | **Notifications & FCM Push** | In-app notification center, topic broadcast push, device token registration, FCM test | `NOTIF-01`, `DRAWER` | `NOTIF-01-FCM-BROADCAST`, `DRAWER-NOTIFICATIONS` | Layout Spec in Sec. 4.16 |
| **17** | **Attendance & Anti-Fraud** | Punch in/out, 9-hour policy, 15m grace period, GPS geofence verification, anomaly flags | `HR-02` | `HR-02-BIOMETRIC-ATTENDANCE` | [hr_attendance_roster.jpg](file:///d:/user_management_system/docs/mockups/hr_attendance_roster_1792042835454.jpg) |
| **18** | **Shifts & Rosters** | Midnight-crossing night shifts (23:00-07:30), shift allowances, weekly off, peer swaps | `HR-03` | `HR-03-SHIFT-ROSTER-MATRIX` | [hr_attendance_roster.jpg](file:///d:/user_management_system/docs/mockups/hr_attendance_roster_1792042835454.jpg) |
| **19** | **Leave Management** | Configurable leave quotas (annual, sick, casual), carry-forward, 2-tier approval workflow | `HR-04` | `HR-04-LEAVE-MANAGEMENT` | Layout Spec in Sec. 4.19 |
| **20** | **Payroll Policies & Calculation** | Versioned payroll policies, attendance-based calculation, locked runs, dry-run variance audit | `HR-05` | `HR-05-PAYROLL-WIZARD` | [payroll_run_wizard.jpg](file:///d:/user_management_system/docs/mockups/payroll_run_wizard_1792042861632.jpg) |
| **21** | **Salary Extras & Components** | Salary components, increments with revisions, advance deduction schedules, reimbursements | `FIN-03` | `FIN-03-SALARY-COMPONENTS-ADVANCES` | Layout Spec in Sec. 4.21 |
| **22** | **Calendar & Working Days** | Department-specific holidays, weekly offs, working days synchronization for payroll | `CAL-01` | `CAL-01-HOSPITAL-CALENDAR` | Layout Spec in Sec. 4.22 |
| **23** | **Audit Logging** | Tamper-evident append-only SHA-256 cryptographic hash-chained audit trail & verification | `SA-04` | `SA-04-AUDIT-VERIFICATION` | Layout Spec in Sec. 4.23 |
| **24** | **System & Engineering** | Hospital timezone, currency, system telemetry, health readiness probes, distributed job locks | `SYS-01` | `SYS-01-SYSTEM-TELEMETRY` | Layout Spec in Sec. 4.24 |
| **25** | **Department Management** | Hospital 7 departments registry, codes, department head, staff allocations | `DEPT-01` | `DEPT-01-DEPARTMENT-REGISTRY` | Layout Spec in Sec. 4.25 |
| **26** | **HR Module** | Hiring pipeline, employee document vault, 4-department exit offboarding checklist | `HR-06` | `HR-06-HIRING-AND-EXIT-CLEARANCE` | Layout Spec in Sec. 4.26 |
| **27** | **Pharmacy Module** | Medicine catalog, stock batches, FEFO dispensing, alerts, purchase orders, controlled log | `PHARM-01` to `PHARM-04` | `PHARM-02-DISPENSE-FEFO`, `PHARM-03-CONTROLLED` | [pharmacy_dispensing_fefo.jpg](file:///d:/user_management_system/docs/mockups/pharmacy_dispensing_fefo_1792042965344.jpg) |
| **28** | **Security Module** | Visitor check-in/pass, incident resolution, guard patrols, vehicle gate log, emergency alerts | `SEC-01`, `SEC-02` | `SEC-01-VISITOR-GATE`, `SEC-02-INCIDENTS` | Layout Spec in Sec. 4.28 |
| **29** | **Finance Module** | Department budgets vs actuals, expense claims, vendor invoices, disbursement gate | `FIN-01`, `FIN-02` | `FIN-01-BUDGETS-EXPENSES`, `FIN-02-VENDOR-INVOICES` | Layout Spec in Sec. 4.29 |
| **30** | **Support Module** | Service tickets, housekeeping cleaning schedules, supplies inventory, transport bookings | `SUP-01` | `SUP-01-TICKETS-HOUSEKEEPING` | Layout Spec in Sec. 4.30 |

---

## 4. Exhaustive Functional Screen Specifications by Swagger Domain

---

### 4.1 Clinical Access, Care Teams & Emergency Break-Glass (`SWAGGER: Clinical: Access & Care Teams`)
- **Primary Screen Frame:** `CARE-01-CARE-TEAMS` & `MODAL-BREAK-GLASS`
- **Route:** `/api/v1/care-teams`, `/api/v1/break-glass`
- **Layout:** Two-Panel Split View.
  - **Left Panel (Active Care Teams):** Table of active clinical episodes. Columns: `Patient UHID & Name`, `Episode ID`, `Admitted Ward`, `Lead Consultant`, `Assigned Ward Nurses (Chips)`, `Episode Status (Active/Closed)`, `Actions`.
  - **Right Panel (Sensitive Record Restrictions):** Sensitive flag manager. Toggles: `VIP Patient Privacy Lock (Restricts notes to Attending Doctor only)`, `Psychiatric Note Confidentiality Seal`, `Infectious Disease Exposure Barrier`.
- **Modal: "2-Hour Emergency Break-Glass Access" (`FRAME: MODAL-BREAK-GLASS`):**
  - **Visual:** High-alert crimson border with yellow caution diagonal striping.
  - **Inputs:** `Target Patient UHID*` (Searchable), `Emergency Justification Category*` (Dropdown: `Code Blue / Resuscitation`, `Unconscious Trauma Intake`, `Attending Physician Unavailable`, `Mass Casualty Incident`), `Detailed Clinical Justification*` (Textarea, min 25 chars).
  - **Notice Box:** *"Under HIPAA/NABH guidelines, this emergency grant overrides care-team restrictions for exactly 120 minutes. An immutable cryptographic audit record is broadcast to the Chief Medical Officer and Superadmin."*
  - **On Confirmation:** Adds persistent floating red countdown banner to active viewport: `[BREAK-GLASS ACTIVE] Target: Rajesh Kumar (UHID: MPH-CEN-2026-000412) | Remaining Time: 01:58:24`.

---

### 4.11 Tamper-Evident Medical, Birth & Death Certificates (`SWAGGER: Clinical: Support Services`)
- **Screen 1 (Hospital Staff Issuance):** `CERT-01-ISSUANCE`
  - **Route:** `POST /api/v1/certificates`, `GET /api/v1/certificates`
  - **Form Fields:** `Certificate Type*` (`Medical Fitness`, `Birth Certificate`, `Death Certificate`, `Medical Leave Recommendation`), `Patient UHID*`, `Attending Doctor License*`, `Clinical Summary / Findings*`, `Valid From Date*`, `Valid Until Date`.
  - **Output Generator:** Generates an official cryptographic certificate featuring a **Unique 16-Character Public Verification Code** (e.g. `CERT-2026-X89J-Q41A`) and a dynamic QR code.
- **Screen 2 (Public Verification Portal - NO AUTH REQUIRED):** `CERT-02-PUBLIC-VERIFY`
  - **Route:** `GET /api/v1/certificates/verify/{code}` (Publicly accessible by employers, embassies, police, insurance auditors without login).
  - **Layout:** Clean, branded verification portal with MediPulse Hospital seal.
  - **Input / Scanned View:** Search box to input 16-character code OR scanned via camera.
  - **Verification Result Banner:**
    - Green Verified Badge: `AUTHENTIC DOCUMENT VERIFIED: Issued by MediPulse Hospital Central Campus`.
    - Verification Details Card: Certificate Type, Patient Initials, Issuing Physician (`Dr. Sarah Jenkins, MD - Reg #MED-88192`), Issue Timestamp, and Document Status (`Active & Tamper-Free`).

---

### 4.12 Blood Bank Inventory & Cross-Match Issue Register (`SWAGGER: Clinical: Support Services`)
- **Primary Screen Frame:** `BLOOD-01-INVENTORY`
- **Route:** `/api/v1/bloodbank/inventory`, `/api/v1/bloodbank/cross-match`
- **Layout:** Grid of 8 Blood Group Cards (`A+`, `A-`, `B+`, `B-`, `AB+`, `AB-`, `O+`, `O-`).
  - Each card breaks down component units: `Packed Red Blood Cells (PRBC)`, `Fresh Frozen Plasma (FFP)`, `Platelet Concentrate`, `Cryoprecipitate`.
  - Amber Alert Tag: Triggers if `O- Negative` units fall below safety buffer (<10 units).
  - Expiry Tracker: Lists units expiring within 5 days with bag barcodes.
- **Modal: "Cross-Match & Transfusion Issue":**
  - Inputs: Recipient Patient UHID, Target Blood Bag Barcode (Scanned), Cross-Match Result (`Compatible / Incompatible - Major & Minor Coombs Test`), Ordering Physician.
  - Action: Issues unit and transitions status to `transfusion_released`.

---

### 4.13 Patient Portal (Mobile First Web UI) (`SWAGGER: Clinical: Patient Portal`)
- **Target Frame:** `PORTAL-01-MOBILE-DASH` (Resolution: `375px × 812px` & Desktop Responsive)
- **Authentication Separation:** Strict JWT audience isolation (`aud: patient_portal`). Staff tokens are rejected on portal routes.
- **Login Screen:** Registered Mobile Number input + Fast 6-digit OTP verification.
- **Patient Dashboard Layout:**
  - Header: Patient Avatar, Name, UHID, Emergency SOS button.
  - **4 Large Quick-Action Tiles:**
    1. `Book Appointment` (Doctor specialty selector, calendar slot picker, online fee payment).
    2. `My Diagnostic Reports` (Displays **only doctor-released** lab & radiology reports with interactive viewer & PDF download).
    3. `Active Prescriptions` (Pill reminders with dosage instructions).
    4. `Hospital Bills & Invoices` (Itemized bill breakdown with instant UPI/Card payment).

---

### 4.14 FHIR R4 Interoperability & Health Data Exchange Console (`SWAGGER: Clinical: FHIR R4 Facade`)
- **Primary Screen Frame:** `INT-01-FHIR-CONSOLE`
- **Route:** `GET /api/v1/fhir/Patient`, `GET /api/v1/fhir/Encounter`, `GET /api/v1/fhir/Observation`
- **Layout:** High-tech integration engineer dashboard.
  - **Standards Selector Tabs:** `FHIR R4 Patient`, `FHIR R4 Encounter`, `FHIR R4 Observation (Vitals & Labs)`.
  - **Interactive Search Filter:** Filter by FHIR Identifier, Date Range, Category (`vital-signs`, `laboratory`).
  - **Live JSON Schema Inspector:** Split viewer showing native MediPulse clinical document on the left and the transformed standard HL7 FHIR R4 `application/fhir+json` searchset Bundle on the right with copy & export buttons.

---

### 4.15 User Management & Scoping Isolation (`SWAGGER: User Management`)
- **Primary Screen Frame:** `SA-02-STAFF-DIRECTORY`
- **Route:** `/api/v1/users/*`
- **Scoping Matrix Enforced in UI:**
  - **Global Scope (Superadmin):** Sees all hospital staff hospital-wide.
  - **Creator Scope (HR Admin/Supervisor):** Sees and manages only staff records where `createdBy` matches their user ID.
  - **Department Scope (Other Dept Admins):** Reads staff within their own department with sensitive salary details strictly masked (`403 Forbidden`).
  - **Self Scope (Staff):** Views only own profile and payslips.
- **Modal: "Reassign Orphaned Staff Ownership":**
  - Trigger: When an HR creator account is deactivated or terminated, UI prompts mandatory reassignment of their created staff to an active HR admin before deactivation completes.

---

### 4.16 Notifications & Firebase Cloud Messaging (FCM) (`SWAGGER: Notifications & FCM Push`)
- **Primary Screen Frame:** `NOTIF-01-FCM-BROADCAST` & `DRAWER-NOTIFICATIONS`
- **Route:** `/api/v1/notifications/*`
- **Slide-Over Notification Center Drawer:**
  - Accessible via the top bell icon from any screen.
  - Tabs: `All Alerts`, `Critical / STAT (Red)`, `Clinical Updates`, `Administrative`.
  - Real-time websocket & FCM push listeners display toasts for Code Blue alerts, Panic Lab Values, and Ward Indents.
- **Broadcast Console (Admin Only):**
  - Topic Selector: `hospital_all`, `dept_nursing`, `dept_doctors`, `dept_emergency`.
  - Message Title, Body, Priority (`Normal`, `High/Urgent`), Action URL deep-link.
  - Action button: `[Send Push Broadcast via Firebase Cloud Messaging]`.

---

### 4.19 Leave Management & 2-Tier Approval (`SWAGGER: Leave Management`)
- **Primary Screen Frame:** `HR-04-LEAVE-MANAGEMENT`
- **Route:** `/api/v1/leaves/*`, `/api/v1/leave-types/*`
- **Layout:**
  - **Top Balance Cards (Employee View):** Annual Leave (`12 Remaining / 18 Total`), Sick Leave (`8 Remaining`), Casual Leave (`4 Remaining`).
  - **Manager Approvals Kanban Table:**
    - Columns: `Employee ID`, `Staff Name`, `Leave Type`, `Date Range (From - To)`, `Duration (Days)`, `Reason`, `Attachment (Medical Certificate)`, `Approval Tier Status`.
    - Status Pills: `Pending Supervisor Sign-Off (Tier 1)` ➔ `Pending HR Admin Approval (Tier 2)` ➔ `Approved & Deducted from Quota`.

---

### 4.21 Salary Components, Advances & Arrears (`SWAGGER: Salary Extras & Components`)
- **Primary Screen Frame:** `FIN-03-SALARY-COMPONENTS-ADVANCES`
- **Route:** `/api/v1/salary-components`, `/api/v1/advances`, `/api/v1/bonuses`, `/api/v1/reimbursements`, `/api/v1/arrears`
- **Layout:**
  - **Section 1: Salary Component Master:** Earnings (Basic, HRA, Medical Allowance, Shift Allowance) and Deductions (EPF 12%, ESI 0.75%, Professional Tax, TDS progressive slabs).
  - **Section 2: Salary Advances Management:** Request advance with auto-installment repayment plan (e.g. `$1,500 advance repaid over 3 consecutive monthly payroll runs at $500/month`). Auto-deducted during payroll calculation.
  - **Section 3: Expense Reimbursements & Arrears:** Travel and medical claim uploads with receipt attachments and retroactive salary arrears adjustments.

---

### 4.22 Hospital Calendar & Dynamic Working Days (`SWAGGER: Calendar & Working Days`)
- **Primary Screen Frame:** `CAL-01-HOSPITAL-CALENDAR`
- **Route:** `/api/v1/calendar/*`
- **Layout:** Interactive 12-month visual calendar.
  - Highlights Hospital Gazetted Holidays (National Holidays, Regional Holidays).
  - Department Weekly Off rules (e.g. Admin: 5-day week Sat/Sun off; Clinical Nursing: Rolling 6-day week with designated rest days).
  - Dynamic Working Days Calculator widget: Automatically computes billable working days for each month, feeding directly into the automated payroll engine.

---

### 4.24 System Telemetry, Health Probes & Job Locks (`SWAGGER: System & Engineering`)
- **Primary Screen Frame:** `SYS-01-SYSTEM-TELEMETRY`
- **Route:** `/api/v1/system/*`, `/api/v1/health`, `/api/v1/health/ready`, `/api/v1/jobs/*`
- **Layout:** Technical Admin & DevOps Monitor.
  - **Liveness & Readiness Status Cards:** Database connection (`MongoDB 127.0.0.1:27017 - Latency 4ms`), Redis Distributed Cache (`Connected`), FCM Service Account (`Verified`).
  - **Distributed Job Lock Monitor (`JobLock`):** Shows background cron jobs (Monthly Payroll Run, Daily Bed Rent Night Audit, Stock Expiry Scan) with active distributed lock status, preventing multi-instance race conditions.

---

### 4.26 HR Hiring Pipeline & 4-Department Exit Clearance (`SWAGGER: HR Module`)
- **Primary Screen Frame:** `HR-06-HIRING-AND-EXIT-CLEARANCE`
- **Route:** `/api/v1/hr/hires`, `/api/v1/exits`
- **Layout:**
  - **Tab 1 (Hiring Pipeline):** Kanban board tracking candidates through stages: `Applied` ➔ `Interview Scheduled` ➔ `Offer Extended` ➔ `Background Verification` ➔ `Joined & Onboarded`.
  - **Tab 2 (Offboarding & 4-Department Exit Clearance Matrix):**
    - Staff resignation & notice period tracker.
    - Clearance Checklist Matrix: Requires sign-off from all 4 operational departments before final settlement pay can be disbursed:
      1. **Technical / IT:** Laptop, access cards, and credentials revoked.
      2. **Pharmacy:** Hospital medication vaults and prescription pads returned.
      3. **Security:** Security access badge and gate transponder surrendered.
      4. **Finance:** Advance salary loans settled and final settlement calculated.

---

### 4.28 Security Visitor Management, Incidents & Patrols (`SWAGGER: Security Module`)
- **Screen 1 (Visitor Pass & Gate Access):** `SEC-01-VISITOR-GATE`
  - **Route:** `/api/v1/security/visitors`, `/api/v1/security/vehicles`, `/api/v1/security/patrols`
  - **Visitor Intake Form:** Visitor Name, Mobile, Government ID, Target Patient UHID or Staff Member, Visiting Ward & Bed, Reason for Visit.
  - **Output:** Thermal Visitor Badge print with barcode and automatic 2-hour checkout expiry countdown.
  - **Vehicle Gate Log Table:** Vehicle license plate, driver name, gate entry timestamp, parking bay assigned, exit checkout.
- **Screen 2 (Security Incidents & Code Broadcasts):** `SEC-02-INCIDENTS`
  - **Route:** `/api/v1/security/incidents`, `/api/v1/security/alerts`
  - **Incident Reporting Form:** Incident Category (`Theft`, `Physical Altercation`, `Unauthorized Access`, `Fire Alarm`), Location/Ward, CCTV Evidence Attachment, Guard Officer Name, Resolution Notes.
  - **Emergency Broadcast Button:** High-priority hospital emergency trigger broadcasting Code Red (Fire), Code Black (Bomb/Severe Threat), or Code Amber (Infant Abduction) across all staff mobile apps and workstation screens.

---

### 4.29 Finance Budgets, Expense Claims & General Ledger (`SWAGGER: Finance Module`)
- **Screen 1 (Budgets vs Actuals & Expenses):** `FIN-01-BUDGETS-EXPENSES`
  - **Route:** `/api/v1/finance/budgets`, `/api/v1/finance/expenses`, `/api/v1/finance/ledger`
  - **Budget Tracker:** Departmental budget allocation cards (Pharmacy `$250K`, Cardiology `$400K`, ICU `$350K`) showing Progress Bars of Actual Spend vs Allocated Budget with over-budget alerts.
  - **Staff Expense Claims Queue:** Expense receipt attachment, claim category (Travel, Medical Supplies, Continuing Medical Education), and Finance Admin `[Approve / Reject]` decision buttons.
- **Screen 2 (Vendor Invoices & Payroll Disbursement Gate):** `FIN-02-VENDOR-INVOICES`
  - **Route:** `/api/v1/finance/invoices`, `/api/v1/finance/payments`, `/api/v1/finance/payroll/:runId/disbursement-confirm`
  - **Vendor Invoices Table:** Supplier Name, Invoice Number, Goods Received Note (GRN) Reference, Total Due, Payment Due Date, Status (`Pending Payment`, `Paid`).
  - **Two-Key Payroll Disbursement Release Gate:**
    - Review HR monthly payroll calculation ledger.
    - Two-key authorization: Finance Admin signs off bank disbursement file (`POST /api/v1/finance/payroll/:runId/disbursement-confirm`), executing bank transfer batch.

---

### 4.30 Support Service Tickets, Housekeeping & Transport (`SWAGGER: Support Module`)
- **Primary Screen Frame:** `SUP-01-TICKETS-HOUSEKEEPING`
- **Route:** `/api/v1/support/requests`, `/api/v1/support/schedules`, `/api/v1/support/supplies`, `/api/v1/support/transport/bookings`
- **Layout:** 3-Tab Operational Workspace.
  - **Tab 1: Service Requests / Helpdesk Tickets:** All staff can log maintenance or cleaning tickets (e.g. `AC leaking in Ward 2 Room 204`, `Wheelchair required at Main Gate`). Ticket status Kanban: `Submitted` ➔ `Assigned to Staff` ➔ `In Progress` ➔ `Resolved with Feedback Rating`.
  - **Tab 2: Housekeeping Cleaning Schedules:** Automated bed cleaning dispatcher. When a patient is discharged, the bed automatically enters the `cleaning` queue here. Housekeeping supervisor marks clean, transitioning bed to `available`.
  - **Tab 3: Non-Emergency Transport Bookings:** Schedule patient transport vans, wheelchair shuttles between Central and South branches.

---

## 5. Figma Design System File Organization & Handoff Guidelines

### 5.1 Recommended Figma File Structure
To ensure clean collaboration, organize the Figma project into the following 16 pages:

1. `00_Cover & Release Notes` (Version history, changelog, design team credits)
2. `01_Design Tokens & Foundations` (Colors, Typography, Spacing, Shadows, Grid layouts)
3. `02_Component Library - Atoms & Molecules` (Buttons, Badges, Inputs, Tooltips, Chips, Status Pills)
4. `03_Component Library - Organisms` (Top Bar, Sidebar, Patient Banner, Table Data Grid, Modal Shells)
5. `04_Superadmin & Governance Screens` (`SA-01` to `SA-05`)
6. `05_HR & Payroll Screens` (`HR-01` to `HR-06`)
7. `06_Receptionist & Front Desk Screens` (`REC-01` to `REC-04`)
8. `07_Doctor & EMR Clinical Screens` (`DOC-01` to `DOC-05`)
9. `08_Nursing Station & Ward Screens` (`NUR-01` to `NUR-06`)
10. `09_Diagnostics (Lab & Radiology) Screens` (`LAB-01` to `RAD-04`)
11. `10_Pharmacy & Inventory Screens` (`PHARM-01` to `PHARM-05`)
12. `11_Billing, Cashier & TPA Screens` (`BILL-01` to `BILL-05`)
13. `12_Acute Care (ER, OT, Ambulance, Blood Bank)` (`ACUTE-01` to `ACUTE-06`)
14. `13_Support Services & Certificates` (`CERT-01`, `CERT-02`, `SUP-01`, `SEC-01`, `FIN-01`)
15. `14_Patient Portal (Mobile & Web)` (`PORTAL-01` to `PORTAL-04`)
16. `15_Interactive Prototype Flow Map` (Connected clickable wireflows for user testing)

---

### Summary Checklist for Figma Designers
- [ ] Implement Design System Tokens (Palette, Typography, Bed Statuses, ESI Triage).
- [ ] Build the Universal App Shell (Top Bar with Branch Switcher, Collapsible Sidebar, Patient Banner).
- [ ] Design all 30 Swagger API domain screens following the Traceability Matrix in Section 3.
- [ ] Design all critical edge-case dialogs: Break-Glass 2-hour override, Public QR Certificate verification, 4-Department Discharge Checklist, Controlled Substances Dual Witness, and WHO Surgical Safety Checklist.
