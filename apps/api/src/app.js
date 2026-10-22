import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import swaggerUi from 'swagger-ui-express';

import { env } from './config/env.js';
import { httpLogger } from './middlewares/logger.middleware.js';
import { errorHandler, notFoundHandler } from './middlewares/error.middleware.js';
import { swaggerSpec } from './docs/swagger.js';
import { metricsMiddleware } from './config/metrics.js';

import healthRoutes from './modules/health/health.routes.js';
import authRoutes from './modules/auth/auth.routes.js';
import organizationsRoutes from './modules/organizations/organizations.routes.js';
import brandsRoutes from './modules/brands/brands.routes.js';
import mediaRoutes from './modules/media/media.routes.js';
import postsRoutes from './modules/posts/posts.routes.js';
import publishRoutes from './modules/publish/publish.routes.js';
import sheetsRoutes from './modules/sheets/sheets.routes.js';
import reportsRoutes from './modules/reports/reports.routes.js';

const app = express();

// Security Headers
app.use(helmet({
  contentSecurityPolicy: env.NODE_ENV === 'production' ? undefined : false,
}));

// CORS Configuration
app.use(cors({
  origin: [env.WEB_URL, 'http://localhost:5173', 'http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-API-Key', 'X-Organization-Id'],
}));

// Request Parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request Logging
app.use(httpLogger);

// Prometheus Metrics Tracking Middleware
app.use(metricsMiddleware);

// Rate Limiting for Auth routes (brute-force defense)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    statusCode: 429,
    errorCode: 'RATE_LIMIT_EXCEEDED',
    message: 'Too many requests, please try again later',
  },
});
app.use('/api/v1/auth', authLimiter);

// API Documentation (Swagger)
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customSiteTitle: 'PostPilot API Documentation',
}));
app.get('/api/docs.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

// Root Health & Readiness Probes
app.use('/', healthRoutes);

// API v1 Modules
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/organizations', organizationsRoutes);
app.use('/api/v1/brands', brandsRoutes);
app.use('/api/v1/media', mediaRoutes);
app.use('/api/v1/posts', postsRoutes);
app.use('/api/v1/publish', publishRoutes);
app.use('/api/v1/sheets', sheetsRoutes);
app.use('/api/v1/reports', reportsRoutes);

// Catch 404
app.use(notFoundHandler);

// Centralized Error Handling Middleware
app.use(errorHandler);

export default app;
