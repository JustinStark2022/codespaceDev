// src/utils/logger.ts
import pino from 'pino';
import pinoPretty from 'pino-pretty';
const logger = pino({
    level: process.env.LOG_LEVEL || 'info',
}, pinoPretty({
    colorize: true,
    translateTime: 'SYS:standard',
    ignore: 'pid,hostname',
}));
export default logger;
