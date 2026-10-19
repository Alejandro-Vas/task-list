import { validateEnv } from './env';

const PRODUCTION_ENV = {
  NODE_ENV: 'production',
  JWT_ACCESS_SECRET: 'a'.repeat(48),
  DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
  WEB_URL: 'https://tasks.example.com',
  CORS_ORIGIN: 'https://tasks.example.com',
};

describe('should validate the production environment before startup', () => {
  it('should accept a complete production configuration', () => {
    expect(() => validateEnv(PRODUCTION_ENV)).not.toThrow();
  });

  it('should accept any configuration outside production', () => {
    expect(() => validateEnv({ NODE_ENV: 'development' })).not.toThrow();
  });

  it('should reject the known development secret in production', () => {
    expect(() =>
      validateEnv({
        ...PRODUCTION_ENV,
        JWT_ACCESS_SECRET: 'dev-only-insecure-secret',
      }),
    ).toThrow(/JWT_ACCESS_SECRET/);
  });

  it('should reject a short production secret', () => {
    expect(() =>
      validateEnv({ ...PRODUCTION_ENV, JWT_ACCESS_SECRET: 'short' }),
    ).toThrow(/at least 32/);
  });

  it('should reject a missing WEB_URL', () => {
    expect(() => validateEnv({ ...PRODUCTION_ENV, WEB_URL: '' })).toThrow(
      /WEB_URL/,
    );
  });

  it('should list every problem in a single error', () => {
    expect(() => validateEnv({ NODE_ENV: 'production' })).toThrow(
      /JWT_ACCESS_SECRET[\s\S]*DATABASE_URL[\s\S]*WEB_URL[\s\S]*CORS_ORIGIN/,
    );
  });
});
