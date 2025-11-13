import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import path from 'path';
import { config } from './config';
import { logger } from './utils/logger';
import { notFoundHandler } from './middleware/notFoundHandler';
import { errorHandler } from './middleware/errorHandler';


const app = express();

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// CORS - Allow multiple origins for development and production
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:8080',
  'http://localhost:8081',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:8080',
  // Production URLs
  'https://upload-app-web.vercel.app',
].filter(Boolean); // Remove any undefined values

console.log('🔧 CORS Configuration Loaded');
console.log('✅ Allowed Origins:', allowedOrigins);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl)
    if (!origin) return callback(null, true);
    
    // Debug logging
    console.log('CORS Check - Origin:', origin);
    console.log('CORS Check - Allowed Origins:', allowedOrigins);
    
    if (allowedOrigins.includes(origin)) {
      console.log('CORS Check - ALLOWED');
      callback(null, origin);
    } else {
      console.log('CORS Check - BLOCKED');
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Cookie'],
  exposedHeaders: ['Content-Range', 'X-Content-Range', 'Set-Cookie'],
  maxAge: 600,
  preflightContinue: false,
  optionsSuccessStatus: 204,
}));

// Logging
app.use(morgan('combined', {
  stream: { write: (message) => logger.info(message.trim()) },
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Health check
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: config.env,
  });
});

// API routes
import authRoutes from './routes/auth.routes';
import passwordResetRoutes from './routes/passwordReset.routes';
import organizationRoutes from './routes/organization.routes';
import apiKeyRoutes from './routes/apiKey.routes';
import uploadRoutes from './routes/upload.routes';
import analyticsRoutes from './routes/analytics.routes';
import transformRoutes from './routes/transform.routes';
import directUploadRoutes from './routes/directUpload.routes';
import subscriptionRoutes from './routes/subscription.routes';
import webhookRoutes from './routes/webhook.routes';
import userManagementRoutes from './routes/userManagement.routes';
import { checkFileAccess } from './middleware/checkFileAccess';


// Image transformations (MUST be before static file serving)
app.use('/uploads', transformRoutes);

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/auth/password-reset', passwordResetRoutes);
app.use('/api/v1/organizations', organizationRoutes);
app.use('/api/v1/api-keys', apiKeyRoutes);
app.use('/api/v1/uploads', uploadRoutes);
app.use('/api/v1/analytics', analyticsRoutes);
app.use('/api/v1/direct-upload', directUploadRoutes);
app.use('/api/v1/subscription', subscriptionRoutes);
app.use('/api/v1/webhooks', webhookRoutes);
app.use('/api/v1/admin/users', userManagementRoutes);

// Serve uploaded files statically (fallback if no transformations)
// Check file access before serving (blocks deleted files)
app.use('/uploads', checkFileAccess, express.static(path.resolve('./uploads')));

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

// Start server
const server = app.listen(config.port, () => {
  logger.info(`🚀 Server running on ${config.apiUrl}`);
  logger.info(`📝 Environment: ${config.env}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
});

export default app;
