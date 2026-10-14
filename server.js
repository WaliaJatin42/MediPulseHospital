require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./src/config/swagger');
const logger = require('./src/utils/logger');
const connectDB = require('./src/config/db');
const passport = require('./src/config/passport');

// Core Shared Route Modules
const authRoutes = require('./src/routes/authRoutes');
const userRoutes = require('./src/routes/userRoutes');
const attendanceRoutes = require('./src/routes/attendanceRoutes');
const salaryRoutes = require('./src/routes/salaryRoutes');
const payrollRoutes = require('./src/routes/payrollRoutes');
const auditRoutes = require('./src/routes/auditRoutes');
const departmentRoutes = require('./src/routes/departmentRoutes');

// Department Specific Route Modules
const hrRoutes = require('./src/routes/hrRoutes');
const leaveRoutes = require('./src/routes/leaveRoutes');
const pharmacyRoutes = require('./src/routes/pharmacyRoutes');
const securityRoutes = require('./src/routes/securityRoutes');
const financeRoutes = require('./src/routes/financeRoutes');
const supportRoutes = require('./src/routes/supportRoutes');
const legalRoutes = require('./src/routes/legalRoutes');
const technicalRoutes = require('./src/routes/technicalRoutes');

// Additional Gap Route Modules
const payrollPolicyRoutes = require('./src/routes/payrollPolicyRoutes');
const leaveTypeRoutes = require('./src/routes/leaveTypeRoutes');
const rosterRoutes = require('./src/routes/rosterRoutes');
const overtimeRoutes = require('./src/routes/overtimeRoutes');
const salaryComponentRoutes = require('./src/routes/salaryComponentRoutes');
const taxSlabRoutes = require('./src/routes/taxSlabRoutes');
const statutoryRuleRoutes = require('./src/routes/statutoryRuleRoutes');
const bonusRoutes = require('./src/routes/bonusRoutes');
const advanceRoutes = require('./src/routes/advanceRoutes');
const reimbursementRoutes = require('./src/routes/reimbursementRoutes');
const arrearRoutes = require('./src/routes/arrearRoutes');
const exitRoutes = require('./src/routes/exitRoutes');
const workLocationRoutes = require('./src/routes/workLocationRoutes');
const deviceRoutes = require('./src/routes/deviceRoutes');
const calendarRoutes = require('./src/routes/calendarRoutes');
const clinicalRoutes = require('./src/routes/clinicalRoutes');
const notificationRoutes = require('./src/routes/notificationRoutes');
const notificationPreferenceRoutes = require('./src/routes/notificationPreferenceRoutes');
const notificationTemplateRoutes = require('./src/routes/notificationTemplateRoutes');
const fileRoutes = require('./src/routes/fileRoutes');
const reportRoutes = require('./src/routes/reportRoutes');
const privacyRoutes = require('./src/routes/privacyRoutes');
const retentionRoutes = require('./src/routes/retentionRoutes');
const legalHoldRoutes = require('./src/routes/legalHoldRoutes');
const systemRoutes = require('./src/routes/systemRoutes');

// Clinical & Patient Operations Modules
const branchRoutes = require('./src/routes/branchRoutes');
const patientRoutes = require('./src/routes/patientRoutes');
const facilityRoutes = require('./src/routes/facilityRoutes');
const emrRoutes = require('./src/routes/emrRoutes');
const ipdRoutes = require('./src/routes/ipdRoutes');
const orderRoutes = require('./src/routes/orderRoutes');
const diagnosticRoutes = require('./src/routes/diagnosticRoutes');
const acuteCareRoutes = require('./src/routes/acuteCareRoutes');
const billingRoutes = require('./src/routes/billingRoutes');
const supportOpsRoutes = require('./src/routes/supportOpsRoutes');
const portalRoutes = require('./src/routes/portalRoutes');
const fhirRoutes = require('./src/routes/fhirRoutes');
const { protect, authorize } = require('./src/middleware/authMiddleware');
const { createSuperadmin, demoteSuperadmin, deleteSuperadmin } = require('./src/controllers/authController');
const { initPayrollScheduler } = require('./src/services/payrollService');
const { errorHandler, notFound } = require('./src/middleware/errorMiddleware');
const { vaptSecurityGuard } = require('./src/middleware/securityMiddleware');
const { apiLimiter } = require('./src/middleware/rateLimiter');

// Connect to MongoDB
connectDB();

const app = express();
app.disable('x-powered-by');

// Security Middlewares
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: false
}));

const allowedOrigin = process.env.CLIENT_URL || 'http://localhost:5173';
app.use(
  cors({
    origin: allowedOrigin,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  })
);

// Daily Request HTTP Logging with Morgan & Winston
app.use(morgan(':method :url :status :res[content-length] - :response-time ms', { stream: logger.stream }));

// Body and Cookie Parsers with strict size limits (10kb) to prevent payload Denial-of-Service
app.use(express.json({
  limit: '10kb',
  verify: (req, res, buf) => {
    req.rawBody = buf ? buf.toString() : '';
  }
}));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cookieParser());

// Passport Initialization
app.use(passport.initialize());

// Interactive Swagger OpenAPI 3.0 UI Options
const swaggerUiOptions = {
  customSiteTitle: "MediPulse Hospital Management API Documentation",
  customCss: `
    .swagger-ui .topbar { background-color: #0f172a; padding: 14px 0; }
    .swagger-ui .topbar a { max-width: 320px; font-weight: bold; color: #38bdf8; font-size: 18px; }
    .swagger-ui .info { margin: 24px 0; }
    .swagger-ui .info .title { color: #0284c7; font-weight: 700; }
    .swagger-ui .opblock.opblock-post { background: rgba(16, 185, 129, 0.06); border-color: #10b981; }
    .swagger-ui .opblock.opblock-get { background: rgba(14, 165, 233, 0.06); border-color: #0ea5e9; }
    .swagger-ui .opblock.opblock-patch { background: rgba(245, 158, 11, 0.06); border-color: #f59e0b; }
    .swagger-ui .opblock.opblock-put { background: rgba(139, 92, 246, 0.06); border-color: #8b5cf6; }
    .swagger-ui .opblock.opblock-delete { background: rgba(239, 68, 68, 0.06); border-color: #ef4444; }
    /* Hide ONLY bottom standalone models accordion, KEEP operation parameter models and request body editors visible! */
    .swagger-ui section.models { display: none !important; }
    /* Style interactive form inputs for maximum clarity and ease of testing */
    .swagger-ui .btn.execute { background-color: #0284c7; border-color: #0284c7; color: #fff; font-weight: bold; padding: 8px 30px; }
    .swagger-ui .btn.execute:hover { background-color: #0369a1; }
    .swagger-ui .body-param__text { font-family: Consolas, monospace; font-size: 13px; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; padding: 8px; }
    .swagger-ui .parameters-col_description input[type=text] { width: 100%; max-width: 380px; padding: 6px 10px; border-radius: 4px; border: 1px solid #cbd5e1; }
  `,
  swaggerOptions: {
    docExpansion: 'list',
    filter: true,
    persistAuthorization: true,
    displayRequestDuration: true,
    tryItOutEnabled: true, // Automatically enables "Try it out" so inputs and Execute button are immediately visible
    requestSnippetsEnabled: true,
    supportedSubmitMethods: ['get', 'post', 'put', 'delete', 'patch'],
    defaultModelsExpandDepth: -1,
    defaultModelExpandDepth: 1
  }
};

// Interactive Swagger OpenAPI 3.0 Documentation Route
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, swaggerUiOptions));

// Normalize double slashes in incoming request URLs
app.use((req, res, next) => {
  if (req.url.includes('//')) {
    req.url = req.url.replace(/\/{2,}/g, '/');
  }
  next();
});

// API Rate Limiting across /api/v1 and /api endpoints
app.use('/api/v1', apiLimiter);
app.use('/api', apiLimiter);

// Global VAPT Security Guard (blocks HTML, CSS, script injections, prototype pollution & NoSQL injections)
app.use(vaptSecurityGuard);

// Route mounter supporting both /api/v1/* and /api/*
const mountRoutes = (prefix) => {
  // Shared Core Modules
  app.use(`${prefix}/auth`, authRoutes);
  
  // Superadmin Direct Endpoints (/api/v1/superadmins)
  const superadminRouter = express.Router();
  superadminRouter.use(protect, authorize('superadmin'));
  superadminRouter.post('/', createSuperadmin);
  superadminRouter.patch('/:id/demote', demoteSuperadmin);
  superadminRouter.delete('/:id', deleteSuperadmin);
  app.use(`${prefix}/superadmins`, superadminRouter);

  app.use(`${prefix}/users`, userRoutes);
  app.use(`${prefix}/attendance`, attendanceRoutes);
  app.use(`${prefix}/salary`, salaryRoutes);
  app.use(`${prefix}/salaries`, salaryRoutes);
  app.use(`${prefix}/payroll`, payrollRoutes);
  app.use(`${prefix}/audit-logs`, auditRoutes);
  app.use(`${prefix}/departments`, departmentRoutes);

  // 7 Hospital Department Specific Modules
  app.use(`${prefix}/hr`, hrRoutes);
  app.use(`${prefix}/leaves`, leaveRoutes);
  app.use(`${prefix}/pharmacy`, pharmacyRoutes);
  app.use(`${prefix}/security`, securityRoutes);
  app.use(`${prefix}/finance`, financeRoutes);
  app.use(`${prefix}/support`, supportRoutes);
  app.use(`${prefix}/legal`, legalRoutes);
  app.use(`${prefix}/technical`, technicalRoutes);

  // Gap Items Modules
  app.use(`${prefix}/payroll-policies`, payrollPolicyRoutes);
  app.use(`${prefix}/leave-types`, leaveTypeRoutes);
  app.use(`${prefix}`, rosterRoutes);
  app.use(`${prefix}/overtime`, overtimeRoutes);
  app.use(`${prefix}/salary-components`, salaryComponentRoutes);
  app.use(`${prefix}/tax-slabs`, taxSlabRoutes);
  app.use(`${prefix}/statutory-rules`, statutoryRuleRoutes);
  app.use(`${prefix}/bonuses`, bonusRoutes);
  app.use(`${prefix}/advances`, advanceRoutes);
  app.use(`${prefix}/reimbursements`, reimbursementRoutes);
  app.use(`${prefix}/arrears`, arrearRoutes);
  app.use(`${prefix}/exits`, exitRoutes);
  app.use(`${prefix}/work-locations`, workLocationRoutes);
  app.use(`${prefix}/devices`, deviceRoutes);
  app.use(`${prefix}/calendar`, calendarRoutes);
  app.use(`${prefix}/roles`, clinicalRoutes);
  app.use(`${prefix}/notifications`, notificationRoutes);
  app.use(`${prefix}/notification-preferences`, notificationPreferenceRoutes);
  app.use(`${prefix}/notification-templates`, notificationTemplateRoutes);
  app.use(`${prefix}/files`, fileRoutes);
  app.use(`${prefix}/reports`, reportRoutes);
  app.use(`${prefix}/privacy`, privacyRoutes);
  app.use(`${prefix}`, retentionRoutes);
  app.use(`${prefix}/legal-holds`, legalHoldRoutes);
  app.use(`${prefix}`, systemRoutes);

  // Clinical & Patient Operations Modules
  app.use(`${prefix}`, branchRoutes);
  app.use(`${prefix}`, patientRoutes);
  app.use(`${prefix}`, facilityRoutes);
  app.use(`${prefix}`, emrRoutes);
  app.use(`${prefix}`, ipdRoutes);
  app.use(`${prefix}`, orderRoutes);
  app.use(`${prefix}`, diagnosticRoutes);
  app.use(`${prefix}`, acuteCareRoutes);
  app.use(`${prefix}`, billingRoutes);
  app.use(`${prefix}`, supportOpsRoutes);
  app.use(`${prefix}`, portalRoutes);
  app.use(`${prefix}`, fhirRoutes);
};

mountRoutes('/api/v1');
mountRoutes('/api');

/**
 * @openapi
 * /api/v1/health:
 *   get:
 *     summary: Check system health status
 *     tags: [Health Check]
 *     responses:
 *       200:
 *         description: API is operational
 *         content:
 *           application/json:
 *             example:
 *               status: "ok"
 *               message: "Hospital Management Backend API v1 is operational"
 */
app.get(['/api/v1/health', '/api/health'], (req, res) => {
  logger.info('[Health Check] API pinged and operational');
  res.status(200).json({ status: 'ok', message: 'Hospital Management Backend API is operational across all 7 departments' });
});

// Error handling middleware
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  logger.info(`[Server] MediPulse API running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
  logger.info(`[Server] Swagger Documentation available at http://localhost:${PORT}/api-docs`);
  
  // Initialize automated payroll cron scheduler
  initPayrollScheduler();
});
