process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
process.env.JWT_EXPIRES = '5m';

// Optional: silence noisy logs during tests
const mute = (name: string) => {
  try {
    const mod = require(name);
    if (mod && typeof mod.default === 'object') {
      ['info','warn','error','debug'].forEach(k => {
        if (typeof mod.default[k] === 'function') {
          mod.default[k] = jest.fn();
        }
      });
    }
  } catch {}
};
mute('@/utils/logger');
