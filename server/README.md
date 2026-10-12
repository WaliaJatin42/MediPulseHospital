# MediPulse Hospital - User Management & Attendance System

An enterprise-grade hospital management backend system built with **Node.js**, **Express**, and **MongoDB**. Features hierarchical role-based access control (RBAC), multi-department personnel management, audit logging, and a 9-hour work policy attendance tracking system.

---

## 📌 System Architecture & Core Highlights

- **Hierarchical RBAC**: Fine-grained access control across `superadmin`, `admin`, `supervisor`, and standard `user` roles across 8 hospital departments (`hr`, `pharmacy`, `technical`, `security`, `support`, `legal`, `accounts`, `general`).
- **Scoped Visibility & Creation Rules**:
  - **Superadmin**: Full global view and edit capabilities across all users in the hospital.
  - **HR Admin**: Can hire/create supervisors and users under any department; strictly views and manages only users created by them.
  - **Supervisor**: Can create standard users under their **same department**; strictly views only users created by them.
- **Soft Delete & Full Audit Trail**: Tracks `createdBy`, `updatedBy`, `deletedBy`, and `deletedAt` for compliance and record history.
- **Attendance System (9-Hour Policy)**: Real-time Punch-In / Punch-Out with automated work hour calculation, shift completion flags, and statuses (`present`, `half_day`, `short_hours`, `late`, `punched_in`).
- **RESTful API Versioning**: All routes prefixed under `/api/v1/`.

---

## 🗄️ Database Schema Diagram

```mermaid
erDiagram
    USER ||--o{ USER : "creates / updates / deletes"
    USER ||--o{ ATTENDANCE : "marks"

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

## 👥 Role Hierarchy & User Creation Workflow

```mermaid
flowchart TD
    SA([Superadmin])
    HRA([HR Admin])
    DA([Department Admin\ne.g., Pharmacy / Tech / Legal])
    HRS([HR Supervisor])
    DS([Department Supervisor])
    USR([Standard User\ne.g., Doctor, Nurse, Staff])

    %% Hierarchical Permissions
    SA -->|Can view, edit, delete ALL users\nCan create any role in any dept| HRA
    SA -->|Can create & manage| DA
    SA -->|Can create & manage| HRS
    SA -->|Can create & manage| DS
    SA -->|Can create & manage| USR

    HRA -->|Creates supervisor & user\nin ANY team/dept| DS
    HRA -->|Creates supervisor & user\nin ANY team/dept| USR
    HRA -->|Creates under HR| HRS
    HRA -.->|Views ONLY users\ncreated by self| HRA

    DA -->|Creates supervisor & user\nin own department| DS
    DA -->|Creates user in own dept| USR

    DS -->|Creates standard user ONLY\nin SAME department| USR
    DS -.->|Views ONLY users\ncreated by self| DS

    classDef superAdmin fill:#4F46E5,stroke:#312E81,stroke-width:2px,color:#fff;
    classDef hrAdmin fill:#0284C7,stroke:#0369A1,stroke-width:2px,color:#fff;
    classDef deptAdmin fill:#0D9488,stroke:#115E59,stroke-width:2px,color:#fff;
    classDef supervisor fill:#F59E0B,stroke:#B45309,stroke-width:2px,color:#fff;
    classDef user fill:#10B981,stroke:#047857,stroke-width:2px,color:#fff;

    class SA superAdmin;
    class HRA,HRS hrAdmin;
    class DA deptAdmin;
    class DS supervisor;
    class USR user;
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

| Role | Create Role | Target Department | User List Visibility (`GET /users`) | Edit / Delete Access |
| :--- | :--- | :--- | :--- | :--- |
| **Superadmin** | `user`, `supervisor`, `admin`, `superadmin` | Any Department | **All Users** in entire hospital | Full access to edit & delete all users |
| **HR Admin** | `user`, `supervisor` | **Any Team / Department** | **Only users created by them** | Only users created by them |
| **Supervisor** | `user` (standard user only) | **Same department only** | **Only users created by them** | Only users created by them |
| **Dept Admin** | `user`, `supervisor` | Own department | Users created by them / in department | Users created by them / in department |

> [!NOTE]
> **Phone Number Uniqueness Rule**: Unique phone validation is **only enforced** for accounts with role `admin` or `superadmin`. Standard `user` and `supervisor` accounts bypass unique phone constraints to facilitate streamlined onboarding.

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
| `POST` | `/api/v1/users` | Admin, Superadmin, Supervisor | Create a new user (governed by RBAC) |
| `GET` | `/api/v1/users` | Admin, Superadmin, Supervisor | List users (scoped by role rules) |
| `GET` | `/api/v1/users/:id` | Admin, Superadmin, Supervisor | Get specific user by ID |
| `PATCH` | `/api/v1/users/:id` | Admin, Superadmin, Supervisor | Update user details (records `updatedBy`) |
| `DELETE` | `/api/v1/users/:id` | Admin, Superadmin, Supervisor | Soft-delete user (records `deletedBy`, `deletedAt`) |
| `POST` | `/api/v1/users/:id/reset-password` | Admin, Superadmin, Self | Reset password with departmental boundaries |

### 3. Attendance Management (`/api/v1/attendance`)
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
