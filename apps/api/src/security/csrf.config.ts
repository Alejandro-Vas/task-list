const DEFAULT_CORS_ORIGINS = ['http://localhost:3000'];

export const CORS_ORIGINS = (
  process.env.CORS_ORIGIN ?? DEFAULT_CORS_ORIGINS.join(',')
)
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);
