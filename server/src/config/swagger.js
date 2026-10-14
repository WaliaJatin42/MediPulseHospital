const swaggerJsdoc = require('swagger-jsdoc');
const swaggerPaths = require('./swaggerPaths');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'MediPulse Hospital Management System API v1',
      version: '1.0.0',
      description: 'Enterprise Hospital Management Backend API across 7 Core Departments (HR, Pharmacy, Security, Finance, Support, Legal, Technical) and Clinical Units (Doctors, Nursing, Laboratory, Radiology) with 3-tier hierarchy (Admin, Supervisor, User), Superadmin hospital-wide governance, Firebase Cloud Messaging (FCM) push notifications, 9-Hour work policy, automated payroll, and tamper-evident SHA-256 hash-chained audit logging.',
      contact: {
        name: 'MediPulse Hospital IT Systems',
        email: 'systems@medipulse.hospital'
      }
    },
    servers: [
      {
        url: 'http://localhost:5000',
        description: 'Local Development Server'
      }
    ],
    security: [
      { bearerAuth: [] }
    ],
    tags: [
      { name: 'Authentication', description: 'Session lifecycle, password reset, MFA, and Google OAuth' },
      { name: 'Superadmin Governance', description: 'Superadmin creation, multi-superadmin protection, and hospital governance' },
      { name: 'User Management', description: 'Staff accounts, creator-scoping vs department-scoping, transfers, and reassignment' },
      { name: 'Notifications & FCM Push', description: 'In-app notification inbox, channel preferences, and Firebase Cloud Messaging push dispatch' },
      { name: 'Attendance & Anti-Fraud', description: 'Punch-in/out, GPS geofencing, hardware device binding, anomalies, and corrections' },
      { name: 'Shifts & Rosters', description: 'Midnight-crossing shifts, staff rosters, and peer swap workflows' },
      { name: 'Leave Management', description: 'Leave quotas, applications, multi-tier approvals, and audited balance adjustments' },
      { name: 'Payroll Policies & Calculation', description: 'Versioned policies, attendance-based calculation, locked runs, and payslips' },
      { name: 'Salary Extras & Components', description: 'Salary increments, bonuses, advances with auto-installments, reimbursements, and arrears' },
      { name: 'Calendar & Working Days', description: 'Holidays, weekly-offs, and dynamic working days calculation for payroll & attendance' },
      { name: 'Audit Logging', description: 'Tamper-evident append-only SHA-256 cryptographic hash-chained audit trail' },
      { name: 'System & Engineering', description: 'Hospital timezone/currency configuration, health readiness probes, and distributed job locks' },
      { name: 'Department Management', description: 'Hospital department registry and staff rosters' },
      { name: 'HR Module', description: 'Hiring pipeline, employee documents, offboarding, and analytics' },
      { name: 'Pharmacy Module', description: 'Medicine catalog, stock batches, FEFO dispensing, alerts, and POs' },
      { name: 'Security Module', description: 'Visitor control, incidents, shift rosters, patrols, vehicles, and alerts' },
      { name: 'Finance Module', description: 'Budgets, expense claims, vendor payments, payroll review, and ledger' },
      { name: 'Support Module', description: 'Service tickets, housekeeping schedules, inventory, and transport' },
      { name: 'Legal Module', description: 'Contracts, review requests, litigation, compliance licenses, and confidential docs' },
      { name: 'Technical Module', description: 'IT/biomedical assets, maintenance, downtime, licenses, and access requests' },
      { name: 'Health Check', description: 'Runtime server operational status' }
    ],
    components: {
      securitySchemes: {
        cookieAuth: {
          type: 'apiKey',
          in: 'cookie',
          name: 'accessToken',
          description: 'JWT Access Token stored securely in httpOnly cookie'
        },
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Authorization header Bearer token (Format: `Bearer <token>`)'
        }
      }
    }
  },
  apis: ['./src/routes/*.js', './src/config/swagger.js', './server.js']
};

const swaggerSpec = swaggerJsdoc(options);

// Merge comprehensive path definitions with pre-filled requestBody schemas and parameters
swaggerSpec.paths = {
  ...swaggerSpec.paths,
  ...swaggerPaths
};

module.exports = swaggerSpec;
