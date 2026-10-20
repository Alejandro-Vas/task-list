import { z } from 'zod';

const BCRYPT_MAX_PASSWORD_BYTES = 72;

function utf8ByteLength(value: string): number {
  return new TextEncoder().encode(value).length;
}

/** bcrypt silently ignores everything after the first 72 UTF-8 bytes. */
const newPasswordSchema = z
  .string()
  .min(8)
  .refine(
    (value) => utf8ByteLength(value) <= BCRYPT_MAX_PASSWORD_BYTES,
    `Password must be at most ${BCRYPT_MAX_PASSWORD_BYTES} bytes in UTF-8`,
  );

export const registerSchema = z.object({
  email: z.email().trim().toLowerCase(),
  name: z.string().trim().min(1).max(100),
  password: newPasswordSchema,
});
export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z.email().trim().toLowerCase(),
  password: z.string().min(1).max(72),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1).max(72),
    newPassword: newPasswordSchema,
  })
  .refine((data) => data.newPassword !== data.currentPassword, {
    message: 'New password must differ from the current one',
    path: ['newPassword'],
  });
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

export const USER_ROLES = ['OWNER', 'ADMIN', 'USER'] as const;
export const userRoleSchema = z.enum(USER_ROLES);
export type UserRole = z.infer<typeof userRoleSchema>;

export const authUserSchema = z.object({
  id: z.string(),
  email: z.string(),
  name: z.string(),
  role: userRoleSchema,
});
export type AuthUser = z.infer<typeof authUserSchema>;

export const authResponseSchema = z.object({
  user: authUserSchema,
  accessToken: z.string(),
});
export type AuthResponse = z.infer<typeof authResponseSchema>;
