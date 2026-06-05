import dotenv from 'dotenv';
import pino from 'pino';

dotenv.config();

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
});

logger.info('[video-processor] Started — waiting for jobs');
