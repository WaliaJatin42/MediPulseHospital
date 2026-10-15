/**
 * Hospital Management System - Role Model & Permissions Matrix
 * Stack: Node.js, Express, MongoDB
 * 
 * Hierarchy:
 * - superadmin (Hospital-wide super administrator)
 * - Per Department:
 *   - admin (Department Head)
 *   - supervisor (Team Lead)
 *   - user (Staff / Employee)
 * 
 * Departments: HR, Pharmacy, Security, Finance, Support, Legal, Technical
 */

const DEPARTMENTS = {
  HR: 'hr',
  PHARMACY: 'pharmacy',
  SECURITY: 'security',
  FINANCE: 'finance',
  SUPPORT: 'support',
  LEGAL: 'legal',
  TECHNICAL: 'technical'
};

const ALL_DEPARTMENTS = Object.values(DEPARTMENTS);

const ROLES = {
  SUPERADMIN: 'superadmin',
  ADMIN: 'admin',
  SUPERVISOR: 'supervisor',
  USER: 'user'
};

const ALL_ROLES = Object.values(ROLES);

/**
 * Access Capabilities Matrix
 */
const CAPABILITIES = {
  VIEW_ALL_USERS: ['superadmin'],
  CREATE_SUPERVISORS_AND_USERS: ['superadmin', 'hr:admin'],
  CREATE_USERS_ONLY: ['hr:supervisor'],
  VIEW_MANAGE_CREATED_USERS: ['superadmin', 'hr:admin', 'hr:supervisor'],
  VIEW_OWN_DEPARTMENT_USERS: ['superadmin', 'admin', 'supervisor'],
  ASSIGN_OR_EDIT_SALARY: ['superadmin', 'hr:admin', 'hr:supervisor'],
  VIEW_OWN_SALARY: ['superadmin', 'admin', 'supervisor', 'user'],
  VIEW_EDIT_ALL_ATTENDANCE: ['superadmin'],
  VIEW_ATTENDANCE_DEPARTMENT: ['superadmin', 'admin', 'supervisor'],
  RUN_PAYROLL: ['superadmin'],
  VIEW_ALL_AUDIT_LOGS: ['superadmin'],
  VIEW_OWN_AUDIT_LOGS: ['superadmin', 'admin', 'supervisor'],
  MANAGE_DEPARTMENTS: ['superadmin']
};

/**
 * Helper to check if a user role and department matches capability
 */
const hasCapability = (user, capability) => {
  if (!user) return false;
  if (user.role === ROLES.SUPERADMIN) return true;

  const rawDept = (user.department || '').toLowerCase().trim();
  let normalizedDept = rawDept;
  if (rawDept === 'hr' || rawDept.includes('human resource') || rawDept.includes('hr')) {
    normalizedDept = 'hr';
  } else if (rawDept.includes('pharm')) {
    normalizedDept = 'pharmacy';
  } else if (rawDept.includes('sec')) {
    normalizedDept = 'security';
  } else if (rawDept.includes('fin') || rawDept.includes('account')) {
    normalizedDept = 'finance';
  } else if (rawDept.includes('supp')) {
    normalizedDept = 'support';
  } else if (rawDept.includes('leg')) {
    normalizedDept = 'legal';
  } else if (rawDept.includes('tech') || rawDept.includes('it')) {
    normalizedDept = 'technical';
  }

  const allowed = CAPABILITIES[capability] || [];

  if (allowed.includes(user.role)) return true;
  if (allowed.includes(`${normalizedDept}:${user.role}`)) return true;
  if (allowed.includes(`${rawDept}:${user.role}`)) return true;

  return false;
};

/**
 * Helper to verify if user is HR department staff
 */
const isHRDepartment = (user) => {
  if (!user) return false;
  if (user.role === ROLES.SUPERADMIN) return true;
  const dept = (user.department || '').toLowerCase().trim();
  const desig = (user.designation || '').toLowerCase().trim();
  return (
    dept === DEPARTMENTS.HR ||
    dept === 'human resource' ||
    dept === 'human resources' ||
    dept.includes('human resource') ||
    dept.includes('hr') ||
    desig.includes('hr') ||
    desig.includes('human resource')
  );
};

/**
 * Comprehensive System Permissions Catalog
 */
const PERMISSIONS = {
  // User Management
  USERS_READ: 'users:read',
  USERS_CREATE: 'users:create',
  USERS_UPDATE: 'users:update',
  USERS_DELETE: 'users:delete',

  // RBAC & Roles Management
  ROLES_READ: 'roles:read',
  ROLES_CREATE: 'roles:create',
  ROLES_UPDATE: 'roles:update',
  ROLES_DELETE: 'roles:delete',
  ROLES_ASSIGN: 'roles:assign',

  // HR & Staffing
  HR_HIRES_READ: 'hr:hires:read',
  HR_HIRES_WRITE: 'hr:hires:write',
  HR_LEAVES_READ: 'hr:leaves:read',
  HR_LEAVES_MANAGE: 'hr:leaves:manage',
  HR_DOCUMENTS_MANAGE: 'hr:documents:manage',
  HR_OFFBOARDING_MANAGE: 'hr:offboarding:manage',
  HR_ATTENDANCE_MANAGE: 'hr:attendance:manage',

  // Pharmacy & Medications
  PHARMACY_MEDICINES_READ: 'pharmacy:medicines:read',
  PHARMACY_MEDICINES_WRITE: 'pharmacy:medicines:write',
  PHARMACY_BATCHES_MANAGE: 'pharmacy:batches:manage',
  PHARMACY_DISPENSE: 'pharmacy:dispense',
  PHARMACY_ORDERS_MANAGE: 'pharmacy:orders:manage',

  // Security & Perimeter
  SECURITY_VISITORS_READ: 'security:visitors:read',
  SECURITY_VISITORS_MANAGE: 'security:visitors:manage',
  SECURITY_INCIDENTS_MANAGE: 'security:incidents:manage',
  SECURITY_ALERTS_BROADCAST: 'security:alerts:broadcast',
  SECURITY_VEHICLES_MANAGE: 'security:vehicles:manage',

  // Finance & Payroll
  FINANCE_BUDGETS_READ: 'finance:budgets:read',
  FINANCE_BUDGETS_MANAGE: 'finance:budgets:manage',
  FINANCE_EXPENSES_READ: 'finance:expenses:read',
  FINANCE_EXPENSES_APPROVE: 'finance:expenses:approve',
  FINANCE_PAYROLL_RUN: 'finance:payroll:run',
  FINANCE_INVOICES_MANAGE: 'finance:invoices:manage',

  // Support & Facilities
  SUPPORT_TICKETS_READ: 'support:tickets:read',
  SUPPORT_TICKETS_MANAGE: 'support:tickets:manage',
  SUPPORT_SUPPLIES_MANAGE: 'support:supplies:manage',
  SUPPORT_FLEET_MANAGE: 'support:fleet:manage',

  // Legal & Compliance
  LEGAL_CONTRACTS_READ: 'legal:contracts:read',
  LEGAL_CONTRACTS_MANAGE: 'legal:contracts:manage',
  LEGAL_LICENSES_MANAGE: 'legal:licenses:manage',
  LEGAL_HOLDS_MANAGE: 'legal:holds:manage',

  // Technical & Biomedical
  TECHNICAL_ASSETS_READ: 'technical:assets:read',
  TECHNICAL_ASSETS_MANAGE: 'technical:assets:manage',
  TECHNICAL_TICKETS_MANAGE: 'technical:tickets:manage',
  TECHNICAL_LICENSES_MANAGE: 'technical:licenses:manage',

  // Clinical & Patient Care
  CLINICAL_PATIENTS_READ: 'clinical:patients:read',
  CLINICAL_PATIENTS_WRITE: 'clinical:patients:write',
  CLINICAL_EMR_READ: 'clinical:emr:read',
  CLINICAL_EMR_WRITE: 'clinical:emr:write',
  CLINICAL_ORDERS_PRESCRIBE: 'clinical:orders:prescribe',
  CLINICAL_BEDS_MANAGE: 'clinical:beds:manage',

  // Audit & System Diagnostics
  AUDIT_LOGS_READ: 'audit:logs:read',
  AUDIT_LOGS_VERIFY: 'audit:logs:verify',
  SYSTEM_DIAGNOSTICS_READ: 'system:diagnostics:read'
};

const ALL_PERMISSIONS = Object.values(PERMISSIONS);

/**
 * Grouped Permission Catalog with human-readable labels for UI inspection and docs
 */
const PERMISSIONS_BY_MODULE = [
  {
    module: 'User Management',
    key: 'users',
    permissions: [
      { id: PERMISSIONS.USERS_READ, name: 'View Staff Accounts', description: 'Query and view employee directory profiles and rosters' },
      { id: PERMISSIONS.USERS_CREATE, name: 'Create Staff', description: 'Register new hospital personnel accounts' },
      { id: PERMISSIONS.USERS_UPDATE, name: 'Edit Staff Profile', description: 'Update designation, department, contact, and profile settings' },
      { id: PERMISSIONS.USERS_DELETE, name: 'Deactivate Staff', description: 'Deactivate or soft-delete personnel accounts' }
    ]
  },
  {
    module: 'Roles & Access Control (RBAC)',
    key: 'rbac',
    permissions: [
      { id: PERMISSIONS.ROLES_READ, name: 'View System Roles', description: 'Inspect system roles and permission sets' },
      { id: PERMISSIONS.ROLES_CREATE, name: 'Create Role', description: 'Create new custom roles with designated permissions' },
      { id: PERMISSIONS.ROLES_UPDATE, name: 'Update Role', description: 'Modify permission matrix and properties of a role' },
      { id: PERMISSIONS.ROLES_DELETE, name: 'Delete Role', description: 'Remove custom non-system roles' },
      { id: PERMISSIONS.ROLES_ASSIGN, name: 'Assign User Roles', description: 'Bind or unbind roles and direct permissions on staff' }
    ]
  },
  {
    module: 'Human Resources (HR)',
    key: 'hr',
    permissions: [
      { id: PERMISSIONS.HR_HIRES_READ, name: 'View Hiring Pipeline', description: 'List candidates, interview stages, and offers' },
      { id: PERMISSIONS.HR_HIRES_WRITE, name: 'Manage Hiring Pipeline', description: 'Add candidates and transition candidate stages' },
      { id: PERMISSIONS.HR_LEAVES_READ, name: 'View Leave Requests', description: 'Review staff annual, sick, and casual leave applications' },
      { id: PERMISSIONS.HR_LEAVES_MANAGE, name: 'Decide Leaves', description: 'Approve or reject staff leave submissions' },
      { id: PERMISSIONS.HR_DOCUMENTS_MANAGE, name: 'Manage Staff Documents', description: 'Upload contracts, certificates, and ID documents' },
      { id: PERMISSIONS.HR_OFFBOARDING_MANAGE, name: 'Initiate Offboarding', description: 'Process staff resignation and exit clearances' },
      { id: PERMISSIONS.HR_ATTENDANCE_MANAGE, name: 'Attendance Compliance', description: 'Inspect GPS punch-ins and shift compliance' }
    ]
  },
  {
    module: 'Pharmacy & Dispensing',
    key: 'pharmacy',
    permissions: [
      { id: PERMISSIONS.PHARMACY_MEDICINES_READ, name: 'View Formulary', description: 'Inspect hospital medicines catalog and stock levels' },
      { id: PERMISSIONS.PHARMACY_MEDICINES_WRITE, name: 'Manage Formulary', description: 'Add/edit medicines and controlled substance flags' },
      { id: PERMISSIONS.PHARMACY_BATCHES_MANAGE, name: 'Manage Stock Batches', description: 'Track lot numbers, expiry dates, and FEFO priorities' },
      { id: PERMISSIONS.PHARMACY_DISPENSE, name: 'Dispense Medications', description: 'Dispense medication against doctor prescriptions' },
      { id: PERMISSIONS.PHARMACY_ORDERS_MANAGE, name: 'Manage Purchase Orders', description: 'Create supplier POs and reconcile received stock' }
    ]
  },
  {
    module: 'Security & Surveillance',
    key: 'security',
    permissions: [
      { id: PERMISSIONS.SECURITY_VISITORS_READ, name: 'View Visitor Logs', description: 'List checked-in attendants and visitor passes' },
      { id: PERMISSIONS.SECURITY_VISITORS_MANAGE, name: 'Check-in Visitors', description: 'Issue visitor badges and process check-outs' },
      { id: PERMISSIONS.SECURITY_INCIDENTS_MANAGE, name: 'Security Incidents', description: 'Log security breaches, investigate and resolve' },
      { id: PERMISSIONS.SECURITY_ALERTS_BROADCAST, name: 'Broadcast Alerts', description: 'Dispatch Code Blue / Fire alerts via push notification' },
      { id: PERMISSIONS.SECURITY_VEHICLES_MANAGE, name: 'Vehicle & Parking Logs', description: 'Monitor gate entry/exit for ambulances and delivery vans' }
    ]
  },
  {
    module: 'Finance & Accounts',
    key: 'finance',
    permissions: [
      { id: PERMISSIONS.FINANCE_BUDGETS_READ, name: 'View Budgets', description: 'Inspect departmental budget allocations' },
      { id: PERMISSIONS.FINANCE_BUDGETS_MANAGE, name: 'Manage Budgets', description: 'Set and adjust financial year budget limits' },
      { id: PERMISSIONS.FINANCE_EXPENSES_READ, name: 'View Expense Claims', description: 'List staff reimbursement submissions' },
      { id: PERMISSIONS.FINANCE_EXPENSES_APPROVE, name: 'Approve Expenses', description: 'Review and approve/reject reimbursement claims' },
      { id: PERMISSIONS.FINANCE_PAYROLL_RUN, name: 'Execute Payroll Run', description: 'Lock payroll period and generate staff payslips' },
      { id: PERMISSIONS.FINANCE_INVOICES_MANAGE, name: 'Vendor Invoices', description: 'Process vendor bills and record payments' }
    ]
  },
  {
    module: 'Support & Facilities',
    key: 'support',
    permissions: [
      { id: PERMISSIONS.SUPPORT_TICKETS_READ, name: 'View Work Orders', description: 'Inspect housekeeping and facility repair requests' },
      { id: PERMISSIONS.SUPPORT_TICKETS_MANAGE, name: 'Manage Work Orders', description: 'Assign technicians and resolve maintenance tickets' },
      { id: PERMISSIONS.SUPPORT_SUPPLIES_MANAGE, name: 'Supply Inventory', description: 'Track linen, sanitizers, and consumables' },
      { id: PERMISSIONS.SUPPORT_FLEET_MANAGE, name: 'Ambulance Dispatch', description: 'Dispatch ambulances and track GPS routes' }
    ]
  },
  {
    module: 'Legal & Statutory',
    key: 'legal',
    permissions: [
      { id: PERMISSIONS.LEGAL_CONTRACTS_READ, name: 'View Contracts', description: 'Inspect vendor NDAs, service contracts, and SLAs' },
      { id: PERMISSIONS.LEGAL_CONTRACTS_MANAGE, name: 'Manage Contracts', description: 'Create contracts and submit legal reviews' },
      { id: PERMISSIONS.LEGAL_LICENSES_MANAGE, name: 'Statutory Licenses', description: 'Monitor AERB, PCB, and hospital establishment renewals' },
      { id: PERMISSIONS.LEGAL_HOLDS_MANAGE, name: 'Legal Holds', description: 'Apply tamper-evident preservation on medical records' }
    ]
  },
  {
    module: 'Technical & Biomedical',
    key: 'technical',
    permissions: [
      { id: PERMISSIONS.TECHNICAL_ASSETS_READ, name: 'View Assets', description: 'Inspect biomedical devices and server infrastructure' },
      { id: PERMISSIONS.TECHNICAL_ASSETS_MANAGE, name: 'Manage Assets', description: 'Register devices and log maintenance calibration dates' },
      { id: PERMISSIONS.TECHNICAL_TICKETS_MANAGE, name: 'IT Helpdesk', description: 'Resolve IT equipment downtime and user ticket requests' },
      { id: PERMISSIONS.TECHNICAL_LICENSES_MANAGE, name: 'Software Licenses', description: 'Manage PACS, EMR, and operating system licenses' }
    ]
  },
  {
    module: 'Clinical Operations & EMR',
    key: 'clinical',
    permissions: [
      { id: PERMISSIONS.CLINICAL_PATIENTS_READ, name: 'View Patients', description: 'Search patient registry and view demographics' },
      { id: PERMISSIONS.CLINICAL_PATIENTS_WRITE, name: 'Register Patients', description: 'Register new patients and generate UHIDs' },
      { id: PERMISSIONS.CLINICAL_EMR_READ, name: 'View Longitudinal EMR', description: 'Access past encounters and lab reports' },
      { id: PERMISSIONS.CLINICAL_EMR_WRITE, name: 'Doctor Consultation (SOAP)', description: 'Author SOAP notes with SHA-256 digital lock' },
      { id: PERMISSIONS.CLINICAL_ORDERS_PRESCRIBE, name: 'CPOE Order Entry', description: 'Prescribe medications and diagnostic lab tests' },
      { id: PERMISSIONS.CLINICAL_BEDS_MANAGE, name: 'Inpatient Bed Census', description: 'Assign ward beds and process bed transfers' }
    ]
  },
  {
    module: 'Audit & Governance',
    key: 'audit',
    permissions: [
      { id: PERMISSIONS.AUDIT_LOGS_READ, name: 'View Audit Logs', description: 'Inspect append-only system and security logs' },
      { id: PERMISSIONS.AUDIT_LOGS_VERIFY, name: 'Verify Hash Chain', description: 'Execute SHA-256 cryptographic chain validation' },
      { id: PERMISSIONS.SYSTEM_DIAGNOSTICS_READ, name: 'System Diagnostics', description: 'Inspect server health, memory, and database latencies' }
    ]
  }
];

module.exports = {
  DEPARTMENTS,
  ALL_DEPARTMENTS,
  ROLES,
  ALL_ROLES,
  CAPABILITIES,
  hasCapability,
  isHRDepartment,
  PERMISSIONS,
  ALL_PERMISSIONS,
  PERMISSIONS_BY_MODULE
};
