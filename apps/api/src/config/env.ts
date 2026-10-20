const MIN_SECRET_LENGTH = 32;

const PLACEHOLDER_SECRETS = new Set([
  'dev-only-insecure-secret',
  'change-me-in-production',
  'secret',
]);

/**
 * Fails fast on a production misconfiguration. Development keeps working with
 * the local fallbacks so `yarn dev` does not need a prepared `.env`.
 */
export function validateEnv(env: NodeJS.ProcessEnv = process.env): void {
  if (env.NODE_ENV !== 'production') {
    return;
  }

  const problems: string[] = [];
  const secret = env.JWT_ACCESS_SECRET?.trim() ?? '';

  if (!secret || PLACEHOLDER_SECRETS.has(secret)) {
    problems.push('JWT_ACCESS_SECRET must be set to a random value');
  } else if (secret.length < MIN_SECRET_LENGTH) {
    problems.push(
      `JWT_ACCESS_SECRET must be at least ${MIN_SECRET_LENGTH} characters long`,
    );
  }

  if (!env.DATABASE_URL?.trim()) {
    problems.push('DATABASE_URL is required');
  }

  if (!env.WEB_URL?.trim()) {
    problems.push('WEB_URL is required');
  }

  if (!env.CORS_ORIGIN?.trim()) {
    problems.push('CORS_ORIGIN is required');
  }

  if (problems.length > 0) {
    throw new Error(
      `Invalid production environment:\n- ${problems.join('\n- ')}`,
    );
  }
}
