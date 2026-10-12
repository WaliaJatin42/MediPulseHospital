# MediPulse Hospital - User Management, Salary & Attendance System

An enterprise-grade hospital management backend system built with **Node.js**, **Express**, and **MongoDB**. Features hierarchical role-based access control (RBAC), centralized HR hiring, employee salary records management, audit logging, a 9-hour work policy attendance tracking system, and an **automated monthly attendance-based payroll distribution system**.

---

## 📌 System Architecture & Core Highlights

- **Hierarchical RBAC & Centralized Hiring**:
  - **Superadmin**: Full global view and edit capabilities across all users, salaries, and attendance in the hospital.
  - **HR Admin & HR Supervisors**: Centralized personnel management. Exclusively authorized to hire/create supervisors and users across any department, assign salary records, and view/manage only users created by them.
  - **Other Department Admins & Supervisors**: Strictly **restricted** from creating users or assigning salary.
- **Dedicated Salary Records Table (`salaries`)**:
  - Full CRUD operations with fields: `user_id`, `user_name`, `department`, `designation`, `salary`, `created_at`, `updated_at`.
  - Automatically initialized during user creation and synchronized on profile edits.
- **Automated Monthly Attendance-Based Payroll (`payrolls`)**:
  - Automatically runs on date **01 of every month** (`01/mm/yyyy`) via scheduled cron and startup check on `npm start`.
  - Computes salary per employee based on monthly attendance records:
    - **`present`**: 1.0 payable day
    - **`half_day`**: 0.5 payable day
    - **`short_hours`**: 0.5 payable day
    - **`punched_in`** (no punch-out): 0.5 payable day
  - Formula: `calculatedSalary = Math.round((baseSalary / totalDaysInMonth) * payableDays)`.
  - Maintains month-wise historical records with unique transaction references (`TXN-PAY-YYYYMM-...`) and dispatches to accounts.
- **Soft Delete & Full Audit Trail**: Tracks `createdBy`, `updatedBy`, `deletedBy`, and `deletedAt` for compliance and record history.
- **Attendance System (9-Hour Policy)**: Real-time Punch-In / Punch-Out with automated work hour calculation, shift completion flags, and statuses (`present`, `half_day`, `short_hours`, `late`, `punched_in`).
- **RESTful API Versioning**: All routes prefixed under `/api/v1/`.

---

## 🗄️ Database Schema Diagram

```mermaid
erDiagram
    USER ||--o{ USER : "creates / updates / deletes"
    USER ||--o{ ATTENDANCE : "marks"
    USER ||--|| SALARY : "has salary record"
    USER ||--o{ PAYROLL : "receives monthly"

    USER {
        ObjectId _id PK
        string name "Full Name"
        string email "Unique Work Email"
        string passwordHash "Bcrypt Encrypted"
        string googleId "OAuth ID (optional)"
        string avatar "Profile Picture URL"
        enum role "user | supervisor | admin | superadmin"
        string designation "Doctor, Staff, etc."
        string department "hr | pharmacy | technical | security | support | legal | accounts | general"
        string phone "Contact Number (Unique for Admin/Superadmin)"
        number salary "Current Salary"
        enum authProvider "local | google"
        boolean isActive "Active Status"
        date lastLogin "Last Authentication Timestamp"
        ObjectId createdBy FK "User who created this account"
        ObjectId updatedBy FK "User who last updated this account"
        ObjectId deletedBy FK "User who deleted this account"
        boolean isDeleted "Soft Delete Flag"
        date deletedAt "Soft Delete Timestamp"
        date createdAt "Record Created"
        date updatedAt "Record Modified"
    }

    SALARY {
        ObjectId _id PK
        ObjectId user_id FK "Reference to User"
        string user_name "Employee Name"
        string department "Department"
        string designation "Designation"
        number salary "Salary Amount (Non-negative)"
        ObjectId createdBy FK "Created By User ID"
        ObjectId updatedBy FK "Updated By User ID"
        date created_at "Created Timestamp"
        date updated_at "Modified Timestamp"
    }

    PAYROLL {
        ObjectId _id PK
        ObjectId user_id FK "Reference to User"
        string user_name "Employee Name"
        string department "Department"
        string designation "Designation"
        string month "Format YYYY-MM"
        number baseSalary "Monthly Base Salary"
        number totalDaysInMonth "Days in Month (e.g. 30, 31)"
        number presentDays "Present Days"
        number halfDays "Half Days"
        number shortHoursDays "Short Hours Days"
        number absentDays "Absent Days"
        number payableDays "Payable Days"
        number calculatedSalary "Net Payable Salary"
        number deductions "Salary Deductions"
        enum status "paid | processed | pending"
        date disbursedAt "Disbursement Timestamp"
        string transactionReference "Unique TXN-PAY-..."
        boolean processedAutomatically "Auto or Manual Flag"
        string remarks "Attendance Breakdown Summary"
        date createdAt "Record Created"
        date updatedAt "Record Modified"
    }

    ATTENDANCE {
        ObjectId _id PK
        ObjectId user FK "Reference to User"
        string date "Date string (YYYY-MM-DD)"
        date punchIn "Punch-in Timestamp"
        date punchOut "Punch-out Timestamp"
        number totalWorkMinutes "Total Minutes Worked"
        number totalWorkHours "Total Hours Worked (decimal)"
        number shiftRequiredHours "9 Hours by Policy"
        boolean isShiftCompleted "true if workHours >= 9"
        enum status "punched_in | present | half_day | short_hours | late | absent | on_leave"
        enum workMode "on_site | remote | field_duty"
        string department "User Department"
        string notes "Remarks (optional)"
        date createdAt "Record Created"
        date updatedAt "Record Modified"
    }
```

---

## 👥 Role Hierarchy & Personnel Creation Workflow

```mermaid
flowchart TD
    SA([Superadmin])
    HRA([HR Admin])
    HRS([HR Supervisor])
    ODA([Other Dept Admins\nPharmacy / Tech / Legal / Accounts])
    ODS([Other Dept Supervisors])
    USR([Standard User\ne.g., Doctor, Nurse, Staff])

    %% Authorized Creation
    SA -->|Can create any role in any dept\nAssigns salary| HRA
    SA -->|Can create any role in any dept\nAssigns salary| ODA
    SA -->|Can create any role in any dept\nAssigns salary| USR

    HRA -->|Creates supervisor & user\nin ANY team/dept + assigns salary| ODS
    HRA -->|Creates supervisor & user\nin ANY team/dept + assigns salary| USR
    HRA -->|Creates under HR| HRS
    HRS -->|Creates supervisor & user\nin ANY team/dept + assigns salary| USR

    %% Restrictions
    ODA -.->|RESTRICTED: Cannot create users or add salary| X1[❌ Access Denied 403]
    ODS -.->|RESTRICTED: Cannot create users or add salary| X2[❌ Access Denied 403]

    classDef superAdmin fill:#4F46E5,stroke:#312E81,stroke-width:2px,color:#fff;
    classDef hrAdmin fill:#0284C7,stroke:#0369A1,stroke-width:2px,color:#fff;
    classDef deptAdmin fill:#6B7280,stroke:#374151,stroke-width:2px,color:#fff;
    classDef user fill:#10B981,stroke:#047857,stroke-width:2px,color:#fff;
    classDef restricted fill:#EF4444,stroke:#991B1B,stroke-width:2px,color:#fff;

    class SA superAdmin;
    class HRA,HRS hrAdmin;
    class ODA,ODS deptAdmin;
    class USR user;
    class X1,X2 restricted;
```

---

## 💰 Automated 01/mm/yyyy Monthly Payroll Workflow

```mermaid
sequenceDiagram
    autonumber
    actor Scheduler as Node Server (npm start / Cron: 0 0 1 * *)
    participant Engine as Payroll Service Engine
    participant DB as MongoDB (Attendance, User, Payroll)
    actor Employee as Hospital Employee Account

    Note over Scheduler: Triggered automatically on 01/mm/yyyy at 00:00 (or on npm start)
    Scheduler->>Engine: initPayrollScheduler() -> check date 1
    Engine->>DB: Query all active users
    loop For Each Active Employee
        Engine->>DB: Fetch user baseSalary & monthly attendance (YYYY-MM)
        Engine->>Engine: Count present (1.0), half_day (0.5), short_hours (0.5)
        Engine->>Engine: payableDays = present + (half_day * 0.5) + (short_hours * 0.5)
        Engine->>Engine: calculatedSalary = (baseSalary / totalDaysInMonth) * payableDays
        Engine->>DB: Upsert Payroll Record (month, payableDays, calculatedSalary, status: 'paid')
        Engine->>Employee: Disburse salary into employee account with TXN-PAY Ref
    end
    Engine-->>Scheduler: Payroll Completed (Summary: Total employees paid & disbursed amount)
```

---

## ⏱️ Attendance System & 9-Hour Shift Workflow

```mermaid
sequenceDiagram
    autonumber
    actor Employee as Hospital User
    participant API as Express API (/api/v1/attendance)
    participant DB as MongoDB

    Note over Employee,API: Punch-In (Start of Shift)
    Employee->>API: POST /punch-in (workMode, notes)
    API->>DB: Check existing attendance for today
    alt Already punched in today
        API-->>Employee: 400 Bad Request ("Already punched in for today")
    else Fresh punch-in
        API->>DB: Create Attendance (punchIn: now, status: 'punched_in')
        API-->>Employee: 201 Created (Attendance Record)
    end

    Note over Employee,API: Working 9-Hour Shift...

    Note over Employee,API: Punch-Out (End of Shift)
    Employee->>API: POST /punch-out (notes)
    API->>DB: Fetch today's punch-in record
    alt Punch-out already recorded
        API-->>Employee: 400 Bad Request ("Already punched out")
    else Valid punch-out
        API->>API: Calculate totalWorkHours = (punchOut - punchIn) / 3600000
        API->>API: Evaluate 9-Hour Policy:
        Note over API: workHours >= 9 ? 'present' : (workHours >= 4.5 ? 'half_day' : 'short_hours')
        API->>DB: Update (punchOut, totalWorkHours, isShiftCompleted, status)
        API-->>Employee: 200 OK (Calculated Work Summary)
    end
```

---

## 📊 Summary of Permissions & Visibility Matrix

| Role | Create Users & Assign Salary | Target Department | User List Visibility (`GET /users`) | Payroll Records Access |
| :--- | :--- | :--- | :--- | :--- |
| **Superadmin** | `user`, `supervisor`, `admin`, `superadmin` | Any Department | **All Users** in entire hospital | Full access to process, view, audit all payrolls |
| **HR Admin** | `user`, `supervisor` | **Any Team / Department** | **Only users created by them** | Full access to trigger & view all monthly payrolls |
| **HR Supervisor** | `user`, `supervisor` | **Any Team / Department** | **Only users created by them** | Full access to view all monthly payrolls |
| **Other Dept Admin** | **Restricted (403)** | N/A | Only users created by them | View own personal salary slip (`/payroll/my`) |
| **Other Dept Supervisor**| **Restricted (403)** | N/A | Only users created by them | View own personal salary slip (`/payroll/my`) |
| **Standard User** | **Restricted (403)** | N/A | N/A | View own personal salary slip (`/payroll/my`) |

---

## 🚀 API Endpoints Overview

All endpoints are versioned with the `/api/v1/` prefix.

### 1. Authentication (`/api/v1/auth`)
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/auth/login` | Public | Authenticate with email & password, returns JWT token |
| `POST` | `/api/v1/auth/logout` | Private | Clears auth cookies and invalidates session |
| `POST` | `/api/v1/auth/refresh` | Public | Refreshes access token using refresh token |
| `GET` | `/api/v1/auth/google` | Public | Google OAuth 2.0 social login initiate |
| `GET` | `/api/v1/auth/google/callback` | Public | Google OAuth 2.0 callback URL |

### 2. User Management (`/api/v1/users`)
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/users/me` | Authenticated | Retrieve current user profile |
| `POST` | `/api/v1/users` | Superadmin, HR Admin, HR Supervisor | Create a user & initialize salary (Other depts restricted) |
| `GET` | `/api/v1/users` | Superadmin, Admin, Supervisor | List users (scoped by role rules) |
| `GET` | `/api/v1/users/:id` | Superadmin, Admin, Supervisor | Get specific user by ID |
| `PATCH` | `/api/v1/users/:id` | Superadmin, Admin, Supervisor | Update user details & salary (records `updatedBy`) |
| `DELETE` | `/api/v1/users/:id` | Superadmin, Admin, Supervisor | Soft-delete user & remove salary (records `deletedBy`) |
| `POST` | `/api/v1/users/:id/reset-password` | Admin, Superadmin, Self | Reset password with departmental boundaries |

### 3. Salary Management (`/api/v1/salary` & `/api/v1/salaries`)
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/salary` | Superadmin, HR Admin, HR Supervisor | Create or assign a salary record |
| `GET` | `/api/v1/salary` | Superadmin, HR Admin, HR Supervisor | List all salary records (search, department filter) |
| `GET` | `/api/v1/salary/:id` | Superadmin, HR Admin, HR Supervisor, Self | Get salary record by Salary ID or User ID |
| `PATCH` | `/api/v1/salary/:id` | Superadmin, HR Admin, HR Supervisor | Update employee salary amount or details |
| `DELETE` | `/api/v1/salary/:id` | Superadmin, HR Admin, HR Supervisor | Delete salary record (resets user salary to 0) |

### 4. Payroll & Monthly Salary Distribution (`/api/v1/payroll`)
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/payroll/process` | Superadmin, HR Admin | Trigger monthly attendance-based payroll calculation |
| `GET` | `/api/v1/payroll` | Superadmin, HR Admin, HR Supervisor | List month-wise payroll records (month, dept filters) |
| `GET` | `/api/v1/payroll/my` | Authenticated (All employees) | Retrieve logged-in employee's monthly pay slips |
| `GET` | `/api/v1/payroll/:id` | Superadmin, HR Admin, HR Supervisor, Self | Get detailed pay slip record by ID |

### 5. Attendance Management (`/api/v1/attendance`)
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/attendance/punch-in` | Authenticated | Mark daily punch-in |
| `POST` | `/api/v1/attendance/punch-out` | Authenticated | Mark daily punch-out & compute 9-hour work hours |
| `GET` | `/api/v1/attendance/my` | Authenticated | Retrieve logged-in user's attendance history |
| `GET` | `/api/v1/attendance/all` | Superadmin, HR Admin, HR Supervisor | Cross-department hospital attendance records |
| `POST` | `/api/v1/attendance/mark` | Admin, Superadmin | Manual override / admin attendance entry |

---

## 🛠️ Getting Started & Local Installation

### Prerequisites
- [Node.js](https://nodejs.org/) (v16+ recommended)
- [MongoDB](https://www.mongodb.com/) (running locally or MongoDB Atlas connection string)

### 1. Clone & Install Dependencies
```bash
git clone <repository-url>
cd user_management_system/server
npm install
```

### 2. Configure Environment Variables
Create a `.env` file in `user_management_system/server/`:
```env
PORT=5000
NODE_ENV=development
MONGO_URI=mongodb://localhost:27017/medipulse_hospital
JWT_SECRET=your_jwt_secret_key_here
JWT_EXPIRE=24h
COOKIE_EXPIRE=24
CLIENT_URL=http://localhost:3000
```

### 3. Run the Server
```bash
# Development mode with nodemon
npm start

# Or run directly with node
node server.js
```

### 4. Interactive Documentation & Postman
- **Swagger UI**: Access interactive Swagger API docs at `http://localhost:5000/api-docs`
- **Postman Collection**: Import [`MediPulse_Hospital_API.postman_collection.json`](file:///d:/user_management_system/server/MediPulse_Hospital_API.postman_collection.json) directly into Postman for pre-configured requests.

---

## 📜 Audit Trail & Data Integrity

When any record is modified or removed:
- `updatedBy` captures the actor's User ID.
- Soft-deletion retains the user document in the database while stamping `deletedBy` and `deletedAt`.
- All operational activities are logged via Winston logger to both console and daily rotated log files in `server/logs/`.

---

## 🔒 Security, VAPT Hardening & Cyberattack Defenses

The system implements multi-layered security controls specifically designed to pass rigorous **Vulnerability Assessment and Penetration Testing (VAPT)** audits and defend against web cyberattacks:

### 1. Global VAPT Input Guard (`vaptSecurityGuard`)
All incoming requests (`req.body`, `req.query`, `req.params`) are inspected before reaching application handlers. Any request containing disallowed markup or attack vectors is immediately blocked with **HTTP 400 Bad Request**:
- **Cross-Site Scripting (XSS) & HTML Injections**:
  - Rejects HTML tags (`<script>`, `<iframe>`, `<img>`, `<svg>`, `<b>`, `<a>`, `<!-- -->`, etc.)
  - Rejects inline DOM event handlers (`onload=`, `onerror=`, `onclick=`, `onmouseover=`, `onfocus=`, etc.)
  - Rejects active pseudo-protocols (`javascript:`, `vbscript:`, `data:text/html`, etc.)
- **CSS Styling & Style Expression Injections**:
  - Rejects `<style>` tags
  - Rejects CSS `@import` directives (`@import url(...)`)
  - Rejects legacy CSS expression (`expression(...)`) and behavior (`behavior:...`) vectors
- **Evasion Detection**:
  - Automatically decodes single URL-encoded (`%3Cscript%3E`), double URL-encoded (`%253Cscript%253E`), and HTML entity-encoded (`&lt;script&gt;`) payloads to prevent filter bypass.
- **NoSQL Injection Defense**:
  - Rejects query operators (keys beginning with `$` like `{"$gt": ""}` or containing `.`)
- **Prototype Pollution Prevention**:
  - Rejects objects or URLs attempting to access `__proto__`, `constructor`, or `prototype`.

### 2. Route Protection & Hierarchical RBAC
- **Token Verification (`protect`)**: Every endpoint under `/api/v1/users`, `/api/v1/salary`, `/api/v1/attendance`, and `/api/v1/payroll` requires a signed JWT access token.
- **Deactivated / Deleted Account Rejection**: Users with `isActive: false` or `isDeleted: true` are blocked immediately with **HTTP 403 Forbidden**.
- **Role-Based Authorization (`authorize`)**: Centralized enforcement ensuring only authorized roles (`superadmin`, `admin`, `supervisor`) can access management operations.

### 3. Network & Infrastructure Hardening
- **Payload Denial-of-Service (DoS) Mitigation**: Strict request body limit of **10 KB** (`express.json({ limit: '10kb' })`). Requests exceeding this limit receive **HTTP 413 Payload Too Large**.
- **Brute-Force & Rate Limiting**:
  - Sensitive auth endpoints (`/api/v1/auth/login`, `/api/v1/auth/google`): 30 requests per 15 minutes.
  - General API endpoints (`/api/v1/*`): 300 requests per 15 minutes.
- **Information Exposure Mitigation (CWE-209)**: Stack traces are suppressed from API responses and logged exclusively to internal Winston daily rotation logs.
- **Hardened HTTP Security Headers (Helmet)**:
  - `X-Content-Type-Options: nosniff` (prevents MIME type sniffing)
  - `X-Frame-Options: DENY` (clickjacking defense)
  - `X-XSS-Protection: 0` (modern standard)
  - `X-Powered-By`: Completely removed to prevent server fingerprinting.

### 4. Running the VAPT Security Test Suite
A comprehensive 20-test automated security verification suite is included:
```bash
node scripts/test_vapt_security.js
```
The test verifies:
- Blocking of `<script>`, `<img onerror>`, `<style>`, `@import`, and `javascript:` in request bodies.
- Blocking of NoSQL operators and prototype pollution in JSON bodies and query parameters.
- Blocking of encoded XSS vectors in URL query strings.
- 401 Unauthorized rejection across all protected routes without tokens or with tampered tokens.
- 413 Payload Too Large rejection for payloads exceeding size limits.
- Proper execution of legitimate authenticated requests without false positives.

