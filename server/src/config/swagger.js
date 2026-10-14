const swaggerJsdoc = require('swagger-jsdoc');
const swaggerPaths = require('./swaggerPaths');
const swaggerClinicalPaths = require('./swaggerClinicalPaths');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'MediPulse Hospital Management System API v1',
      version: '1.0.0',
      description: 'Enterprise Hospital Management Backend API across 7 Core Departments (HR, Pharmacy, Security, Finance, Support, Legal, Technical) and Clinical Operations (Patients, Doctor EMR, IPD Bed Census, CPOE Orders, Diagnostics, Emergency ESI Triage, Operation Theatre, Billing & Sequential FY Invoices, Support Ops, Patient Portal, and FHIR R4 Interoperability Facade) with two-branch architecture (MPH-CEN Central and MPH-SOU South), Firebase Cloud Messaging (FCM) push notifications, and tamper-evident SHA-256 hash-chained audit logging.',
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
      { name: 'Clinical: Branches & Facility', description: 'Two-branch context switching, inter-branch stock transfers, facility hierarchy tree, bed census, and bed lifecycle' },
      { name: 'Clinical: Patients & Identity', description: 'Patient registration, UHID generation, duplicate checking, wristbands, allergies, and consents' },
      { name: 'Clinical: Access & Care Teams', description: 'Care team episode assignment, 2-hour emergency break-glass grants, and sensitive record restriction flags' },
      { name: 'Clinical: OPD & Appointments', description: 'Doctor schedule slots, double-booking protection, queue tokens, public TV display feed, SOAP notes with SHA-256 digital locking, and longitudinal EMR' },
      { name: 'Clinical: CPOE & Safety Checks', description: 'Unified CPOE orders, drug-drug interaction screening, allergy warnings, and outbox billing charge events' },
      { name: 'Clinical: Diagnostics & Lab', description: 'Barcoded sample collection, accessioning, test results, pathologist validation, critical value auto-alerts, and radiology PACS linking' },
      { name: 'Clinical: IPD & Nursing', description: 'Inpatient admissions, bed transfers, vitals charting, multi-department discharge clearance checklist (4 depts), and final discharge' },
      { name: 'Clinical: Acute Care & Emergency', description: 'Emergency ESI 1-5 triage, hospital-wide Code Blue FCM broadcast, OT bookings with conflict checks, ICU flowsheets, and clinical dispensing' },
      { name: 'Clinical: Billing & Revenue', description: 'Billing accounts, manual charges, advance deposits, non-gap sequential FY invoices, payments with receipts, and role-tiered discounts' },
      { name: 'Clinical: Support Services', description: 'Blood bank inventory, diet orders, ambulance GPS, certificates with public QR verification, and quality CAPA' },
      { name: 'Clinical: Patient Portal', description: 'Dedicated patient auth audience (aud: patient_portal), OTP login, profile dashboard, and doctor-released diagnostic results' },
      { name: 'Clinical: FHIR R4 Facade', description: 'FHIR R4 interoperability resources (/fhir/Patient, /fhir/Encounter, /fhir/Observation)' },
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
  ...swaggerPaths,
  ...swaggerClinicalPaths
};

module.exports = swaggerSpec;
