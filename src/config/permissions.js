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

  const userDept = (user.department || '').toLowerCase();
  const allowed = CAPABILITIES[capability] || [];

  if (allowed.includes(user.role)) return true;
  if (allowed.includes(`${userDept}:${user.role}`)) return true;

  return false;
};

/**
 * Helper to verify if user is HR department staff
 */
const isHRDepartment = (user) => {
  if (!user) return false;
  const dept = (user.department || '').toLowerCase();
  const desig = (user.designation || '').toLowerCase();
  return dept === DEPARTMENTS.HR || desig.includes('hr');
};

module.exports = {
  DEPARTMENTS,
  ALL_DEPARTMENTS,
  ROLES,
  ALL_ROLES,
  CAPABILITIES,
  hasCapability,
  isHRDepartment
};
