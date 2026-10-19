import { changePasswordSchema, registerSchema } from '@repo/shared';

const EMAIL = 'demo@example.com';
const NAME = 'Demo';

describe('should measure password length in UTF-8 bytes for bcrypt', () => {
  it('should accept a password of exactly 72 bytes', () => {
    const password = 'я'.repeat(36);

    expect(new TextEncoder().encode(password)).toHaveLength(72);
    expect(registerSchema.safeParse({ email: EMAIL, name: NAME, password }).success).toBe(
      true,
    );
  });

  it('should reject a password longer than 72 bytes even under 72 characters', () => {
    const password = `${'я'.repeat(36)}a`;

    expect(password).toHaveLength(37);
    expect(registerSchema.safeParse({ email: EMAIL, name: NAME, password }).success).toBe(
      false,
    );
  });

  it('should apply the same limit to a password change', () => {
    const result = changePasswordSchema.safeParse({
      currentPassword: 'current-password',
      newPassword: `${'я'.repeat(36)}a`,
    });

    expect(result.success).toBe(false);
  });

  it('should keep accepting short passwords that fit into 72 bytes', () => {
    const result = changePasswordSchema.safeParse({
      currentPassword: 'current-password',
      newPassword: 'новый-пароль',
    });

    expect(result.success).toBe(true);
  });
});
