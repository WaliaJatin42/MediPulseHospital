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
const authRoutes = require('./src/routes/authRoutes');
const userRoutes = require('./src/routes/userRoutes');
const attendanceRoutes = require('./src/routes/attendanceRoutes');
const salaryRoutes = require('./src/routes/salaryRoutes');
const payrollRoutes = require('./src/routes/payrollRoutes');
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
  customSiteTitle: "MediPulse Hospital API Documentation",
  customCss: `
    .swagger-ui .topbar { background-color: #0f172a; padding: 12px 0; }
    .swagger-ui .topbar a { max-width: 300px; font-weight: bold; }
    .swagger-ui .info { margin: 20px 0; }
    .swagger-ui .info .title { color: #0284c7; }
    .swagger-ui .opblock.opblock-post { background: rgba(16, 185, 129, 0.05); }
    .swagger-ui .opblock.opblock-get { background: rgba(14, 165, 233, 0.05); }
    .swagger-ui .models,
    .swagger-ui section.models,
    .swagger-ui div.models,
    .swagger-ui .model-example .tab,
    .swagger-ui .tabli[data-name="model"],
    .swagger-ui .model-container,
    .swagger-ui .model-box,
    .swagger-ui .model { display: none !important; }
  `,
  swaggerOptions: {
    docExpansion: 'list',
    filter: true,
    persistAuthorization: true,
    displayRequestDuration: true,
    defaultModelsExpandDepth: -1,
    defaultModelExpandDepth: -1
  }
};

// Interactive Swagger OpenAPI 3.0 Documentation Route
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, swaggerUiOptions));

// Normalize double slashes in incoming request URLs (e.g., //api/v1/auth/login -> /api/v1/auth/login)
app.use((req, res, next) => {
  if (req.url.includes('//')) {
    req.url = req.url.replace(/\/{2,}/g, '/');
  }
  next();
});

// API Rate Limiting across all /api/v1 endpoints
app.use('/api/v1', apiLimiter);

// Global VAPT Security Guard (blocks HTML, CSS, script injections, prototype pollution & NoSQL injections)
app.use(vaptSecurityGuard);

// API v1 Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/attendance', attendanceRoutes);
app.use('/api/v1/salary', salaryRoutes);
app.use('/api/v1/salaries', salaryRoutes);
app.use('/api/v1/payroll', payrollRoutes);

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
 *               message: "Hospital User Management API v1 is running"
 */
app.get('/api/v1/health', (req, res) => {
  logger.info('[Health Check] API pinged and operational');
  res.status(200).json({ status: 'ok', message: 'Hospital User Management API v1 is running' });
});

// Error handling middleware
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  logger.info(`[Server] MediPulse API running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
  logger.info(`[Server] Swagger Documentation available at http://localhost:${PORT}/api-docs`);
  
  // Initialize automated payroll cron scheduler & check date 1
  initPayrollScheduler();
});
