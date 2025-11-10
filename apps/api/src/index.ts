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

// CORS - Allow multiple origins for development
const allowedOrigins = [
  config.clientUrl, // Main dashboard
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:8080',
  'http://localhost:8081',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:8080',
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
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

// Serve uploaded files statically (fallback if no transformations)
app.use('/uploads', express.static(path.resolve('./uploads')));

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
