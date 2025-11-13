import winston from 'winston';
import { config } from '../config';

const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

const level = () => {
  const env = config.env;
  const isDevelopment = env === 'development';
  return isDevelopment ? 'debug' : 'warn';
};

const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
};

winston.addColors(colors);

const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    (info) => `${info.timestamp} ${info.level}: ${info.message}`
  )
);

// Use /tmp for file logs in serverless environments, or disable file logging
const transports: winston.transport[] = [
  new winston.transports.Console(),
];

// Only add file transports in non-serverless environments
if (process.env.VERCEL !== '1') {
  transports.push(
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
    })
  );
  transports.push(
    new winston.transports.File({ filename: 'logs/all.log' })
  );
}

export const logger = winston.createLogger({
  level: level(),
  levels,
  format,
  transports,
});
