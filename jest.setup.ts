process.env.JWT_SECRET ||= 'test_secret';
process.env.JWT_EXPIRES ||= '2m';

// Optional: silence logger in tests (uncomment if you have a logger with setLevel)
// import logger from '@/utils/logger';
// (logger as any)?.setLevel?.('error');
