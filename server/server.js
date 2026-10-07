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
const adminRoutes = require('./src/routes/adminRoutes');
const { errorHandler, notFound } = require('./src/middleware/errorMiddleware');

// Connect to MongoDB
connectDB();

const app = express();

// Security Middlewares
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
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

// Body and Cookie Parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
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
    .swagger-ui .opblock.opblock-put { background: rgba(245, 158, 11, 0.05); }
    .swagger-ui .opblock.opblock-patch { background: rgba(139, 92, 246, 0.05); }
    .swagger-ui .opblock.opblock-delete { background: rgba(239, 68, 68, 0.05); }
  `,
  swaggerOptions: {
    docExpansion: 'list',
    filter: true,
    persistAuthorization: true,
    displayRequestDuration: true,
    defaultModelsExpandDepth: 3
  }
};

// Interactive Swagger OpenAPI 3.0 Documentation Route
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, swaggerUiOptions));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/admin', adminRoutes);

/**
 * @openapi
 * /api/health:
 *   get:
 *     summary: Check system health status
 *     tags: [Health Check]
 *     responses:
 *       200:
 *         description: API is operational
 */
app.get('/api/health', (req, res) => {
  logger.info('[Health Check] API pinged and operational');
  res.status(200).json({ status: 'ok', message: 'Hospital User Management API is running' });
});

// Error handling middleware
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  logger.info(`[Server] MediPulse API running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
  logger.info(`[Server] Swagger Documentation available at http://localhost:${PORT}/api-docs`);
});

